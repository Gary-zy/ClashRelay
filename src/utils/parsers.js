export const tryDecodeBase64 = (value) => {
  if (value.includes("://")) return "";
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(normalized + pad), (c) => c.charCodeAt(0));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded.includes("://") || decoded.includes("proxies:")) {
      return decoded;
    }
    return "";
  } catch (error) {
    return "";
  }
};

export function parseProxyLine(line, index) {
  if (line.startsWith("vmess://")) return parseVmess(line, index);
  if (line.startsWith("vless://")) return parseVless(line, index);
  if (line.startsWith("trojan://")) return parseTrojan(line, index);
  if (line.startsWith("ss://")) return parseSS(line, index);
  if (line.startsWith("ssr://")) return parseSSR(line, index);
  if (line.startsWith("hysteria://")) return parseHysteria(line, index);
  if (line.startsWith("hysteria2://") || line.startsWith("hy2://")) {
    return parseHysteria2(line, index);
  }
  if (line.startsWith("tuic://")) return parseTUIC(line, index);
  return null;
}

export function parseVmess(line, index) {
  try {
    const raw = line.replace("vmess://", "");
    const json = JSON.parse(tryDecodeBase64(raw) || atob(raw));
    const node = {
      name: json.ps || `vmess-${index + 1}`,
      type: "vmess",
      server: json.add,
      port: Number(json.port),
      uuid: json.id,
      alterId: Number(json.aid || 0),
      cipher: json.scy || "auto",
      udp: true,
    };

    if (json.tls === "tls") {
      node.tls = true;
      if (json.sni) node.servername = json.sni;
      if (json.allowInsecure === "0" || json.allowInsecure === 0 || json.verify_cert === true) {
        node["skip-cert-verify"] = false;
      } else {
        node["skip-cert-verify"] = true;
      }
      if (json.alpn) {
        node.alpn = Array.isArray(json.alpn) ? json.alpn : json.alpn.split(",");
      }
      if (json.fp) {
        node["client-fingerprint"] = json.fp;
      }
    }

    if (json.net) node.network = json.net;

    if (json.net === "ws") {
      node["ws-opts"] = {
        path: json.path || "/",
      };
      if (json.host) {
        node["ws-opts"].headers = { Host: json.host };
      }
      if (json.ed) {
        node["ws-opts"]["max-early-data"] = Number(json.ed);
        node["ws-opts"]["early-data-header-name"] = json.eh || "Sec-WebSocket-Protocol";
      }
    }

    if (json.net === "grpc") {
      node["grpc-opts"] = {
        "grpc-service-name": json.path || json.serviceName || "",
      };
      if (json.mode) {
        node["grpc-opts"]["grpc-mode"] = json.mode;
      }
    }

    if (json.net === "h2") {
      node["h2-opts"] = {
        path: json.path || "/",
      };
      if (json.host) {
        node["h2-opts"].host = Array.isArray(json.host) ? json.host : [json.host];
      }
    }

    if (json.net === "http") {
      node["http-opts"] = {
        path: json.path ? [json.path] : ["/"],
      };
      if (json.host) {
        node["http-opts"].headers = {
          Host: Array.isArray(json.host) ? json.host : [json.host],
        };
      }
    }

    if (json.net === "tcp" && json.type === "http") {
      node["http-opts"] = {
        path: json.path ? [json.path] : ["/"],
      };
      if (json.host) {
        node["http-opts"].headers = { Host: [json.host] };
      }
    }

    if (json.net === "kcp") {
      node.network = "kcp";
      node["kcp-opts"] = {};
      if (json.type) node["kcp-opts"]["header"] = { type: json.type };
      if (json.seed) node["kcp-opts"]["seed"] = json.seed;
    }

    if (json.net === "quic") {
      node.network = "quic";
      node["quic-opts"] = {};
      if (json.type) node["quic-opts"]["header"] = json.type;
      if (json.host) node["quic-opts"]["security"] = json.host;
      if (json.path) node["quic-opts"]["key"] = json.path;
    }

    return node;
  } catch (error) {
    return null;
  }
}

