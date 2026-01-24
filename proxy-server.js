import http from "http";
import https from "https";

const PORT = Number(process.env.PORT) || 8787;

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
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

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/health") {
    send(res, 200, "ok");
    return;
  }

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
