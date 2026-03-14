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

