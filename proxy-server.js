import http from "http";
import https from "https";
import net from "net";
import dns from "dns";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { readFile, stat } from "fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "path";
import { createMihomoService, normalizeBenchmarkRequest } from "./src/server/mihomoBenchmark.js";

const PORT = Number(process.env.PORT) || 8787;
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = process.env.STATIC_DIR || join(MODULE_DIR, "dist");

// IPv4 私有/保留地址前缀
const IPV4_PRIVATE_PREFIXES = [
  [0, 0, 0, 0],       // 0.0.0.0/8
  [10, 0, 0, 0],      // 10.0.0.0/8
  [100, 64, 0, 0],    // 100.64.0.0/10 (CGNAT)
  [127, 0, 0, 0],     // 127.0.0.0/8
  [169, 254, 0, 0],   // 169.254.0.0/16
  [172, 16, 0, 0],    // 172.16.0.0/12
  [192, 0, 0, 0],     // 192.0.0.0/24 (IETF)
  [192, 0, 2, 0],     // 192.0.2.0/24 (TEST-NET-1)
  [192, 88, 99, 0],   // 192.88.99.0/24
  [192, 168, 0, 0],   // 192.168.0.0/16
  [198, 18, 0, 0],    // 198.18.0.0/15 (benchmarking)
  [198, 51, 100, 0],  // 198.51.100.0/24 (TEST-NET-2)
  [203, 0, 113, 0],   // 203.0.113.0/24 (TEST-NET-3)
  [224, 0, 0, 0],     // 224.0.0.0/4 (multicast)
  [240, 0, 0, 0],     // 240.0.0.0/4 (reserved)
  [255, 255, 255, 255], // 255.255.255.255
];

const IPV4_PREFIX_MASKS = [
  8, 8, 10, 8, 16, 12, 24, 24, 24, 16, 15, 24, 24, 4, 4, 32,
];

// 解析 IPv4 地址为 4 元组
const parseIPv4 = (str) => {
  const parts = str.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return parts;
};

// 检查 IPv4 地址是否为私有/保留
const isIPv4Private = (ip) => {
  const parsed = typeof ip === "string" ? parseIPv4(ip) : ip;
  if (!parsed) return false;
  for (let i = 0; i < IPV4_PRIVATE_PREFIXES.length; i++) {
    const prefix = IPV4_PRIVATE_PREFIXES[i];
    const mask = IPV4_PREFIX_MASKS[i];
    const shift = 32 - mask;
    if (((parsed[0] << 24 | parsed[1] << 16 | parsed[2] << 8 | parsed[3]) >>> shift) ===
        ((prefix[0] << 24 | prefix[1] << 16 | prefix[2] << 8 | prefix[3]) >>> shift)) {
      return true;
    }
  }
  return false;
};

