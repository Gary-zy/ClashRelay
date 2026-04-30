export const RUNTIME_PROXY_FIELDS = new Set([
  "latency",
  "lastCheck",
  "status",
  "sourceName",
  "sourcePrefix",
]);

export const normalizeProxyHost = (value) => {
  if (typeof value !== "string") return value;
  return value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
};

export const cleanProxyForExport = (node, { preserveDialerProxy = true } = {}) => {
  if (!node) return node;
  const cleaned = { ...node };
  RUNTIME_PROXY_FIELDS.forEach((field) => {
    delete cleaned[field];
  });
  if (!preserveDialerProxy) {
    delete cleaned["dialer-proxy"];
  }
  if (typeof cleaned.server === "string") {
    cleaned.server = normalizeProxyHost(cleaned.server.trim());
  }
  return cleaned;
};

export const sanitizeImportedProxy = (node, { preserveDialerProxy = false } = {}) => {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  const name = typeof node.name === "string" ? node.name.trim() : "";
  const type = typeof node.type === "string" ? node.type.trim() : "";
  const server = typeof node.server === "string" ? normalizeProxyHost(node.server.trim()) : "";
  const port = Number(node.port);
  if (!name || !type || !server || !Number.isInteger(port) || port < 1 || port > 65535) return null;

  return cleanProxyForExport(
    {
      ...node,
      name,
      type,
      server,
      port,
    },
    { preserveDialerProxy }
  );
};

export const dedupeProxyNames = (nodes) => {
  const usedNames = new Set();
  return nodes.map((node) => {
    const nextNode = { ...node };
    let uniqueName = nextNode.name;
    if (usedNames.has(uniqueName)) {
      let count = 1;
      while (usedNames.has(`${uniqueName} (${count})`)) {
        count++;
      }
      nextNode.name = `${uniqueName} (${count})`;
    }
    usedNames.add(nextNode.name);
    return nextNode;
  });
};
