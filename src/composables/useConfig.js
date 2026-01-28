import { computed, ref } from "vue";
import yaml from "js-yaml";
import { defaultRules } from "../config/defaultConfig.js";
import { parseProxyLine, parseRules } from "../utils/parsers.js";

export const useConfig = ({
  form,
  nodes,
  customRules,
  status,
  yamlText,
  previousYaml,
  generateClashImportUrl,
}) => {
  const landingNode = ref(null);

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
  };

  const selectedNodes = computed(() =>
    nodes.value.filter((node) => form.dialerProxyGroup.includes(node.name))
  );

  const landingProxyName = computed(() => form.socksAlias?.trim() || "落地节点");
  const landingGroupName = computed(() => `🎯 ${landingProxyName.value}`);

  const policyGroups = computed(() => [
    {
      label: landingGroupName.value,
      value: landingGroupName.value,
      description: "落地节点专用线路",
    },
    { label: "🌐 代理出口", value: "🌐 代理出口", description: "通用代理出口" },
    { label: "DIRECT", value: "DIRECT", description: "直连" },
  ]);

  const defaultRulesDisplay = computed(() => defaultRules.map((rule) => ({ rule })));

  const parseLandingNodeUrl = () => {
    const url = form.landingNodeUrl.trim();
    if (!url) {
      setStatus("请输入节点链接。", "warning");
      return;
    }

    try {
      let node = null;

      if (url.startsWith("socks5://") || url.startsWith("socks5h://") || url.startsWith("socks://")) {
        const match = url.match(/^(?:socks5h?|socks):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(.+)$/);
        if (!match) {
          setStatus("socks5 链接格式不正确，正确格式：socks5://user:pass@host:port", "error");
          return;
        }

        const [, username, password, host, portStr] = match;
        const port = parseInt(portStr, 10);

        if (isNaN(port) || portStr !== String(port)) {
          setStatus(`端口 "${portStr}" 不是有效数字，请把 :${portStr} 替换成真实端口号（如 :12333）`, "error");
          return;
        }

        node = {
          name: form.socksAlias || "socks5-landing",
          type: "socks5",
          server: host,
          port: port,
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

        if (isNaN(port) || portStr !== String(port)) {
          setStatus(`端口 "${portStr}" 不是有效数字，请把 :${portStr} 替换成真实端口号（如 :12333）`, "error");
          return;
        }

        node = {
          name: form.socksAlias || "http-landing",
          type: "http",
          server: host,
          port: port,
          username: username ? decodeURIComponent(username) : undefined,
          password: password ? decodeURIComponent(password) : undefined,
        };
      } else {
        node = parseProxyLine(url, 0);
      }

      if (!node) {
        setStatus(
          "链接格式不正确，支持格式：ss:// ssr:// vmess:// vless:// trojan:// hysteria:// hysteria2:// tuic:// socks5:// http://",
          "error"
        );
        return;
      }

      landingNode.value = node;
      form.landingNodeType = node.type;
      form.socksServer = node.server;
      form.socksPort = String(node.port);
      form.socksUser = node.username || "";
      form.socksPass = node.password || "";

      if (
        node.name &&
        !node.name.startsWith("ss-") &&
        !node.name.startsWith("vmess-") &&
        !node.name.startsWith("vless-") &&
        !node.name.startsWith("trojan-")
      ) {
        form.socksAlias = node.name;
      }

      setStatus(`解析成功！节点类型：${node.type.toUpperCase()}`, "success");
    } catch (error) {
      console.error("Landing node parse error:", error);
      setStatus("解析失败，请检查链接格式。", "error");
    }
  };

  const generateYaml = () => {
    if (!form.dialerProxyGroup || form.dialerProxyGroup.length === 0) {
      setStatus("请选择至少一个跳板节点。", "warning");
      return;
    }
    if (!form.socksServer || !form.socksPort) {
      setStatus("请填写落地节点信息，或使用链接解析功能。", "warning");
      return;
    }
    if (!form.socksAlias || !form.socksAlias.trim()) {
      setStatus("请填写落地节点别名。", "warning");
      return;
    }

    previousYaml.value = yamlText.value;

    const isSingleNode = form.dialerProxyGroup.length === 1;
    const dialerProxyName = isSingleNode ? form.dialerProxyGroup[0] : "🔀 前置跳板组";

    let landingProxy;
    const nodeType = form.landingNodeType || "socks5";

    if (landingNode.value && landingNode.value.type === nodeType) {
      landingProxy = {
        ...landingNode.value,
        name: form.socksAlias.trim(),
        "dialer-proxy": dialerProxyName,
      };
      if (!landingProxy.server) {
        landingProxy.server = form.socksServer.trim();
      }
      if (!landingProxy.port) {
        landingProxy.port = Number(form.socksPort);
      }
    } else {
      landingProxy = {
        name: form.socksAlias.trim(),
        type: nodeType,
        server: form.socksServer.trim(),
        port: Number(form.socksPort),
        "dialer-proxy": dialerProxyName,
      };

      if (nodeType === "socks5" || nodeType === "http") {
        if (form.socksUser) landingProxy.username = form.socksUser;
        if (form.socksPass) landingProxy.password = form.socksPass;
        if (nodeType === "socks5") landingProxy.udp = true;
      } else if (nodeType === "ss") {
        landingProxy.password = form.socksPass || "";
        landingProxy.cipher = "aes-256-gcm";
      } else if (nodeType === "ssr") {
        landingProxy.password = form.socksPass || "";
        landingProxy.cipher = "aes256-cfb";
        landingProxy.protocol = "origin";
        landingProxy.obfs = "plain";
        landingProxy.udp = true;
      } else if (nodeType === "trojan") {
        landingProxy.password = form.socksPass || "";
        landingProxy.udp = true;
      } else if (nodeType === "vmess") {
        landingProxy.uuid = form.socksPass || "";
        landingProxy.alterId = 0;
        landingProxy.cipher = "auto";
        landingProxy.udp = true;
      } else if (nodeType === "vless") {
        landingProxy.uuid = form.socksPass || "";
        landingProxy.udp = true;
      } else if (nodeType === "hysteria") {
        landingProxy["auth-str"] = form.socksPass || "";
        landingProxy.up = "100 Mbps";
        landingProxy.down = "200 Mbps";
        landingProxy["skip-cert-verify"] = true;
      } else if (nodeType === "hysteria2") {
        landingProxy.password = form.socksPass || "";
        landingProxy["skip-cert-verify"] = true;
      } else if (nodeType === "tuic") {
        landingProxy.uuid = form.socksUser || "";
        landingProxy.password = form.socksPass || "";
        landingProxy["skip-cert-verify"] = true;
        landingProxy["congestion-controller"] = "bbr";
      }
    }

    const cleanProxy = (node) => {
      if (!node) return node;
      const cleaned = { ...node };
      delete cleaned.latency;
      delete cleaned.lastCheck;
      delete cleaned.status;
      return cleaned;
    };

    const proxies = [...nodes.value.map(cleanProxy), cleanProxy(landingProxy)];
    const proxyNames = nodes.value.map((node) => node.name);
    const customRulesFromText = parseRules(form.customRulesText || "");

    const landingProxyNameValue = landingProxyName.value;
    const landingGroupNameValue = landingGroupName.value;
    const proxyGroupName = "🌐 代理出口";

    const replaceProxyGroupNames = (rule) =>
      rule
        .replace(/\{\{LANDING\}\}/g, landingGroupNameValue)
        .replace(/\{\{PROXY\}\}/g, proxyGroupName)
        // 兼容旧的策略组名称
        .replace(/[^,]*其他外网/g, proxyGroupName)
        .replace(/,Proxy$/g, `,${proxyGroupName}`);

    const processedDefaultRules = form.includeDefaultRules ? defaultRules.map(replaceProxyGroupNames) : [];

    const combinedRules = [
      ...customRules.value.map(replaceProxyGroupNames),
      ...customRulesFromText.map(replaceProxyGroupNames),
      ...processedDefaultRules,
    ];

    const domesticDnsList = form.domesticDns
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    const foreignDnsList = form.foreignDns
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    const ruleProvidersDef = {
      "ad-lite": {
        type: "http",
        behavior: "classical",
        url: "https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/AdvertisingLite/AdvertisingLite.yaml",
        path: "./ruleset/ad-lite.yaml",
        interval: 86400,
      },
      reject: {
        type: "http",
        behavior: "domain",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt",
        path: "./ruleset/reject.yaml",
        interval: 86400,
      },
      lan: {
        type: "http",
        behavior: "classical",
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list",
        path: "./ruleset/lan.yaml",
        interval: 86400,
      },
      unban: {
        type: "http",
        behavior: "classical",
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list",
        path: "./ruleset/unban.yaml",
        interval: 86400,
      },
      direct: {
        type: "http",
        behavior: "domain",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt",
        path: "./ruleset/direct.yaml",
        interval: 86400,
      },
      proxy: {
        type: "http",
        behavior: "domain",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt",
        path: "./ruleset/proxy.yaml",
        interval: 86400,
      },
      gfw: {
        type: "http",
        behavior: "domain",
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
        path: "./ruleset/gfw.yaml",
        interval: 86400,
      },
    };

    const ruleProviders = {};
    form.ruleProviders.forEach((key) => {
      if (ruleProvidersDef[key]) {
        ruleProviders[key] = ruleProvidersDef[key];
      }
    });

    const ruleProviderRules = [];

    if (form.ruleProviders.includes("ad-lite")) {
      ruleProviderRules.push("RULE-SET,ad-lite,REJECT");
    }
    if (form.ruleProviders.includes("reject")) {
      ruleProviderRules.push("RULE-SET,reject,REJECT");
    }
    if (form.ruleProviders.includes("lan")) {
      ruleProviderRules.push("RULE-SET,lan,DIRECT");
    }
    if (form.ruleProviders.includes("unban")) {
      ruleProviderRules.push("RULE-SET,unban,DIRECT");
    }
    if (form.ruleProviders.includes("direct")) {
      ruleProviderRules.push("RULE-SET,direct,DIRECT");
    }
    if (form.ruleProviders.includes("proxy")) {
      ruleProviderRules.push(`RULE-SET,proxy,${proxyGroupName}`);
    }
    if (form.ruleProviders.includes("gfw")) {
      ruleProviderRules.push(`RULE-SET,gfw,${proxyGroupName}`);
    }

    const finalRules = [...ruleProviderRules, ...combinedRules];

    const proxyGroups = [];

    if (!isSingleNode) {
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

    const autoSelectGroup = {
      name: "♻️ 自动选择",
      type: "url-test",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
    };

    const fallbackGroup = {
      name: "🛡️ 故障转移",
      type: "fallback",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 180,
    };

    const loadBalanceGroup = {
      name: "⚖️ 负载均衡",
      type: "load-balance",
      proxies: [...proxyNames],
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      strategy: "consistent-hashing",
    };

    proxyGroups.push(
      {
        name: landingGroupNameValue,
        type: "select",
        proxies: [landingProxyNameValue],
      },
      {
        name: proxyGroupName,
        type: "select",
        proxies: ["♻️ 自动选择", "🛡️ 故障转移", "⚖️ 负载均衡", ...proxyNames, landingProxyNameValue, "DIRECT"],
      },
      autoSelectGroup,
      fallbackGroup,
      loadBalanceGroup
    );

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
        "enhanced-mode": form.dnsMode,
        "default-nameserver": ["223.5.5.5", "119.29.29.29"],
        "fake-ip-range": "198.18.0.1/16",
        "fake-ip-filter":
          form.dnsMode === "fake-ip"
            ? [
                "*.lan",
                "*.local",
                "localhost",
                "*.localhost",
                "*.test",
                "*.invalid",
                "*.example",
                "time.*.com",
                "ntp.*.com",
                "*.ntp.org.cn",
                "+.stun.*.*",
                "+.stun.*.*.*",
                "*.msftconnecttest.com",
                "*.msftncsi.com",
                "*.srv.nintendo.net",
                "*.stun.playstation.net",
                "xbox.*.microsoft.com",
                "*.xboxlive.com",
                "*.battlenet.com.cn",
                "*.logon.battlenet.com.cn",
              ]
            : undefined,
        nameserver:
          domesticDnsList.length > 0
            ? domesticDnsList
            : ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
        fallback:
          foreignDnsList.length > 0
            ? foreignDnsList
            : [
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
      ...(Object.keys(ruleProviders).length > 0 ? { "rule-providers": ruleProviders } : {}),
      rules: finalRules,
    };

    yamlText.value = yaml.dump(config, {
      noRefs: true,
      lineWidth: 120,
      quotingType: '"',
    });

    if (generateClashImportUrl) {
      generateClashImportUrl();
    }

    setStatus("配置已生成，可复制或下载。", "success");
  };

  return {
    landingNode,
    parseLandingNodeUrl,
    selectedNodes,
    landingProxyName,
    landingGroupName,
    policyGroups,
    defaultRulesDisplay,
    generateYaml,
  };
};