export function parseVless(line, index) {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `vless-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    const isReality = params.security === "reality";
    const isTls = params.security === "tls" || isReality;

    const node = {
      name,
      type: "vless",
      server: url.hostname,
      port: Number(url.port),
      uuid: url.username,
      udp: true,
      tls: isTls,
      network: params.type || "tcp",
    };

    if (params.sni) node.sni = params.sni;
    if (params.servername) node.servername = params.servername;

    if (params.flow) node.flow = params.flow;

    if (isTls) {
      if (params.allowInsecure === "0" || params.insecure === "0") {
        node["skip-cert-verify"] = false;
      } else {
        node["skip-cert-verify"] = true;
      }
    }

    if (params.fp) {
      node["client-fingerprint"] = params.fp;
    }

    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }

    if (isReality && params.pbk) {
      node["reality-opts"] = {
        "public-key": params.pbk,
      };
      if (params.sid) {
        node["reality-opts"]["short-id"] = params.sid;
      }
      if (params.spx) {
        node["reality-opts"]["spider-x"] = decodeURIComponent(params.spx);
      }
    }

    if (params.type === "ws") {
      node["ws-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        headers: params.host ? { Host: params.host } : undefined,
      };
      if (params.ed) {
        node["ws-opts"]["max-early-data"] = Number(params.ed);
        node["ws-opts"]["early-data-header-name"] = params.eh || "Sec-WebSocket-Protocol";
      }
    }

    if (params.type === "grpc") {
      node["grpc-opts"] = {
        "grpc-service-name": params.serviceName || params.path || "",
      };
      if (params.mode) {
        node["grpc-opts"]["grpc-mode"] = params.mode;
      }
    }

    if (params.type === "h2") {
      node["h2-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        host: params.host ? [params.host] : undefined,
      };
    }

    if (params.type === "tcp" && params.headerType === "http") {
      node["http-opts"] = {
        path: params.path ? [decodeURIComponent(params.path)] : ["/"],
      };
      if (params.host) {
        node["http-opts"]["headers"] = { Host: [params.host] };
      }
    }

    if (params.type === "httpupgrade") {
      node.network = "httpupgrade";
      node["httpupgrade-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        host: params.host || undefined,
      };
    }

    if (params.type === "splithttp") {
      node.network = "splithttp";
      node["splithttp-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        host: params.host || undefined,
      };
    }

    return node;
  } catch (error) {
    return null;
  }
}

export function parseTrojan(line, index) {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `trojan-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());

    const isReality = params.security === "reality";
    const isTls = (params.security !== "none" && params.security !== "xtls") || isReality;

    const node = {
      name,
      type: "trojan",
      server: url.hostname,
      port: Number(url.port),
      password: decodeURIComponent(url.username),
      udp: true,
    };

    if (isTls && !isReality) {
      node.tls = true;
    }

    if (params.sni) node.sni = params.sni;
    if (params.peer) node.sni = params.peer;

    if (node.tls || isReality) {
      if (params.allowInsecure === "0" || params.insecure === "0") {
        node["skip-cert-verify"] = false;
      } else {
        node["skip-cert-verify"] = true;
      }
    }

    if (params.fp) {
      node["client-fingerprint"] = params.fp;
    }

    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }

    if (isReality && params.pbk) {
      node["reality-opts"] = {
        "public-key": params.pbk,
      };
      if (params.sid) {
        node["reality-opts"]["short-id"] = params.sid;
      }
      if (params.spx) {
        node["reality-opts"]["spider-x"] = decodeURIComponent(params.spx);
      }
    }

    const transport = params.type || "tcp";
    if (transport !== "tcp") {
      node.network = transport;
    }

    if (transport === "ws") {
      node.network = "ws";
      node["ws-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        headers: params.host ? { Host: params.host } : undefined,
      };
      if (params.ed) {
        node["ws-opts"]["max-early-data"] = Number(params.ed);
        node["ws-opts"]["early-data-header-name"] = params.eh || "Sec-WebSocket-Protocol";
      }
    }

    if (transport === "grpc") {
      node.network = "grpc";
      node["grpc-opts"] = {
        "grpc-service-name": params.serviceName || params.path || "",
      };
      if (params.mode) {
        node["grpc-opts"]["grpc-mode"] = params.mode;
      }
    }

    if (transport === "h2") {
      node.network = "h2";
      node["h2-opts"] = {
        path: decodeURIComponent(params.path || "/"),
        host: params.host ? [params.host] : undefined,
      };
    }

    return node;
  } catch (error) {
    return null;
  }
}

