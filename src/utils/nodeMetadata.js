const informationalNodePatterns = [
  /^剩余流量[:：]/i,
  /^距离下次重置剩余[:：]/i,
  /^套餐到期[:：]/i,
  /^🪧/u,
  /官网\s*[:：]/i,
  /不可用请软件内更新订阅/i,
  /问题排查/i,
];

export const isInformationalNodeName = (name) => {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  return informationalNodePatterns.some((pattern) => pattern.test(trimmed));
};

export const isInformationalNode = (node) => isInformationalNodeName(node?.name);

export const countInformationalNodes = (nodes) =>
  Array.isArray(nodes) ? nodes.filter((node) => isInformationalNode(node)).length : 0;