// 归一化 IP 地址：处理 IPv4-mapped IPv6、方括号、localhost
// 返回 { type: "ipv4"|"ipv6"|"hostname"|"blocked", address }
const normalizeIP = (input) => {
  if (!input) return { type: "blocked" };
  // Strip IPv6 zone ID (e.g., fe80::1%eth0 → fe80::1) before validation
  let clean = input.replace(/^\[|\]$/g, "").replace(/%.*$/, "").toLowerCase();

  if (clean === "localhost") return { type: "blocked" };

  const version = net.isIP(clean);
  if (version === 0) return { type: "hostname" }; // 不是 IP，是域名

  if (version === 4) {
    return { type: "ipv4", address: clean };
  }

  // IPv6：检查是否为 IPv4-mapped IPv6
  // ::ffff:x.x.x.x 或 ::ffff:xxxx:xxxx（含展开形式）
  let m;
  // 点分十进制形式
  m = clean.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
   || clean.match(/^0:0:0:0:0:ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (m) return { type: "ipv4", address: m[1] };

  // 十六进制形式 (::ffff:7f00:1 等)
  m = clean.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
   || clean.match(/^0:0:0:0:0:ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (m) {
    const hi = parseInt(m[1], 16);
    const lo = parseInt(m[2], 16);
    if (hi <= 0xffff && lo <= 0xffff) {
      const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return { type: "ipv4", address: ipv4 };
    }
  }

  // ::1 (回环)
  if (clean === "::1" || clean === "0:0:0:0:0:0:0:1") return { type: "blocked" };

  // 纯 IPv6 私有/链路本地地址：fc00::/7 与 fe80::/10
  const firstHextet = parseInt(clean.split(":")[0] || "0", 16);
  if ((firstHextet & 0xfe00) === 0xfc00) return { type: "blocked" };
  if ((firstHextet & 0xffc0) === 0xfe80) return { type: "blocked" };

  // ::0
  if (clean === "::" || clean === "0:0:0:0:0:0:0:0") return { type: "blocked" };

  return { type: "ipv6", address: clean };
};

// 统一的 SSRF 地址检查
const isPrivateOrReserved = (input) => {
  const result = normalizeIP(input);
  if (result.type === "blocked") return true;
  if (result.type === "ipv4") return isIPv4Private(result.address);
  if (result.type === "ipv6") return false; // 非私有前缀的公网 IPv6 放行
  return false; // hostname 由 DNS lookup 阶段检查
};

export const resolveSafeLookupResult = (addresses, options = {}) => {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("DNS lookup returned no addresses");
  }

  for (const { address } of addresses) {
    if (isPrivateOrReserved(address)) {
      throw new Error(`SSRF blocked: resolved to private IP ${address}`);
    }
  }

  return options.all ? addresses : addresses[0];
};

// 受控 DNS lookup：在解析的那一刻检查 IP，消除 TOCTOU 窗口
// 用作 http/https agent 的 lookup 函数
const safeLookup = (hostname, options, callback) => {
  // 如果 hostname 本身就是 IP 或 localhost 等，先做正则预检
  if (isPrivateOrReserved(hostname)) {
    callback(new Error("SSRF blocked: hostname matches private IP pattern"));
    return;
  }

  // 调用系统 DNS 解析
  dns.lookup(hostname, { all: true, family: 0 }, (err, addresses) => {
    if (err) {
      callback(err);
      return;
    }

    try {
      const result = resolveSafeLookupResult(addresses, options);
      if (options?.all) {
        callback(null, result);
      } else {
        callback(null, result.address, result.family);
      }
    } catch (error) {
      callback(error);
    }
  });
};

// 使用受控 lookup 的 agent，防止 DNS rebinding
const safeHttpAgent = new http.Agent({ lookup: safeLookup });
const safeHttpsAgent = new https.Agent({ lookup: safeLookup });

// CORS 白名单
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

const checkCors = (req, res) => {
  const origin = req.headers.origin;
  const sameOrigin = origin && req.headers.host && (() => {
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  })();

  if (origin && !ALLOWED_ORIGINS.has(origin) && !sameOrigin) {
    sendSafe(res, req, 403, "Origin not allowed");
    return false;
  }
  return true;
};

const setCors = (res, req) => {
  const origin = req.headers.origin;
  const sameOrigin = origin && req.headers.host && (() => {
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  })();

  if (origin && (ALLOWED_ORIGINS.has(origin) || sameOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "no-store");
};

// 请求体大小限制（1MB）
const MAX_BODY_SIZE = 1024 * 1024;

const readBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  let size = 0;
  let oversized = false;

  req.on("data", chunk => {
    if (oversized) return;
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      oversized = true;
      reject(new Error("Request body too large"));
      return;
    }
    body += chunk;
  });

  req.on("end", () => {
    if (!oversized) resolve(body);
  });

  req.on("error", reject);
});

const sendSafe = (res, req, statusCode, body, contentType = "text/plain; charset=utf-8") => {
  setCors(res, req);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(body);
};

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const STATIC_BASE_PATH = "/ClashRelay";

const normalizeStaticPathname = (pathname) => {
  if (pathname === STATIC_BASE_PATH) return "/";
  if (pathname.startsWith(`${STATIC_BASE_PATH}/`)) {
    return pathname.slice(STATIC_BASE_PATH.length) || "/";
  }
  return pathname;
};

