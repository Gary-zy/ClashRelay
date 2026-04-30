import { validateClashConfig } from "./clashConfigValidator.js";

const emptySummary = (status = "blocked") => ({
  proxyCount: 0,
  proxyGroupCount: 0,
  ruleCount: 0,
  mode: "unknown",
  status,
});

const issueFromMessage = (message) => ({
  severity: "error",
  message,
});

const warningFromMessage = (message) => ({
  severity: "warning",
  message,
});

const getGroups = (config) => Array.isArray(config?.["proxy-groups"]) ? config["proxy-groups"] : [];
const getProxies = (config) => Array.isArray(config?.proxies) ? config.proxies : [];
const getRules = (config) => Array.isArray(config?.rules) ? config.rules : [];

const findProxyGroup = (groups, name) => groups.find((group) => group?.name === name);

const detectMode = ({ proxies, groups }) => {
  if (proxies.some((proxy) => proxy?.["dialer-proxy"])) return "relay";
  if (groups.some((group) => String(group?.name || "").startsWith("🎯"))) return "direct";
  if (groups.some((group) => group?.name === "🌐 代理出口")) return "subscription";
  return "unknown";
};

const buildRouteChain = ({ proxies, groups, mode }) => {
  const proxyGroup = findProxyGroup(groups, "🌐 代理出口");

  if (mode === "relay") {
    const landingProxy = proxies.find((proxy) => proxy?.["dialer-proxy"]);
    const landingGroup = groups.find((group) =>
      String(group?.name || "").startsWith("🎯") && Array.isArray(group.proxies) && group.proxies.includes(landingProxy?.name)
    );
    return [
      landingProxy?.["dialer-proxy"],
      landingGroup?.name,
      proxyGroup?.name,
    ].filter(Boolean);
  }

  if (mode === "direct") {
    const landingGroup = groups.find((group) => String(group?.name || "").startsWith("🎯"));
    return [landingGroup?.name, proxyGroup?.name].filter(Boolean);
  }

  if (mode === "subscription") {
    return [proxyGroup?.name].filter(Boolean);
  }

  return [];
};

export const buildConfigHealthReport = (config) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      summary: emptySummary(),
      routeChain: [],
      issues: [issueFromMessage("还没有生成可体检的 YAML 配置。")],
      warnings: [],
    };
  }

  const proxies = getProxies(config);
  const groups = getGroups(config);
  const rules = getRules(config);
  const validation = validateClashConfig(config);
  const mode = detectMode({ proxies, groups });
  const warnings = [...(validation.warnings || []).map(warningFromMessage)];

  if (proxies.length === 0) warnings.push(warningFromMessage("当前配置没有代理节点。"));
  if (groups.length === 0) warnings.push(warningFromMessage("当前配置没有策略组。"));
  if (rules.length === 0) warnings.push(warningFromMessage("当前配置没有规则。"));
  if (mode === "unknown") warnings.push(warningFromMessage("没识别出 RelayBox 常用出口策略组。"));

  const issues = (validation.errors || []).map(issueFromMessage);
  const status = issues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ok";

  return {
    summary: {
      proxyCount: proxies.length,
      proxyGroupCount: groups.length,
      ruleCount: rules.length,
      mode,
      status,
    },
    routeChain: buildRouteChain({ proxies, groups, mode }),
    issues,
    warnings,
  };
};
