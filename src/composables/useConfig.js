import { computed, ref } from "vue";
import yaml from "js-yaml";
import { defaultRules, subscriptionDefaultRules, fakeIpFilter } from "../config/defaultConfig.js";
import { parseProxyLine, parseRules } from "../utils/parsers.js";
import { useNodeParams } from "./useNodeParams.js";

export const MANUAL_LANDING_TYPES = new Set(["socks5", "http"]);

const isValidPort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535;
};

export const getFetchErrorMessage = ({ error, responseStatus, usedProxy }) => {
  if (responseStatus) {
    if (responseStatus === 401 || responseStatus === 403) {
      return "订阅请求被目标站拒绝了，检查订阅链接、鉴权参数或本地代理配置。";
    }
    if (responseStatus === 404) {
      return "订阅地址返回 404，链接多半填错了。";
    }
    if (responseStatus >= 500) {
      return usedProxy
        ? "本地代理服务或订阅源挂了，先确认代理服务还活着，再重试。"
        : "订阅源返回 5xx，服务端自己先趴下了。";
    }
    return `订阅请求失败（HTTP ${responseStatus}），请检查订阅链接或代理服务。`;
  }

  if (usedProxy) {
    return "本地代理地址不可用，或者代理服务没启动。先确认 proxy-server.js 在跑，再重试。";
  }

  if (error?.name === "AbortError") {
    return "订阅请求超时了，网络太慢或者订阅源没响应。";
  }

  return "订阅拉取失败，可能是网络问题或 CORS 限制。需要的话填上本地代理地址再试。";
};

export const validateLandingProxyInput = ({ form, landingNode }) => {
  const nodeType = form.landingNodeType || "socks5";
  const isManualType = MANUAL_LANDING_TYPES.has(nodeType);

  if (!form.socksAlias || !form.socksAlias.trim()) {
    return { ok: false, message: "请填写落地节点别名。", type: "warning" };
  }

  if (isManualType) {
    if (!form.socksServer || !form.socksServer.trim()) {
      return { ok: false, message: "请填写落地节点地址。", type: "warning" };
    }

    if (!form.socksPort || !String(form.socksPort).trim()) {
      return { ok: false, message: "请填写落地节点端口。", type: "warning" };
    }

    if (!isValidPort(form.socksPort)) {
      return { ok: false, message: `端口 "${form.socksPort}" 不合法，必须是 1-65535 的整数。`, type: "error" };
    }

    return { ok: true };
  }

  if (!landingNode || landingNode.type !== nodeType) {
    return {
      ok: false,
      message: `当前协议 ${nodeType.toUpperCase()} 仅支持通过节点链接解析导入。`,
      type: "warning",
    };
  }

  const requiredFieldByType = {
    ss: ["server", "port", "cipher", "password"],
    ssr: ["server", "port", "cipher", "password", "protocol", "obfs"],
    vmess: ["server", "port", "uuid"],
    vless: ["server", "port", "uuid"],
    trojan: ["server", "port", "password"],
    anytls: ["server", "port", "password"],
    hysteria: ["server", "port"],
    hysteria2: ["server", "port", "password"],
    tuic: ["server", "port", "uuid", "password"],
  };

  const missingFields = (requiredFieldByType[nodeType] || []).filter((field) => !landingNode[field]);
  if (missingFields.length > 0) {
    return {
      ok: false,
      message: `${nodeType.toUpperCase()} 节点缺少关键字段：${missingFields.join(", ")}，请换一条完整链接。`,
      type: "error",
    };
  }

  if (!isValidPort(landingNode.port)) {
    return {
      ok: false,
      message: `${nodeType.toUpperCase()} 节点端口不合法，请换一条完整链接。`,
      type: "error",
    };
  }

  return { ok: true };
};

export const buildLandingProxyFromForm = ({ form, landingNode }) => {
  const validation = validateLandingProxyInput({ form, landingNode });
  if (!validation.ok) {
    return validation;
  }

  const nodeType = form.landingNodeType || "socks5";
  const isManualType = MANUAL_LANDING_TYPES.has(nodeType);

  if (isManualType) {
    const landingProxy = {
      name: form.socksAlias.trim(),
      type: nodeType,
      server: form.socksServer.trim(),
      port: Number(form.socksPort),
    };

    if (form.socksUser) landingProxy.username = form.socksUser;
    if (form.socksPass) landingProxy.password = form.socksPass;
    if (nodeType === "socks5") landingProxy.udp = true;

    return { ok: true, landingProxy };
  }

  return {
    ok: true,
    landingProxy: {
      ...landingNode,
      name: form.socksAlias.trim(),
    },
  };
};