export function parseSS(line, index) {
  try {
    let queryParams = {};
    let mainPart = line.replace("ss://", "");

    if (mainPart.includes("?")) {
      const [beforeQuery, query] = mainPart.split("?");
      const queryWithoutHash = query.split("#")[0];
      queryParams = Object.fromEntries(new URLSearchParams(queryWithoutHash));
      mainPart = beforeQuery + (query.includes("#") ? "#" + query.split("#")[1] : "");
    }

    const [main, namePart] = mainPart.split("#");

    let method, password, server, port;

    if (main.includes("@")) {
      const [userinfoPart, serverPart] = main.split("@");
      const decoded = tryDecodeBase64(userinfoPart) || atob(userinfoPart);
      const colonIdx = decoded.indexOf(":");
      method = decoded.substring(0, colonIdx);
      password = decoded.substring(colonIdx + 1);
      [server, port] = serverPart.split(":");
    } else {
      const decoded = tryDecodeBase64(main) || atob(main);
      const atIdx = decoded.lastIndexOf("@");
      const userinfo = decoded.substring(0, atIdx);
      const serverPart = decoded.substring(atIdx + 1);
      const colonIdx = userinfo.indexOf(":");
      method = userinfo.substring(0, colonIdx);
      password = userinfo.substring(colonIdx + 1);
      [server, port] = serverPart.split(":");
    }

    if (!password || !server || !port) {
      console.warn("SS parsing failed: missing required fields", {
        method,
        password,
        server,
        port,
      });
      return null;
    }

    const node = {
      name: decodeURIComponent(namePart || "") || `ss-${index + 1}`,
      type: "ss",
      server,
      port: Number(port),
      cipher: method,
      password,
      udp: true,
    };

    if (queryParams.plugin) {
      const pluginStr = decodeURIComponent(queryParams.plugin);
      const [pluginName, ...optsParts] = pluginStr.split(";");
      node.plugin = pluginName;

      if (optsParts.length > 0) {
        const pluginOpts = {};
        optsParts.forEach((part) => {
          const eqIdx = part.indexOf("=");
          if (eqIdx > 0) {
            pluginOpts[part.substring(0, eqIdx)] = part.substring(eqIdx + 1);
          } else {
            pluginOpts[part] = true;
          }
        });
        node["plugin-opts"] = pluginOpts;
      }
    }

    return node;
  } catch (error) {
    console.warn("SS parsing error:", error);
    return null;
  }
}