const tryServeStatic = async (req, res, pathname) => {
  if (!["GET", "HEAD"].includes(req.method)) return false;
  if (pathname.startsWith("/fetch") || pathname.startsWith("/ping") || pathname.startsWith("/config") || pathname.startsWith("/mihomo")) {
    return false;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(normalizeStaticPathname(pathname));
  } catch {
    return false;
  }

  const cleanPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const staticRoot = resolve(STATIC_DIR);
  const candidate = cleanPath === "/" ? join(staticRoot, "index.html") : join(staticRoot, cleanPath);
  const resolved = resolve(candidate);
  if (resolved !== staticRoot && !resolved.startsWith(`${staticRoot}${sep}`)) return false;

  try {
    const fileStat = await stat(resolved);
    const filePath = fileStat.isDirectory() ? join(resolved, "index.html") : resolved;
    const body = await readFile(filePath);
    sendSafe(res, req, 200, req.method === "HEAD" ? "" : body, CONTENT_TYPES[extname(filePath)] || "application/octet-stream");
    return true;
  } catch {
    try {
      const body = await readFile(join(STATIC_DIR, "index.html"));
      sendSafe(res, req, 200, req.method === "HEAD" ? "" : body, "text/html; charset=utf-8");
      return true;
    } catch {
      return false;
    }
  }
};

export const resolveRedirectUrl = (targetUrl, location) => {
  if (!location) return null;
  try {
    const resolved = new URL(location, targetUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
};

const requestWithRedirect = (targetUrl, res, req, redirectCount = 0) => {
  if (redirectCount > 3) {
    sendSafe(res, req, 502, "Too many redirects");
    return;
  }

  // 正则预检（快速拒绝明显私有地址）
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    sendSafe(res, req, 502, "Invalid redirect URL");
    return;
  }
  if (isPrivateOrReserved(parsedTarget.hostname)) {
    sendSafe(res, req, 403, "Access to private/reserved IP addresses is not allowed");
    return;
  }

  // 使用受控 agent 发起请求，DNS 解析在连接建立时进行并检查
  const isHttps = targetUrl.startsWith("https");
  const handler = isHttps ? https : http;
  const agent = isHttps ? safeHttpsAgent : safeHttpAgent;

  const upstreamReq = handler.get(targetUrl, { agent }, (upstream) => {
    if ([301, 302, 307, 308].includes(upstream.statusCode)) {
      const location = upstream.headers.location;
      if (!location) {
        sendSafe(res, req, 502, "Redirect location missing");
        return;
      }
      const nextUrl = resolveRedirectUrl(targetUrl, location);
      if (!nextUrl) {
        sendSafe(res, req, 502, "Invalid redirect location");
        return;
      }
      requestWithRedirect(nextUrl, res, req, redirectCount + 1);
      return;
    }

    setCors(res, req);
    res.statusCode = upstream.statusCode || 200;
    if (upstream.headers["content-type"]) {
      res.setHeader("Content-Type", upstream.headers["content-type"]);
    }

    // Limit upstream response size to 10MB to prevent memory exhaustion
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
    let totalBytes = 0;
    upstream.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_RESPONSE_SIZE) {
        upstream.destroy();
        if (!res.headersSent) {
          sendSafe(res, req, 502, "Upstream response too large");
        } else {
          res.end();
        }
      }
    });
    upstream.pipe(res);

    upstream.on("error", (err) => {
      console.error("Upstream stream error:", err.message);
      if (!res.headersSent) {
        sendSafe(res, req, 502, "Upstream stream error");
      } else {
        res.end();
      }
    });
  });

  upstreamReq.setTimeout(30000, () => {
    upstreamReq.destroy();
    if (!res.headersSent) {
      sendSafe(res, req, 504, "Upstream request timed out");
    }
  });

  upstreamReq.on("error", (err) => {
    console.error("Upstream request failed:", err.message);
    if (!res.headersSent) {
      // SSRF 拦截的错误信息
      if (err.message.startsWith("SSRF blocked")) {
        sendSafe(res, req, 403, "Access to private/reserved IP addresses is not allowed");
      } else {
        sendSafe(res, req, 502, "Upstream request failed");
      }
    }
  });
};

const configStore = new Map();
const MAX_CONFIG_STORE_SIZE = 1000;

