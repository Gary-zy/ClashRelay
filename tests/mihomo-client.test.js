import test from "node:test";
import assert from "node:assert/strict";
import { createMihomoClient, getMihomoFriendlyErrorMessage } from "../src/utils/mihomoClient.js";

test("mihomo client checkConfig 会携带服务令牌和 YAML", async () => {
  const calls = [];
  const client = createMihomoClient({
    baseUrl: "http://relaybox.test",
    token: "secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ ok: true, message: "ok", errors: [] }),
      };
    },
  });

  const result = await client.checkConfig("proxies: []");

  assert.deepEqual(result, { ok: true, message: "ok", errors: [] });
  assert.equal(calls[0].url, "http://relaybox.test/mihomo/check");
  assert.equal(calls[0].options.headers.authorization, "Bearer secret");
  assert.deepEqual(JSON.parse(calls[0].options.body), { yamlText: "proxies: []" });
});

test("mihomo client benchmarkPolicies 会发送策略组和出口 IP 开关", async () => {
  const calls = [];
  const client = createMihomoClient({
    baseUrl: "",
    token: "secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ ok: true, results: [] }),
      };
    },
  });

  await client.benchmarkPolicies({
    yamlText: "proxies: []",
    policies: ["🇺🇸 美国"],
    includeExitIp: false,
  });

  assert.equal(calls[0].url, "/mihomo/benchmark");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    yamlText: "proxies: []",
    policies: ["🇺🇸 美国"],
    includeExitIp: false,
  });
});

test("mihomo 错误提示会指向下一步处理动作", () => {
  assert.match(getMihomoFriendlyErrorMessage("Unauthorized"), /服务令牌/);
  assert.match(getMihomoFriendlyErrorMessage("mihomo 不可用，请在镜像中安装 mihomo 或设置 MIHOMO_BIN"), /MIHOMO_BIN/);
  assert.match(getMihomoFriendlyErrorMessage("测速任务繁忙，请稍后再试"), /稍后/);
  assert.match(getMihomoFriendlyErrorMessage("mihomo controller 启动超时"), /启动超时/);
  assert.match(getMihomoFriendlyErrorMessage("代理 CONNECT 失败"), /出口 IP/);
});