export function parseSSR(line, index) {
  try {
    const raw = line.replace("ssr://", "");
    const decoded = tryDecodeBase64(raw) || atob(raw.replace(/-/g, "+").replace(/_/g, "/"));

    const [mainPart, paramsPart] = decoded.split("/?");
    const parts = mainPart.split(":");

    if (parts.length < 6) return null;

    const [server, port, protocol, method, obfs, passwordBase64] = parts;
    const password =
      tryDecodeBase64(passwordBase64) ||
      atob(passwordBase64.replace(/-/g, "+").replace(/_/g, "/"));

    let name = `ssr-${index + 1}`;
    let obfsParam = "";
    let protocolParam = "";

    if (paramsPart) {
      const params = Object.fromEntries(new URLSearchParams(paramsPart));
      if (params.remarks) {
        name = tryDecodeBase64(params.remarks) ||
          atob(params.remarks.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (params.obfsparam) {
        obfsParam = tryDecodeBase64(params.obfsparam) ||
          atob(params.obfsparam.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (params.protoparam) {
        protocolParam = tryDecodeBase64(params.protoparam) ||
          atob(params.protoparam.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }

    return {
      name,
      type: "ssr",
      server,
      port: Number(port),
      cipher: method,
      password,
      protocol,
      "protocol-param": protocolParam,
      obfs,
      "obfs-param": obfsParam,
      udp: true,
    };
  } catch (error) {
    console.warn("SSR parsing error:", error);
    return null;
  }
}

export function parseHysteria(line, index) {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `hysteria-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());

    const node = {
      name,
      type: "hysteria",
      server: url.hostname,
      port: Number(url.port),
      "auth-str": params.auth || url.username || undefined,
      up: params.upmbps || params.up || "100",
      down: params.downmbps || params.down || "100",
    };

    if (params.peer || params.sni) {
      node.sni = params.peer || params.sni;
    }

    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }

    if (params.obfs) {
      node.obfs = params.obfs;
    }
    if (params.obfsParam) {
      node["obfs-password"] = params.obfsParam;
    }

    if (params.insecure === "0" || params.allowInsecure === "0") {
      node["skip-cert-verify"] = false;
    } else {
      node["skip-cert-verify"] = true;
    }

    if (params.fp) {
      node["fingerprint"] = params.fp;
    }

    return node;
  } catch (error) {
    console.warn("Hysteria parsing error:", error);
    return null;
  }
}

export function parseHysteria2(line, index) {
  try {
    const normalizedLine = line.replace("hy2://", "hysteria2://");
    const url = new URL(normalizedLine);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `hysteria2-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());

    const node = {
      name,
      type: "hysteria2",
      server: url.hostname,
      port: Number(url.port) || 443,
      password: decodeURIComponent(url.username) || params.auth,
    };

    if (params.sni) {
      node.sni = params.sni;
    }

    if (params.obfs) {
      node.obfs = params.obfs;
      if (params["obfs-password"]) {
        node["obfs-password"] = params["obfs-password"];
      }
    }

    if (params.insecure === "0" || params.allowInsecure === "0") {
      node["skip-cert-verify"] = false;
    } else {
      node["skip-cert-verify"] = true;
    }

    if (params.fp || params.pinSHA256) {
      node["fingerprint"] = params.fp || params.pinSHA256;
    }

    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }

    return node;
  } catch (error) {
    console.warn("Hysteria2 parsing error:", error);
    return null;
  }
}

export function parseTUIC(line, index) {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `tuic-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());

    const node = {
      name,
      type: "tuic",
      server: url.hostname,
      port: Number(url.port) || 443,
      uuid: url.username,
      password: decodeURIComponent(url.password) || params.password,
    };

    if (params.sni) {
      node.sni = params.sni;
    }

    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }

    if (params.congestion_control || params.congestion) {
      node["congestion-controller"] = params.congestion_control || params.congestion;
    }

    if (params.udp_relay_mode) {
      node["udp-relay-mode"] = params.udp_relay_mode;
    }

    if (params.insecure === "0" || params.allowInsecure === "0" || params.allow_insecure === "0") {
      node["skip-cert-verify"] = false;
    } else {
      node["skip-cert-verify"] = true;
    }

    if (params.disable_sni === "1") {
      node["disable-sni"] = true;
    }

    return node;
  } catch (error) {
    console.warn("TUIC parsing error:", error);
    return null;
  }
}

export const parseRules = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));
