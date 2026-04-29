import { splitRuleByTopLevelCommas } from "./ruleParser.js";

const BUILTIN_POLICIES = new Set([
  "DIRECT",
  "REJECT",
  "REJECT-DROP",
  "PASS",
]);

const findDuplicateNames = (items) => {
  const counts = new Map();
  items.forEach((name) => {
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
};

export const getProxyNames = (config) => new Set((config.proxies || []).map((proxy) => proxy.name));

export const getProxyGroupNames = (config) =>
  new Set((config["proxy-groups"] || []).map((group) => group.name));

export const getAvailablePolicies = (config) =>
  new Set([
    ...BUILTIN_POLICIES,
    ...getProxyNames(config),
    ...getProxyGroupNames(config),
  ]);

export const getRulePolicy = (rule) => {
  const parts = splitRuleByTopLevelCommas(String(rule || "")).map((part) => part.trim());
  if (!parts[0]) return "";
  return parts[0] === "MATCH" ? parts[1] : parts[2];
};

export const validateClashConfig = (config) => {
  const errors = [];
  const warnings = [];
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  const proxyGroups = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const proxyNames = getProxyNames(config);
  const groupNames = getProxyGroupNames(config);
  const availablePolicies = getAvailablePolicies(config);

  findDuplicateNames(proxies.map((proxy) => proxy.name)).forEach((name) => {
    errors.push(`重复代理名：${name}`);
  });

  findDuplicateNames(proxyGroups.map((group) => group.name)).forEach((name) => {
    errors.push(`重复代理组名：${name}`);
  });

  [...proxyNames].forEach((name) => {
    if (groupNames.has(name)) {
      errors.push(`代理名和代理组名冲突：${name}`);
    }
  });

  proxies.forEach((proxy) => {
    const dialerProxy = proxy["dialer-proxy"];
    if (dialerProxy && !availablePolicies.has(dialerProxy)) {
      errors.push(`代理 ${proxy.name} 的 dialer-proxy 引用了不存在的策略 ${dialerProxy}`);
    }
  });

  proxyGroups.forEach((group) => {
    if (!Array.isArray(group.proxies) || group.proxies.length === 0) {
      errors.push(`代理组 ${group.name} 没有可用策略`);
      return;
    }

    group.proxies.forEach((policy) => {
      if (!availablePolicies.has(policy)) {
        errors.push(`代理组 ${group.name} 引用了不存在的策略 ${policy}`);
      }
    });
  });

  rules.forEach((rule) => {
    const policy = getRulePolicy(rule);
    if (policy && !availablePolicies.has(policy)) {
      errors.push(`规则引用了不存在的策略 ${policy}：${rule}`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
};
