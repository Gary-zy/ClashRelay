import http from "http";
import https from "https";
import net from "net";

const PORT = Number(process.env.PORT) || 8787;

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "no-store");
};

const send = (res, statusCode, body, contentType = "text/plain; charset=utf-8") => {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(body);
};

const requestWithRedirect = (targetUrl, res, redirectCount = 0) => {
  if (redirectCount > 3) {
    send(res, 502, "Too many redirects");
    return;
  }

  const handler = targetUrl.startsWith("https") ? https : http;
  const req = handler.get(targetUrl, (upstream) => {
    if ([301, 302, 307, 308].includes(upstream.statusCode)) {
      const location = upstream.headers.location;
      if (!location) {
        send(res, 502, "Redirect location missing");
        return;
      }
      requestWithRedirect(location, res, redirectCount + 1);
      return;
    }

    setCors(res);
    res.statusCode = upstream.statusCode || 200;
    if (upstream.headers["content-type"]) {
      res.setHeader("Content-Type", upstream.headers["content-type"]);
    }
    upstream.pipe(res);
  });

  req.on("error", (err) => {
    console.error("Upstream request failed:", targetUrl, err.message);
    send(res, 502, `Upstream request failed: ${err.message}`);
  });
};

const configStore = new Map();

const generateId = () => Math.random().toString(36).substring(2, 10);

const server = http.createServer((req, res) => {
  // Handle CORS for all requests
  if (req.method === "OPTIONS") {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === "/health") {
    send(res, 200, "ok");
    return;
  }

  // Config Upload (POST)
  if (url.pathname === "/config/upload" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const id = generateId();
      configStore.set(id, body);
      // Auto cleanup after 10 minutes
      setTimeout(() => configStore.delete(id), 10 * 60 * 1000);
      
      // 使用 127.0.0.1 确保 Clash 客户端能正确访问
      const configUrl = `http://127.0.0.1:${PORT}/config/${id}`;
      send(res, 200, JSON.stringify({ id, url: configUrl }), "application/json");
    });
    return;
  }

  // Config Retrieval (GET)
  const configMatch = url.pathname.match(/^\/config\/([a-zA-Z0-9]+)$/);
  if (configMatch && req.method === "GET") {
    const id = configMatch[1];
    if (configStore.has(id)) {
      send(res, 200, configStore.get(id), "text/yaml; charset=utf-8");
    } else {
      send(res, 404, "Config not found or expired");
    }
    return;
  }

  // Ping test (POST) - 测试节点延迟
  // 通过 TCP 连接测试节点可达性，并估算延迟
  // 注意：这是 TCP 握手时间的估算，真实代理延迟会更高
  if (url.pathname === "/ping" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const { server: targetServer, port } = JSON.parse(body);
        if (!targetServer || !port) {
          send(res, 400, JSON.stringify({ error: "Missing server or port" }), "application/json");
          return;
        }
        
        // 使用 TCP 连接测试
        const socket = new net.Socket();
        const startTime = Date.now();
        let responded = false;
        
        socket.setTimeout(5000);
        
        socket.connect(Number(port), targetServer, () => {
          if (responded) return;
          responded = true;
          const tcpTime = Date.now() - startTime;
          socket.destroy();
          
          // TCP 握手时间 = 1 RTT
          // 代理延迟估算 = TCP 时间 × 3（连接 + 请求 + 响应的往返）
          // 加上一个基准延迟来模拟协议开销
          const estimatedLatency = Math.round(tcpTime * 3 + 20);
          
          send(res, 200, JSON.stringify({ 
            latency: estimatedLatency, 
            tcpTime: tcpTime,
            status: "ok" 
          }), "application/json");
        });
        
        socket.on("error", () => {
          if (responded) return;
          responded = true;
          socket.destroy();
          send(res, 200, JSON.stringify({ latency: -2, status: "unreachable" }), "application/json");
        });
        
        socket.on("timeout", () => {
          if (responded) return;
          responded = true;
          socket.destroy();
          send(res, 200, JSON.stringify({ latency: -2, status: "timeout" }), "application/json");
        });
        
      } catch (error) {
        send(res, 400, JSON.stringify({ error: "Invalid request body" }), "application/json");
      }
    });
    return;
  }

  // Proxy Fetch
  if (url.pathname !== "/fetch") {
    send(res, 404, "Not Found");
    return;
  }

  const target = url.searchParams.get("url");
  if (!target) {
    send(res, 400, "Missing url parameter");
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (error) {
    send(res, 400, "Invalid url");
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    send(res, 400, "Only http/https supported");
    return;
  }

  requestWithRedirect(parsed.toString(), res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RelayBox proxy server listening on http://localhost:${PORT}`);
});
