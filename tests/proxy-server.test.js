import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRelayProxyServer, resolveRedirectUrl, resolveSafeLookupResult } from "../proxy-server.js";

const request = ({ port, path, method = "GET", body, headers = {} }) =>
  new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: body ? { "content-type": "application/json", ...headers } : headers,
        timeout: 1000,
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: responseBody }));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: "timeout", body: "" });
    });
    req.on("error", (error) => resolve({ status: error.message, body: "" }));
    if (body) req.write(body);
    req.end();
  });

const withServer = async (callback, options) => {
  const server = createRelayProxyServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await callback(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test("相对重定向会基于原始订阅地址解析成绝对 URL", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "/api/final?token=1"
  );

  assert.equal(resolved, "https://example.com/api/final?token=1");
});

test("绝对重定向会保持原样", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "https://cdn.example.net/final"
  );

  assert.equal(resolved, "https://cdn.example.net/final");
});

test("非法重定向地址会返回 null，避免同步抛错", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "http://%zz"
  );

  assert.equal(resolved, null);
});

test("非 http(s) 重定向协议会被拒绝", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "ftp://example.com/archive"
  );

  assert.equal(resolved, null);
});

test("安全 DNS lookup 在 all 模式下返回地址数组", () => {
  const addresses = [
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
  ];

  assert.deepEqual(resolveSafeLookupResult(addresses, { all: true }), addresses);
  assert.deepEqual(resolveSafeLookupResult(addresses, { all: false }), addresses[0]);
});

test("fetch 和 ping 拦截完整 IPv6 link-local fe80::/10 地址", async () => {
  await withServer(async (port) => {
    const fetchStatuses = await Promise.all(
      ["fe80::1", "fe90::1", "febf::1"].map((address) =>
        request({
          port,
          path: `/fetch?url=${encodeURIComponent(`http://[${address}]/`)}`,
        })
      )
    );
    const pingStatuses = await Promise.all(
      ["fe80::1", "fe90::1", "febf::1"].map((address) =>
        request({
          port,
          path: "/ping",
          method: "POST",
          body: JSON.stringify({ server: address, port: 80 }),
        })
      )
    );

    assert.deepEqual(fetchStatuses.map((response) => response.status), [403, 403, 403]);
    assert.deepEqual(pingStatuses.map((response) => response.status), [403, 403, 403]);
  });
});

test("同源 Origin 会被允许，支持 Docker 公网域名部署", async () => {
  await withServer(async (port) => {
    const response = await request({
      port,
      path: "/health",
      headers: { origin: `http://127.0.0.1:${port}` },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");
  });
});

test("静态托管遇到畸形 URL 编码不会打崩服务", async () => {
  await withServer(async (port) => {
    const response = await request({
      port,
      path: "/%zz",
    });

    assert.equal(response.status, 404);
  });
});

test("静态托管支持 Vite 生产 base 下的资源路径", async () => {
  const assetDir = join(process.cwd(), "dist", "assets");
  const assetPath = join(assetDir, "relaybox-static-prefix-test.js");
  const assetBody = "console.log('relaybox static prefix');";

  await mkdir(assetDir, { recursive: true });
  await writeFile(join(process.cwd(), "dist", "index.html"), "<!doctype html><div id=\"app\"></div>");
  await writeFile(assetPath, assetBody);

  try {
    await withServer(async (port) => {
      const response = await request({
        port,
        path: "/ClashRelay/assets/relaybox-static-prefix-test.js",
      });

      assert.equal(response.status, 200);
      assert.equal(response.body, assetBody);
    });
  } finally {
    await rm(assetPath, { force: true });
  }
});

test("mihomo 接口缺少服务令牌会返回 401", async () => {
  await withServer(async (port) => {
    const response = await request({
      port,
      path: "/mihomo/check",
      method: "POST",
      body: JSON.stringify({ yamlText: "proxies: []" }),
    });

    assert.equal(response.status, 401);
    assert.match(response.body, /Unauthorized/);
  }, {
    relayboxToken: "secret",
    mihomoService: {
      checkConfig: async () => ({ ok: true, message: "ok", errors: [] }),
    },
  });
});

test("mihomo check 接口会鉴权并返回校验结果", async () => {
  await withServer(async (port) => {
    const response = await request({
      port,
      path: "/mihomo/check",
      method: "POST",
      headers: { authorization: "Bearer secret" },
      body: JSON.stringify({ yamlText: "proxies: []" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true, message: "mihomo ok", errors: [] });
  }, {
    relayboxToken: "secret",
    mihomoService: {
      checkConfig: async ({ yamlText }) => ({
        ok: yamlText.includes("proxies"),
        message: "mihomo ok",
        errors: [],
      }),
    },
  });
});

test("mihomo benchmark 接口限制单次策略组数量", async () => {
  await withServer(async (port) => {
    const response = await request({
      port,
      path: "/mihomo/benchmark",
      method: "POST",
      headers: { authorization: "Bearer secret" },
      body: JSON.stringify({
        yamlText: "proxies: []",
        policies: Array.from({ length: 21 }, (_, index) => `P${index}`),
      }),
    });

    assert.equal(response.status, 400);
    assert.match(response.body, /最多/);
  }, {
    relayboxToken: "secret",
    mihomoService: {
      benchmarkPolicies: async () => ({ ok: true, results: [] }),
    },
  });
});
