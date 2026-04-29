import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRelayProxyServer, resolveRedirectUrl } from "../proxy-server.js";

const request = ({ port, path, method = "GET", body }) =>
  new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        timeout: 1000,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve("timeout");
    });
    req.on("error", (error) => resolve(error.message));
    if (body) req.write(body);
    req.end();
  });

const withServer = async (callback) => {
  const server = createRelayProxyServer();
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

    assert.deepEqual(fetchStatuses, [403, 403, 403]);
    assert.deepEqual(pingStatuses, [403, 403, 403]);
  });
});
