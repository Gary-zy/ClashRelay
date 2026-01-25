import http from "http";
import https from "https";

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

  req.on("error", () => {
    send(res, 502, "Upstream request failed");
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
      
      send(res, 200, JSON.stringify({ id, url: `http://${req.headers.host}/config/${id}` }), "application/json");
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
