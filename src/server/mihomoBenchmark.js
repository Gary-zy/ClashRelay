import http from "node:http";
import net from "node:net";
import tls from "node:tls";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

const DEFAULT_TEST_URL = "https://www.gstatic.com/generate_204";
const DEFAULT_EXIT_URL = "https://www.cloudflare.com/cdn-cgi/trace";
const MAX_POLICIES = 20;
const MAX_RUNTIME_MS = 60_000;

export const getMedianDelay = (values) => {
  const successful = values
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  if (successful.length === 0) return null;
  return successful[Math.floor(successful.length / 2)];
};

export const normalizeBenchmarkRequest = (payload = {}) => {
  const yamlText = String(payload.yamlText || "").trim();
  if (!yamlText) throw new Error("缺少 yamlText");

  const policies = Array.isArray(payload.policies)
    ? payload.policies.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  if (policies.length === 0) throw new Error("至少选择一个策略组");
  if (policies.length > MAX_POLICIES) throw new Error(`单次最多测速 ${MAX_POLICIES} 个策略组`);

  const requestedRounds = Number(payload.rounds);
  const rounds = Number.isInteger(requestedRounds) && requestedRounds >= 1 && requestedRounds <= 5
    ? requestedRounds
    : 3;

  return {
    yamlText,
    policies,
    testUrl: String(payload.testUrl || DEFAULT_TEST_URL),
    rounds,
    includeExitIp: payload.includeExitIp !== false,
  };
};

export const parseExitTrace = (rawTrace) => {
  const lines = String(rawTrace || "").split(/\r?\n/);
  const entries = Object.fromEntries(
    lines
      .map((line) => line.split("="))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...rest]) => [key, rest.join("=")])
  );

  return {
    exitIp: entries.ip || "",
    country: entries.loc || "",
    colo: entries.colo || "",
    rawTrace: rawTrace || "",
  };
};

const commandExists = (command) => {
  const result = process.platform === "win32"
    ? spawnSync("where", [command], { stdio: "ignore" })
    : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
  return result.status === 0;
};

const findMihomo = async (mihomoBin = process.env.MIHOMO_BIN) => {
  if (mihomoBin) {
    const binStat = await stat(mihomoBin);
    if (binStat.isFile()) return mihomoBin;
  }
  if (commandExists("mihomo")) return "mihomo";
  throw new Error("mihomo 不可用，请在镜像中安装 mihomo 或设置 MIHOMO_BIN");
};

const reservePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const requestControllerJson = ({ port, secret, method = "GET", path, body, timeoutMs = 5000 }) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        timeout: timeoutMs,
        headers: {
          authorization: `Bearer ${secret}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`mihomo API ${method} ${path} failed: HTTP ${res.statusCode} ${responseBody}`));
            return;
          }
          if (!responseBody) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(responseBody));
          } catch {
            resolve({ raw: responseBody });
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("mihomo API timeout"));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const waitForController = async ({ port, secret }) => {
  const start = Date.now();
  while (Date.now() - start < 8000) {
    try {
      await requestControllerJson({ port, secret, path: "/proxies", timeoutMs: 1000 });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error("mihomo controller 启动超时");
};

const fetchThroughHttpProxy = ({ proxyPort, url = DEFAULT_EXIT_URL }) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const socket = net.connect(proxyPort, "127.0.0.1");
    socket.setTimeout(8000);
    socket.once("connect", () => {
      socket.write(`CONNECT ${parsed.hostname}:443 HTTP/1.1\r\nHost: ${parsed.hostname}:443\r\n\r\n`);
    });

    let connectBuffer = "";
    const onConnectData = (chunk) => {
      connectBuffer += chunk.toString("utf8");
      if (!connectBuffer.includes("\r\n\r\n")) return;
      socket.off("data", onConnectData);
      if (!/^HTTP\/1\.[01] 200/.test(connectBuffer)) {
        socket.destroy();
        reject(new Error("代理 CONNECT 失败"));
        return;
      }

      const secure = tls.connect({ socket, servername: parsed.hostname }, () => {
        secure.write(`GET ${parsed.pathname}${parsed.search} HTTP/1.1\r\nHost: ${parsed.hostname}\r\nConnection: close\r\n\r\n`);
      });
      let response = "";
      secure.setTimeout(8000);
      secure.on("data", (chunk) => {
        response += chunk.toString("utf8");
      });
      secure.on("end", () => {
        const [, body = ""] = response.split(/\r?\n\r?\n/);
        resolve(body);
      });
      secure.on("timeout", () => secure.destroy(new Error("出口 IP 请求超时")));
      secure.on("error", reject);
    };

    socket.on("data", onConnectData);
    socket.on("timeout", () => socket.destroy(new Error("代理 CONNECT 超时")));
    socket.on("error", reject);
  });

const writeRuntimeConfig = async ({ yamlText, dir, mixedPort, controllerPort, secret, policies }) => {
  const config = yaml.load(yamlText);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("YAML 不是有效 mihomo 配置对象");
  }

  const probeGroupName = "RelayBox 出口探测";
  const proxyGroups = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  config["mixed-port"] = mixedPort;
  config["allow-lan"] = false;
  config["external-controller"] = `127.0.0.1:${controllerPort}`;
  config.secret = secret;
  config.mode = "rule";
  config["proxy-groups"] = [
    ...proxyGroups.filter((group) => group?.name !== probeGroupName),
    { name: probeGroupName, type: "select", proxies: [...policies] },
  ];
  config.rules = [`MATCH,${probeGroupName}`];

  const file = join(dir, "config.yaml");
  await writeFile(file, yaml.dump(config, { noRefs: true, lineWidth: 120 }), "utf8");
  return { file, probeGroupName };
};

export const createMihomoService = ({ mihomoBin } = {}) => {
  let activeBenchmarks = 0;

  const checkConfig = async ({ yamlText }) => {
    const mihomo = await findMihomo(mihomoBin);
    const dir = await mkdtemp(join(tmpdir(), "relaybox-mihomo-check-"));
    try {
      const file = join(dir, "config.yaml");
      await writeFile(file, yamlText, "utf8");
      const result = spawnSync(mihomo, ["-f", file, "-t"], { encoding: "utf8" });
      const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
      return {
        ok: result.status === 0,
        message: result.status === 0 ? "mihomo 校验通过" : "mihomo 校验失败",
        errors: result.status === 0 ? [] : [output || "mihomo config check failed"],
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  const benchmarkPolicies = async (rawPayload) => {
    const payload = normalizeBenchmarkRequest(rawPayload);
    if (activeBenchmarks >= 2) {
      return { ok: false, message: "测速任务繁忙，请稍后再试", results: [] };
    }

    activeBenchmarks += 1;
    let dir = null;
    let child = null;
    let killTimer = null;

    try {
      const mihomo = await findMihomo(mihomoBin);
      dir = await mkdtemp(join(tmpdir(), "relaybox-mihomo-run-"));
      await mkdir(dir, { recursive: true });
      const mixedPort = await reservePort();
      const controllerPort = await reservePort();
      const secret = cryptoRandomToken();
      const { file, probeGroupName } = await writeRuntimeConfig({
        yamlText: payload.yamlText,
        dir,
        mixedPort,
        controllerPort,
        secret,
        policies: payload.policies,
      });

      const check = spawnSync(mihomo, ["-f", file, "-t"], { encoding: "utf8" });
      if (check.status !== 0) {
        return {
          ok: false,
          message: "mihomo 校验失败",
          results: [],
          errors: [`${check.stdout || ""}${check.stderr || ""}`.trim()],
        };
      }

      child = spawn(mihomo, ["-f", file, "-d", dir], { stdio: "ignore" });
      killTimer = setTimeout(() => child?.kill("SIGKILL"), MAX_RUNTIME_MS);
      await waitForController({ port: controllerPort, secret });

      const results = [];
      for (const name of payload.policies) {
        const attempts = [];
        for (let i = 0; i < payload.rounds; i += 1) {
          try {
            await requestControllerJson({ port: controllerPort, secret, method: "DELETE", path: "/connections" });
            const data = await requestControllerJson({
              port: controllerPort,
              secret,
              path: `/proxies/${encodeURIComponent(name)}/delay?timeout=5000&url=${encodeURIComponent(payload.testUrl)}`,
              timeoutMs: 7000,
            });
            attempts.push(Number(data.delay));
          } catch {
            attempts.push(null);
          }
        }

        const delayMs = getMedianDelay(attempts);
        const result = {
          name,
          status: delayMs === null ? "failed" : "ok",
          delayMs,
          attempts,
        };

        if (payload.includeExitIp && delayMs !== null) {
          try {
            await requestControllerJson({ port: controllerPort, secret, method: "PUT", path: `/proxies/${encodeURIComponent(probeGroupName)}`, body: { name } });
            Object.assign(result, parseExitTrace(await fetchThroughHttpProxy({ proxyPort: mixedPort })));
          } catch (error) {
            result.exitError = error.message;
          }
        }
        results.push(result);
      }

      return { ok: true, results };
    } finally {
      if (killTimer) clearTimeout(killTimer);
      if (child) child.kill("SIGTERM");
      activeBenchmarks -= 1;
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  };

  return { checkConfig, benchmarkPolicies };
};

const cryptoRandomToken = () =>
  randomBytes(24).toString("hex");

export default createMihomoService;