const replaceProxyGroupNames = (rule, landingGroupName, proxyGroupName) =>
  rule
    .replace(/\{\{LANDING\}\}/g, landingGroupName)
    .replace(/\{\{PROXY\}\}/g, proxyGroupName)
    .replace(/[^,]*其他外网/g, proxyGroupName)
    .replace(/,Proxy$/g, `,${proxyGroupName}`);

const dedupeRules = (rules) => {
  const seen = new Set();
  return rules.filter((rule) => {
    const normalized = String(rule || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const cleanProxy = (node) => {
  if (!node) return node;
  const cleaned = { ...node };
  delete cleaned.latency;
  delete cleaned.lastCheck;
  delete cleaned.status;
  return cleaned;
};

const splitRuleByTopLevelCommas = (rule) => {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < rule.length; i++) {
    if (rule[i] === "(") depth++;
    else if (rule[i] === ")" && depth > 0) depth--;
    else if (rule[i] === "," && depth === 0) {
      parts.push(rule.substring(start, i));
      start = i + 1;
    }
  }

  parts.push(rule.substring(start));
  return parts;
};

const sanitizeRuleForSubscription = (rule, proxyGroupName) => {
  let sanitized = rule
    .replace(/\{\{PROXY\}\}/g, proxyGroupName)
    .replace(/\{\{LANDING\}\}/g, proxyGroupName);

  const topLevelParts = splitRuleByTopLevelCommas(sanitized);
  const policyIndex = topLevelParts[0].trim() === "MATCH" ? 1 : 2;

  if (topLevelParts.length > policyIndex && topLevelParts[policyIndex].includes("\u{1F3AF}")) {
    topLevelParts[policyIndex] = proxyGroupName;
    sanitized = topLevelParts.join(",");
  }

  return sanitized;
};

export const buildClashConfig = ({
  form,
  nodes,
  landingNode,
  completeNode,
  completeNodes,
}) => {
  if (!form.isDirect && (!form.dialerProxyGroup || form.dialerProxyGroup.length === 0)) {
    return { ok: false, message: "中转模式下请至少选择一个跳板节点。", type: "warning" };
  }

  const landingResult = buildLandingProxyFromForm({ form, landingNode });
  if (!landingResult.ok) return landingResult;

  const landingProxyName = form.socksAlias?.trim() || "落地节点";
  const landingGroupName = `🎯 ${landingProxyName}`;
  const proxyGroupName = "🌐 代理出口";
  const isSingleNode = form.dialerProxyGroup.length === 1;
  const dialerProxyName = isSingleNode ? form.dialerProxyGroup[0] : "🔀 前置跳板组";
  const landingProxy = {
    ...landingResult.landingProxy,
    ...(form.isDirect ? {} : { "dialer-proxy": dialerProxyName }),
  };

  const completedNodes = form.isDirect ? [] : completeNodes(nodes);
  const completedLandingProxy = completeNode(landingProxy);
  const proxies = [...completedNodes.map(cleanProxy), cleanProxy(completedLandingProxy)];
  const proxyNames = completedNodes.map((node) => node.name);

  const customRulesFromText = parseRules(form.customRulesText || "").map((rule) =>
    replaceProxyGroupNames(rule, landingGroupName, proxyGroupName)
  );
  const builtInRules = defaultRules.map((rule) =>
    replaceProxyGroupNames(rule, landingGroupName, proxyGroupName)
  );

  const proxyGroups = [];

  if (!form.isDirect && !isSingleNode && form.dialerProxyGroup.length > 0) {
    const dialerGroup = {
      name: "🔀 前置跳板组",
      type: form.dialerProxyType,
      proxies: [...form.dialerProxyGroup],
    };

    if (form.dialerProxyType === "url-test" || form.dialerProxyType === "fallback") {
      dialerGroup.url = "http://www.gstatic.com/generate_204";
      dialerGroup.interval = form.urlTestInterval || 30;
      dialerGroup.tolerance = form.urlTestTolerance || 50;
      if (!form.urlTestLazy) {
        dialerGroup.lazy = false;
      }
    }

    proxyGroups.push(dialerGroup);
  }

  if (proxyNames.length > 0 && !form.isDirect) {
    proxyGroups.push(
      {
        name: landingGroupName,
        type: "select",
        proxies: [landingProxyName],
      },
      {
        name: proxyGroupName,
        type: "select",
        proxies: ["♻️ 自动选择", "🛡️ 故障转移", "⚖️ 负载均衡", ...proxyNames, landingProxyName, "DIRECT"],
      },
      {
        name: "♻️ 自动选择",
        type: "url-test",
        proxies: [...proxyNames],
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50,
      },
      {
        name: "🛡️ 故障转移",
        type: "fallback",
        proxies: [...proxyNames],
        url: "http://www.gstatic.com/generate_204",
        interval: 180,
      },
      {
        name: "⚖️ 负载均衡",
        type: "load-balance",
        proxies: [...proxyNames],
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        strategy: "consistent-hashing",
      }
    );
  } else {
    proxyGroups.push(
      {
        name: landingGroupName,
        type: "select",
        proxies: [landingProxyName],
      },
      {
        name: proxyGroupName,
        type: "select",
        proxies: [landingProxyName, "DIRECT"],
      }
    );
  }

  const config = {
    "mixed-port": 7890,
    "allow-lan": true,
    "bind-address": "*",
    mode: "rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    dns: {
      enable: true,
      ipv6: false,
      "use-hosts": true,
      "enhanced-mode": "fake-ip",
      "default-nameserver": ["223.5.5.5", "119.29.29.29"],
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": fakeIpFilter,
      nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
      fallback: [
        "https://doh.dns.sb/dns-query",
        "https://dns.cloudflare.com/dns-query",
        "https://dns.twnic.tw/dns-query",
        "tls://8.8.4.4:853",
      ],
      "fallback-filter": {
        geoip: true,
        "geoip-code": "CN",
        ipcidr: ["240.0.0.0/4", "0.0.0.0/32"],
      },
    },
    proxies,
    "proxy-groups": proxyGroups,
    rules: dedupeRules([...customRulesFromText, ...builtInRules]),
  };

  return { ok: true, config };
};

export const buildSubscriptionOnlyConfig = ({
  form,
  nodes,
  completeNodes,
}) => {
  if (!nodes || nodes.length === 0) {
    return { ok: false, message: "没有可用的订阅节点，请先获取订阅。", type: "warning" };
  }

  const proxyGroupName = "🌐 代理出口";
  const completedNodes = completeNodes(nodes);
  const proxies = completedNodes.map(cleanProxy);
  const proxyNames = completedNodes.map((node) => node.name);
  const customRulesFromText = parseRules(form.customRulesText || "").map((rule) =>
    sanitizeRuleForSubscription(rule, proxyGroupName)
  );
  const builtInRules = subscriptionDefaultRules.map((rule) =>
    rule.replace(/\{\{PROXY\}\}/g, proxyGroupName)
  );

  const proxyGroups = [
    {
      name: proxyGroupName,
      type: "select",
      proxies: ["♻️ 自动选择", "🛡️ 故障转移", "⚖️ 负载均衡", ...proxyNames, "DIRECT"],
    },
    {
      name: "♻️ 自动选择",
      type: "url-test",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
    },
    {
      name: "🛡️ 故障转移",
      type: "fallback",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 180,
    },
    {
      name: "⚖️ 负载均衡",
      type: "load-balance",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      strategy: "consistent-hashing",
    },
  ];

  const config = {
    "mixed-port": 7890,
    "allow-lan": true,
    "bind-address": "*",
    mode: "rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    dns: {
      enable: true,
      ipv6: false,
      "use-hosts": true,
      "enhanced-mode": "fake-ip",
      "default-nameserver": ["223.5.5.5", "119.29.29.29"],
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": fakeIpFilter,
      nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
      fallback: [
        "https://doh.dns.sb/dns-query",
        "https://dns.cloudflare.com/dns-query",
        "https://dns.twnic.tw/dns-query",
        "tls://8.8.4.4:853",
      ],
      "fallback-filter": {
        geoip: true,
        "geoip-code": "CN",
        ipcidr: ["240.0.0.0/4", "0.0.0.0/32"],
      },
    },
    proxies,
    "proxy-groups": proxyGroups,
    rules: dedupeRules([...customRulesFromText, ...builtInRules]),
  };

  return { ok: true, config };
};

export const useConfig = ({
  form,
  nodes,
  status,
  yamlText,
  previousYaml,
}) => {
  const landingNode = ref(null);
  const { completeNode, completeNodes } = useNodeParams();

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
  };

  const selectedNodes = computed(() =>
    nodes.value.filter((node) => form.dialerProxyGroup.includes(node.name))
  );

  const requiresParsedLandingNode = computed(
    () => !MANUAL_LANDING_TYPES.has(form.landingNodeType)
  );

  const parseLandingNodeUrl = () => {
    const url = form.landingNodeUrl.trim();
    if (!url) {
      setStatus("请输入节点链接。", "warning");
      return;
    }

    try {
      let node = null;
      landingNode.value = null;

      if (url.startsWith("socks5://") || url.startsWith("socks5h://") || url.startsWith("socks://")) {
        const match = url.match(/^(?:socks5h?|socks):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(.+)$/);
        if (!match) {
          setStatus("socks5 链接格式不正确，正确格式：socks5://user:pass@host:port", "error");
          return;
        }

        const [, username, password, host, portStr] = match;
        const port = parseInt(portStr, 10);

        if (!isValidPort(port) || portStr !== String(port)) {
          setStatus(`端口 "${portStr}" 不是有效数字，请把 :${portStr} 换成真实端口。`, "error");
          return;
        }

        node = {
          name: form.socksAlias || "socks5-landing",
          type: "socks5",
          server: host,
          port,
          username: username ? decodeURIComponent(username) : undefined,
          password: password ? decodeURIComponent(password) : undefined,
          udp: true,
        };
      } else if (url.startsWith("http://") && url.includes("@")) {
        const match = url.match(/^http:\/\/(?:([^:]+):([^@]+)@)?([^:\/]+):(.+)$/);
        if (!match) {
          setStatus("http 链接格式不正确，正确格式：http://user:pass@host:port", "error");
          return;
        }

        const [, username, password, host, portStr] = match;
        const port = parseInt(portStr, 10);

        if (!isValidPort(port) || portStr !== String(port)) {
          setStatus(`端口 "${portStr}" 不是有效数字，请把 :${portStr} 换成真实端口。`, "error");
          return;
        }

        node = {
          name: form.socksAlias || "http-landing",
          type: "http",
          server: host,
          port,
          username: username ? decodeURIComponent(username) : undefined,
          password: password ? decodeURIComponent(password) : undefined,
        };
      } else {
        node = parseProxyLine(url, 0);
      }

      if (!node) {
        setStatus(
          "链接格式不正确，支持 anytls:// ss:// vmess:// vless:// trojan:// hysteria2:// tuic:// socks5:// http://",
          "error"
        );
        return;
      }

      landingNode.value = node;
      form.landingNodeType = node.type;
      form.socksServer = node.server || "";
      form.socksPort = node.port ? String(node.port) : "";
      form.socksUser = node.username || "";
      form.socksPass = node.password || "";

      if (node.name) {
        form.socksAlias = node.name;
      }

      setStatus(`解析成功：已载入 ${node.type.toUpperCase()} 落地节点。`, "success");
    } catch (error) {
      console.error("Landing node parse error:", error);
      setStatus("解析失败，请检查节点链接格式。", "error");
    }
  };

  const generateYaml = () => {
    previousYaml.value = yamlText.value;

    const isSubscriptionMode = form.generateMode === "subscription";

    const result = isSubscriptionMode
      ? buildSubscriptionOnlyConfig({
          form,
          nodes: nodes.value,
          completeNodes,
        })
      : buildClashConfig({
          form,
          nodes: nodes.value,
          landingNode: landingNode.value,
          completeNode,
          completeNodes,
        });

    if (!result.ok) {
      setStatus(result.message, result.type);
      return;
    }

    yamlText.value = yaml.dump(result.config, {
      noRefs: true,
      lineWidth: 120,
      quotingType: '"',
    });

    if (isSubscriptionMode) {
      setStatus("订阅整理配置已生成，可复制或下载。", "success");
    } else {
      setStatus(
        form.isDirect ? "直连 Clash 配置已生成。" : "Clash 配置已生成，可复制或下载。",
        "success"
      );
    }
  };

  return {
    landingNode,
    selectedNodes,
    requiresParsedLandingNode,
    parseLandingNodeUrl,
    generateYaml,
  };
};
