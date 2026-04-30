import test from "node:test";
import assert from "node:assert/strict";
import { ref } from "vue";
import { parseClashConfigNodes, useSubscription } from "../src/composables/useSubscription.js";

const createForm = (overrides = {}) => ({
  subscriptionUrl: "",
  proxyUrl: "",
  dialerProxyGroup: [],
  ...overrides,
});

test("完整 Clash 配置能提取 proxies 节点", () => {
  const result = parseClashConfigNodes(`
mixed-port: 7890
proxies:
  - name: Tokyo
    type: ss
    server: jp.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
proxy-groups:
  - name: Proxy
    type: select
    proxies: [Tokyo]
rules:
  - MATCH,Proxy
`);

  assert.equal(result.ok, true);
  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].name, "Tokyo");
  assert.equal(result.nodes[0].port, 443);
});

test("没有 proxies 的 Clash 配置会明确报 missing_proxies", () => {
  const result = parseClashConfigNodes(`
proxy-groups:
  - name: Proxy
    type: select
    proxies: [DIRECT]
rules:
  - MATCH,DIRECT
`);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_proxies");
});

test("非法 YAML 会报 invalid_yaml", () => {
  const result = parseClashConfigNodes("proxies: [name: broken");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_yaml");
});

test("从 Clash 配置导入节点会去重并裁剪悬空跳板", () => {
  const nodes = ref([]);
  const status = { message: "", type: "" };
  let saved = 0;
  const form = createForm({ dialerProxyGroup: ["Tokyo", "Ghost"] });
  const { importClashConfigText } = useSubscription({
    form,
    nodes,
    status,
    saveConfig: () => {
      saved += 1;
    },
  });

  const result = importClashConfigText(`
proxies:
  - name: Tokyo
    type: ss
    server: jp-a.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
  - name: Tokyo
    type: ss
    server: jp-b.example.com
    port: 8443
    cipher: aes-128-gcm
    password: pw
`);

  assert.equal(result.ok, true);
  assert.equal(saved, 1);
  assert.deepEqual(
    nodes.value.map((node) => ({ name: node.name, latency: node.latency })),
    [
      { name: "Tokyo", latency: -1 },
      { name: "Tokyo (1)", latency: -1 },
    ]
  );
  assert.deepEqual(form.dialerProxyGroup, ["Tokyo"]);
  assert.match(status.message, /已从 Clash 配置中导入 2 个节点/);
});

test("融合导入 Clash 配置会追加节点、加来源前缀并自动选入跳板", () => {
  const nodes = ref([]);
  const status = { message: "", type: "" };
  let saved = 0;
  const form = createForm({ dialerProxyGroup: [] });
  const { importMergedClashConfigText } = useSubscription({
    form,
    nodes,
    status,
    saveConfig: () => {
      saved += 1;
    },
  });

  const usResult = importMergedClashConfigText({
    text: `
proxies:
  - name: Node
    type: ss
    server: us.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
`,
    sourceName: "美国",
    sourcePrefix: "US",
  });

  const jpResult = importMergedClashConfigText({
    text: `
proxies:
  - name: Node
    type: ss
    server: jp.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
`,
    sourceName: "日本",
    sourcePrefix: "JP",
  });

  assert.equal(usResult.ok, true);
  assert.equal(jpResult.ok, true);
  assert.equal(saved, 2);
  assert.deepEqual(
    nodes.value.map((node) => ({
      name: node.name,
      sourceName: node.sourceName,
      sourcePrefix: node.sourcePrefix,
      latency: node.latency,
    })),
    [
      { name: "US - Node", sourceName: "美国", sourcePrefix: "US", latency: -1 },
      { name: "JP - Node", sourceName: "日本", sourcePrefix: "JP", latency: -1 },
    ]
  );
  assert.deepEqual(form.dialerProxyGroup, ["US - Node", "JP - Node"]);
  assert.match(status.message, /已融合导入 1 个日本节点/);
});

test("融合导入可先预览最终节点名和自动跳板选择，确认后才写入", () => {
  const nodes = ref([
    { name: "US - Node", type: "ss", server: "old.example.com", port: 443, cipher: "aes-128-gcm", password: "pw", latency: -1 },
  ]);
  const status = { message: "", type: "" };
  let saved = 0;
  const form = createForm({ dialerProxyGroup: ["US - Node"] });
  const { previewMergedClashConfigText, commitMergedClashConfigPreview } = useSubscription({
    form,
    nodes,
    status,
    saveConfig: () => {
      saved += 1;
    },
  });

  const preview = previewMergedClashConfigText({
    text: `
proxies:
  - name: Node
    type: ss
    server: us-new.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
`,
    sourceName: "美国",
    sourcePrefix: "US",
  });

  assert.equal(preview.ok, true);
  assert.equal(saved, 0);
  assert.deepEqual(nodes.value.map((node) => node.name), ["US - Node"]);
  assert.deepEqual(preview.summary, {
    sourceName: "美国",
    sourcePrefix: "US",
    importCount: 1,
  });
  assert.deepEqual(preview.nodes.map((node) => node.name), ["US - Node (1)"]);
  assert.deepEqual(preview.autoSelectNames, ["US - Node (1)"]);

  const committed = commitMergedClashConfigPreview(preview);

  assert.equal(committed.ok, true);
  assert.equal(saved, 1);
  assert.deepEqual(nodes.value.map((node) => node.name), ["US - Node", "US - Node (1)"]);
  assert.deepEqual(form.dialerProxyGroup, ["US - Node", "US - Node (1)"]);
  assert.match(status.message, /已融合导入 1 个美国节点/);
});

test("融合导入空来源名称会明确拦截", () => {
  const nodes = ref([]);
  const status = { message: "", type: "" };
  const form = createForm();
  const { importMergedClashConfigText } = useSubscription({
    form,
    nodes,
    status,
  });

  const result = importMergedClashConfigText({
    text: "proxies: []",
    sourceName: "",
    sourcePrefix: "",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_source");
  assert.match(status.message, /来源名称/);
});

test("手动粘贴支持 Base64 编码的 Clash YAML", () => {
  const nodes = ref([]);
  const status = { message: "", type: "" };
  const form = createForm();
  const { parseSubscription } = useSubscription({
    form,
    nodes,
    status,
  });

  const encoded = Buffer.from(`
proxies:
  - name: IPv6-Test
    type: ss
    server: 2001:db8::8
    port: 443
    cipher: aes-128-gcm
    password: pw
`).toString("base64");

  const parsed = parseSubscription(encoded);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "IPv6-Test");
  assert.equal(parsed[0].server, "2001:db8::8");
  assert.equal(parsed[0].port, 443);
});

test("作为订阅节点导入 Clash YAML 时会移除旧 dialer-proxy", () => {
  const result = parseClashConfigNodes(`
proxies:
  - name: Chained
    type: ss
    server: chained.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
    dialer-proxy: old-group
`);

  assert.equal(result.ok, true);
  assert.equal("dialer-proxy" in result.nodes[0], false);
});

test("作为 golden fixture 读取 Clash YAML 时可保留旧 dialer-proxy", () => {
  const result = parseClashConfigNodes(`
proxies:
  - name: Chained
    type: ss
    server: chained.example.com
    port: 443
    cipher: aes-128-gcm
    password: pw
    dialer-proxy: old-group
`, { preserveDialerProxy: true });

  assert.equal(result.ok, true);
  assert.equal(result.nodes[0]["dialer-proxy"], "old-group");
});
