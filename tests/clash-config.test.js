import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClashConfig,
  buildSubscriptionOnlyConfig,
  buildLandingProxyFromForm,
  getFetchErrorMessage,
} from "../src/composables/useConfig.js";

const identity = (value) => ({ ...value });
const identityList = (values) => values.map((value) => ({ ...value }));

const createForm = (overrides = {}) => ({
  subscriptionUrl: "https://example.com/sub",
  proxyUrl: "http://localhost:8787",
  landingNodeUrl: "",
  landingNodeType: "socks5",
  socksServer: "1.2.3.4",
  socksPort: "1080",
  socksUser: "",
  socksPass: "",
  socksAlias: "落地节点",
  dialerProxyGroup: [],
  dialerProxyType: "url-test",
  urlTestInterval: 30,
  urlTestTolerance: 50,
  urlTestLazy: false,
  customRulesText: "",
  isDirect: false,
  ...overrides,
});

const sampleNodes = [
  { name: "HK-A", type: "ss", server: "hk.example.com", port: 443, cipher: "aes-128-gcm", password: "pw" },
  { name: "JP-B", type: "vmess", server: "jp.example.com", port: 443, uuid: "uuid-1", tls: true },
];

test("中转模式单跳板会给落地节点注入 dialer-proxy", () => {
  const result = buildClashConfig({
    form: createForm({ dialerProxyGroup: ["HK-A"] }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  const landingProxy = result.config.proxies.at(-1);
  assert.equal(landingProxy["dialer-proxy"], "HK-A");
  const proxyGroup = result.config["proxy-groups"].find((g) => g.name === "🌐 代理出口");
  assert.ok(proxyGroup);
  assert.ok(!proxyGroup.proxies.includes("落地节点"));
  assert.ok(proxyGroup.proxies.includes("♻️ 自动选择"));
  assert.ok(proxyGroup.proxies.includes("🛡️ 故障转移"));
  assert.ok(proxyGroup.proxies.includes("⚖️ 负载均衡"));
  assert.ok(proxyGroup.proxies.includes("HK-A"));
  assert.ok(proxyGroup.proxies.includes("JP-B"));
});

test("中转模式多跳板会生成前置跳板组", () => {
  const result = buildClashConfig({
    form: createForm({
      dialerProxyGroup: ["HK-A", "JP-B"],
      dialerProxyType: "fallback",
      urlTestInterval: 60,
      urlTestTolerance: 90,
    }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  const relayGroup = result.config["proxy-groups"][0];
  assert.equal(relayGroup.name, "🔀 前置跳板组");
  assert.equal(relayGroup.type, "fallback");
  assert.equal(relayGroup.interval, 60);
  assert.deepEqual(relayGroup.proxies, ["HK-A", "JP-B"]);
  const proxyGroup = result.config["proxy-groups"].find((group) => group.name === "🌐 代理出口");
  assert.ok(proxyGroup);
  assert.ok(proxyGroup.proxies.includes("♻️ 自动选择"));
  assert.ok(proxyGroup.proxies.includes("🛡️ 故障转移"));
  assert.ok(proxyGroup.proxies.includes("⚖️ 负载均衡"));
});

test("中转模式会过滤当前订阅里不存在的悬空跳板名", () => {
  const result = buildClashConfig({
    form: createForm({
      dialerProxyGroup: ["HK-A", "GHOST"],
      dialerProxyType: "fallback",
    }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  const relayGroup = result.config["proxy-groups"].find((group) => group.name === "🔀 前置跳板组");
  assert.equal(relayGroup, undefined);
  const landingProxy = result.config.proxies.at(-1);
  assert.equal(landingProxy["dialer-proxy"], "HK-A");
});

test("直连模式不要求跳板且不会注入 dialer-proxy", () => {
  const result = buildClashConfig({
    form: createForm({ isDirect: true }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.equal(result.config.proxies.length, 1);
  assert.equal("dialer-proxy" in result.config.proxies[0], false);
  assert.deepEqual(result.config["proxy-groups"][1].proxies, ["落地节点", "DIRECT"]);
});

test("中转模式的 AI 规则走落地节点，漏网规则走代理出口", () => {
  const result = buildClashConfig({
    form: createForm({ dialerProxyGroup: ["HK-A"] }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  const landingGroup = result.config["proxy-groups"].find((group) => group.name === "🎯 落地节点");
  const proxyGroup = result.config["proxy-groups"].find((group) => group.name === "🌐 代理出口");
  assert.deepEqual(landingGroup.proxies, ["落地节点"]);
  assert.ok(proxyGroup);
  assert.ok(!proxyGroup.proxies.includes("落地节点"));
  assert.ok(result.config.rules.includes("DOMAIN-SUFFIX,openai.com,🎯 落地节点"));
  assert.ok(result.config.rules.includes("MATCH,🌐 代理出口"));
});

test("复杂协议手填会被明确拦截", () => {
  const result = buildLandingProxyFromForm({
    form: createForm({
      landingNodeType: "vmess",
      socksServer: "manual.example.com",
      socksPort: "443",
    }),
    landingNode: null,
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /仅支持通过节点链接解析导入/);
});

test("自定义规则会排在默认规则前面且去重", () => {
  const result = buildClashConfig({
    form: createForm({
      isDirect: true,
      customRulesText: "DOMAIN-SUFFIX,google.com,DIRECT\nDOMAIN-SUFFIX,google.com,DIRECT",
    }),
    nodes: sampleNodes,
    landingNode: null,
    completeNode: identity,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  const firstGoogleRuleIndex = result.config.rules.findIndex((rule) => rule === "DOMAIN-SUFFIX,google.com,DIRECT");
  const secondGoogleRuleIndex = result.config.rules.findLastIndex((rule) => rule === "DOMAIN-SUFFIX,google.com,DIRECT");
  assert.equal(firstGoogleRuleIndex, secondGoogleRuleIndex);
  assert.equal(firstGoogleRuleIndex, 0);
});

test("订阅抓取错误提示会区分代理不可达和 404", () => {
  assert.match(
    getFetchErrorMessage({ usedProxy: true }),
    /代理服务没启动|代理地址不可用/
  );
  assert.match(
    getFetchErrorMessage({ responseStatus: 404, usedProxy: false }),
    /404/
  );
});

// ==================== subscription 模式测试 ====================

const createSubscriptionForm = (overrides = {}) => ({
  customRulesText: "",
  generateMode: "subscription",
  ...overrides,
});

test("subscription 模式无需落地节点也能生成配置", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm(),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(result.config.proxies.length > 0);
  assert.ok(result.config["proxy-groups"].length > 0);
  assert.ok(result.config.rules.length > 0);
});

test("subscription 模式默认导出全部订阅节点", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm(),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.equal(result.config.proxies.length, sampleNodes.length);
  const proxyNames = result.config.proxies.map((p) => p.name);
  assert.ok(proxyNames.includes("HK-A"));
  assert.ok(proxyNames.includes("JP-B"));
});

test("subscription 模式不含落地节点组和 dialer-proxy", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm(),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);

  const groupNames = result.config["proxy-groups"].map((g) => g.name);
  assert.ok(!groupNames.some((name) => name.includes("🎯")));

  result.config.proxies.forEach((proxy) => {
    assert.equal("dialer-proxy" in proxy, false);
  });

  assert.ok(groupNames.includes("🌐 代理出口"));
  assert.ok(groupNames.includes("♻️ 自动选择"));
  assert.ok(groupNames.includes("🛡️ 故障转移"));
  assert.ok(groupNames.includes("⚖️ 负载均衡"));
});

test("subscription 模式规则中不存在 LANDING 残留", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm(),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  result.config.rules.forEach((rule) => {
    assert.ok(!rule.includes("{{LANDING}}"), `规则中不应包含 {{LANDING}}：${rule}`);
    assert.ok(!rule.includes("🎯"), `规则中不应包含 🎯 落地节点：${rule}`);
  });
});

test("subscription 模式自定义规则可追加", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "DOMAIN-SUFFIX,example.com,🌐 代理出口\nDOMAIN-SUFFIX,test.com,DIRECT",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(result.config.rules.includes("DOMAIN-SUFFIX,example.com,🌐 代理出口"));
  assert.ok(result.config.rules.includes("DOMAIN-SUFFIX,test.com,DIRECT"));
  const customIndex = result.config.rules.indexOf("DOMAIN-SUFFIX,example.com,🌐 代理出口");
  assert.equal(customIndex, 0);
});

test("subscription 模式无节点时会拦截", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm(),
    nodes: [],
    completeNodes: identityList,
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /没有可用/);
});

test("subscription 模式会清理自定义规则中的落地节点引用", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "DOMAIN-SUFFIX,openai.com,🎯 我的VPS\nDOMAIN-SUFFIX,claude.ai,{{LANDING}}",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  // 所有自定义规则中的 🎯 和 {{LANDING}} 都应被替换为 🌐 代理出口
  result.config.rules.forEach((rule) => {
    assert.ok(!rule.includes("🎯"), `规则不应包含 🎯：${rule}`);
    assert.ok(!rule.includes("{{LANDING}}"), `规则不应包含 {{LANDING}}：${rule}`);
  });
  assert.ok(result.config.rules.includes("DOMAIN-SUFFIX,openai.com,🌐 代理出口"));
  assert.ok(result.config.rules.includes("DOMAIN-SUFFIX,claude.ai,🌐 代理出口"));
});

test("subscription 模式不会误改规则匹配值中的 🎯 文本", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      // 规则匹配值本身含有 🎯 文本，不应被替换
      customRulesText: "DOMAIN-KEYWORD,🎯test,DIRECT",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  // 匹配值中的 🎯 不应被替换，策略字段保持 DIRECT
  assert.ok(
    result.config.rules.includes("DOMAIN-KEYWORD,🎯test,DIRECT"),
    "匹配值中的 🎯 不应被误改"
  );
});

test("subscription 模式四段式规则的策略位也能被正确替换", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "IP-CIDR,8.8.8.8/32,🎯 我的VPS,no-resolve",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(
    result.config.rules.includes("IP-CIDR,8.8.8.8/32,🌐 代理出口,no-resolve"),
    "四段式规则的策略位应被替换且保留尾随参数"
  );
});

test("subscription 模式逻辑规则中嵌套逗号不会导致策略位错位", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "AND,((DOMAIN-SUFFIX,openai.com),(NETWORK,TCP)),🎯 我的VPS",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(
    result.config.rules.includes("AND,((DOMAIN-SUFFIX,openai.com),(NETWORK,TCP)),🌐 代理出口"),
    "逻辑规则的策略位应被正确替换，括号内逗号不应干扰"
  );
});

test("subscription 模式会正确替换 MATCH 规则中的落地策略", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "MATCH,🎯 我的VPS",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(
    result.config.rules.includes("MATCH,🌐 代理出口"),
    "MATCH 规则的策略位应被正确替换"
  );
});

test("subscription 模式不会误改非落地策略规则", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: "MATCH,DIRECT\nRULE-SET,ads,REJECT",
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(result.config.rules.includes("MATCH,DIRECT"));
  assert.ok(result.config.rules.includes("RULE-SET,ads,REJECT"));
});

test("subscription 模式 OR/NOT 逻辑规则中的落地策略也能被正确替换", () => {
  const result = buildSubscriptionOnlyConfig({
    form: createSubscriptionForm({
      customRulesText: [
        "OR,((DOMAIN-SUFFIX,linux.do),(DOMAIN-SUFFIX,v2ex.com)),🎯 我的VPS",
        "NOT,((DOMAIN-SUFFIX,example.com)),🎯 我的VPS",
      ].join("\n"),
    }),
    nodes: sampleNodes,
    completeNodes: identityList,
  });

  assert.equal(result.ok, true);
  assert.ok(
    result.config.rules.includes("OR,((DOMAIN-SUFFIX,linux.do),(DOMAIN-SUFFIX,v2ex.com)),🌐 代理出口"),
    "OR 逻辑规则的策略位应被正确替换"
  );
  assert.ok(
    result.config.rules.includes("NOT,((DOMAIN-SUFFIX,example.com)),🌐 代理出口"),
    "NOT 逻辑规则的策略位应被正确替换"
  );
});
