export const RUNTIME_PROXY_FIELDS = new Set([
  "latency",
  "lastCheck",
  "status",
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
  if (!name || !type || !server || !Number.isFinite(port) || port <= 0) return null;

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
  const nameCounts = new Map();
  return nodes.map((node) => {
    const nextNode = { ...node };
    let uniqueName = nextNode.name;
    if (nameCounts.has(uniqueName)) {
      const count = nameCounts.get(uniqueName) + 1;
      nameCounts.set(uniqueName, count);
      uniqueName = `${uniqueName} (${count - 1})`;
      nextNode.name = uniqueName;
    } else {
      nameCounts.set(uniqueName, 1);
    }
    return nextNode;
  });
};
