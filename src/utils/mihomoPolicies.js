const TECHNICAL_GROUP_PREFIXES = ["🔀", "♻️", "🛡️", "⚖️"];

export const getBenchmarkPoliciesFromConfig = (config, limit = 20) => {
  const groups = Array.isArray(config?.["proxy-groups"]) ? config["proxy-groups"] : [];

  return groups
    .filter((group) => group && group.type === "select" && typeof group.name === "string")
    .map((group) => group.name.trim())
    .filter(Boolean)
    .filter((name) => !TECHNICAL_GROUP_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .slice(0, limit);
};