const generateId = () => crypto.randomUUID().replace(/-/g, "").substring(0, 16);

const isAuthorized = (req, token) => {
  if (!token) return false;
  const header = req.headers.authorization || "";
  return header === `Bearer ${token}` || req.headers["x-relaybox-token"] === token;
};

export const createRelayProxyServer = ({
  mihomoService = createMihomoService(),
  relayboxToken = process.env.RELAYBOX_TOKEN || "",
} = {}) => http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    setCors(res, req);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!checkCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    sendSafe(res, req, 200, "ok");
    return;
  }

  if (url.pathname === "/mihomo/check" && req.method === "POST") {
    if (!isAuthorized(req, relayboxToken)) {
      sendSafe(res, req, 401, JSON.stringify({ error: "Unauthorized" }), "application/json");
      return;
    }

    try {
      const payload = JSON.parse(await readBody(req));
      const yamlText = String(payload.yamlText || "").trim();
      if (!yamlText) {
        sendSafe(res, req, 400, JSON.stringify({ error: "Missing yamlText" }), "application/json");
        return;
      }
      const result = await mihomoService.checkConfig({ yamlText });
      sendSafe(res, req, 200, JSON.stringify(result), "application/json");
    } catch (error) {
      if (error.message === "Request body too large") {
        sendSafe(res, req, 413, JSON.stringify({ error: "Request body too large" }), "application/json");
      } else {
        sendSafe(res, req, 400, JSON.stringify({ error: error.message || "Invalid request body" }), "application/json");
      }
    }
    return;
  }

  if (url.pathname === "/mihomo/benchmark" && req.method === "POST") {
    if (!isAuthorized(req, relayboxToken)) {
      sendSafe(res, req, 401, JSON.stringify({ error: "Unauthorized" }), "application/json");
      return;
    }

    try {
      const payload = JSON.parse(await readBody(req));
      const normalized = normalizeBenchmarkRequest(payload);
      const result = await mihomoService.benchmarkPolicies(normalized);
      sendSafe(res, req, result.ok === false ? 503 : 200, JSON.stringify(result), "application/json");
    } catch (error) {
      const status = error.message === "Request body too large" ? 413 : 400;
      sendSafe(res, req, status, JSON.stringify({ error: error.message || "Invalid request body" }), "application/json");
    }
    return;
  }

  // Config Upload (POST)
  if (url.pathname === "/config/upload" && req.method === "POST") {
    try {
      if (configStore.size >= MAX_CONFIG_STORE_SIZE) {
        sendSafe(res, req, 503, JSON.stringify({ error: "Config store full, try again later" }), "application/json");
        return;
      }

      const body = await readBody(req);
      const id = generateId();
      configStore.set(id, body);
      setTimeout(() => configStore.delete(id), 10 * 60 * 1000);

      const configUrl = `http://127.0.0.1:${PORT}/config/${id}`;
      sendSafe(res, req, 200, JSON.stringify({ id, url: configUrl }), "application/json");
    } catch (err) {
      if (err.message === "Request body too large") {
        sendSafe(res, req, 413, JSON.stringify({ error: "Request body too large" }), "application/json");
      } else {
        sendSafe(res, req, 400, JSON.stringify({ error: "Failed to upload config" }), "application/json");
      }
    }
    return;
  }

  // Config Retrieval (GET)
  const configMatch = url.pathname.match(/^\/config\/([a-zA-Z0-9]+)$/);
  if (configMatch && req.method === "GET") {
    const id = configMatch[1];
    if (configStore.has(id)) {
      sendSafe(res, req, 200, configStore.get(id), "text/yaml; charset=utf-8");
    } else {
      sendSafe(res, req, 404, "Config not found or expired");
    }
    return;
  }

  // Ping test (POST)
  if (url.pathname === "/ping" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { server: targetServer, port } = JSON.parse(body);
      if (!targetServer || !port) {
        sendSafe(res, req, 400, JSON.stringify({ error: "Missing server or port" }), "application/json");
        return;
      }

      const parsedPort = Number(port);
      if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        sendSafe(res, req, 400, JSON.stringify({ error: "Invalid port" }), "application/json");
        return;
      }

      // 正则预检
      if (isPrivateOrReserved(targetServer)) {
        sendSafe(res, req, 403, JSON.stringify({ error: "Access to private/reserved IP addresses is not allowed" }), "application/json");
        return;
      }

      // DNS 解析检查（在 TCP 连接前）
      dns.lookup(targetServer, { all: true, family: 0 }, (dnsErr, addresses) => {
        if (dnsErr) {
          sendSafe(res, req, 400, JSON.stringify({ error: "DNS resolution failed" }), "application/json");
          return;
        }

        const blocked = addresses.some(({ address }) => isPrivateOrReserved(address));
        if (blocked) {
          sendSafe(res, req, 403, JSON.stringify({ error: "Access to private/reserved IP addresses is not allowed" }), "application/json");
          return;
        }

        // DNS 检查通过，用已校验的解析结果直接连接，避免 TOCTOU
        const resolvedIp = addresses[0].address;

        // 多次 TCP 连接取最小值，消除网络抖动
        const ROUNDS = 3;
        const TIMEOUT = 5000;
        const results = [];
        let completed = 0;
        let responded = false;

        const tryConnect = () => {
          if (responded) return;
          const socket = new net.Socket();
          const startTime = Date.now();

          socket.setTimeout(TIMEOUT);

          socket.connect(parsedPort, resolvedIp, () => {
            const tcpTime = Date.now() - startTime;
            socket.destroy();
            results.push(tcpTime);
            completed++;
            if (completed < ROUNDS) {
              tryConnect();
            } else if (!responded) {
              responded = true;
              const bestTcp = Math.min(...results);
              sendSafe(res, req, 200, JSON.stringify({
                latency: bestTcp,
                status: "ok"
              }), "application/json");
            }
          });

          socket.on("timeout", () => {
            socket.destroy();
            completed++;
            if (completed < ROUNDS) {
              tryConnect();
            } else if (!responded) {
              responded = true;
              if (results.length > 0) {
                const bestTcp = Math.min(...results);
                sendSafe(res, req, 200, JSON.stringify({
                  latency: bestTcp,
                  status: "ok"
                }), "application/json");
              } else {
                sendSafe(res, req, 200, JSON.stringify({ latency: -2, status: "timeout" }), "application/json");
              }
            }
          });

          socket.on("error", () => {
            socket.destroy();
            completed++;
            if (completed < ROUNDS) {
              tryConnect();
            } else if (!responded) {
              responded = true;
              if (results.length > 0) {
                const bestTcp = Math.min(...results);
                sendSafe(res, req, 200, JSON.stringify({
                  latency: bestTcp,
                  status: "ok"
                }), "application/json");
              } else {
                sendSafe(res, req, 200, JSON.stringify({ latency: -2, status: "unreachable" }), "application/json");
              }
            }
          });
        };

        tryConnect();
      });

    } catch (err) {
      if (err.message === "Request body too large") {
        sendSafe(res, req, 413, JSON.stringify({ error: "Request body too large" }), "application/json");
      } else {
        sendSafe(res, req, 400, JSON.stringify({ error: "Invalid request body" }), "application/json");
      }
    }
    return;
  }

  if (await tryServeStatic(req, res, url.pathname)) {
    return;
  }

  // Proxy Fetch
  if (url.pathname !== "/fetch") {
    sendSafe(res, req, 404, "Not Found");
    return;
  }

  const target = url.searchParams.get("url");
  if (!target) {
    sendSafe(res, req, 400, "Missing url parameter");
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    sendSafe(res, req, 400, "Invalid url");
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    sendSafe(res, req, 400, "Only http/https supported");
    return;
  }

  // 正则预检
  if (isPrivateOrReserved(parsed.hostname)) {
    sendSafe(res, req, 403, "Access to private/reserved IP addresses is not allowed");
    return;
  }

  // 直接发起请求，DNS 检查在 safeLookup 中进行（无 TOCTOU 窗口）
  requestWithRedirect(parsed.toString(), res, req);
});

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const server = createRelayProxyServer();
  server.listen(PORT, () => {
    console.log(`RelayBox proxy server listening on http://localhost:${PORT}`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      console.log("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
