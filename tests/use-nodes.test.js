import test from "node:test";
import assert from "node:assert/strict";
import { reactive } from "vue";
import { useNodes } from "../src/composables/useNodes.js";

test("隐藏提示项时可见节点会同步排除提示节点", () => {
  const form = reactive({
    isDirect: false,
    proxyUrl: "",
    dialerProxyGroup: [],
  });
  const status = { message: "", type: "" };

  const {
    nodes,
    visibleNodes,
    informationalNodeCount,
    hideInformationalNodes,
  } = useNodes({ form, status });

  nodes.value = [
    { name: "剩余流量：329.98 GB", type: "vmess", server: "a.example.com", port: 443, latency: -1 },
    { name: "⚡️🇯🇵 日本1丨4x", type: "ss", server: "b.example.com", port: 443, latency: -1 },
    { name: "🪧 官网 : 性价比机场.net", type: "vmess", server: "c.example.com", port: 443, latency: -1 },
  ];

  assert.equal(informationalNodeCount.value, 2);
  assert.deepEqual(visibleNodes.value.map((node) => node.name), ["⚡️🇯🇵 日本1丨4x"]);

  hideInformationalNodes.value = false;
  assert.equal(visibleNodes.value.length, 3);
});
