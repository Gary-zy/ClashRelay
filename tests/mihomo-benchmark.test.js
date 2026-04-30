import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMihomoService,
  getMedianDelay,
  normalizeBenchmarkRequest,
  parseExitTrace,
} from "../src/server/mihomoBenchmark.js";
import { getBenchmarkPoliciesFromConfig } from "../src/utils/mihomoPolicies.js";

test("mihomo 延迟取成功样本中位数，失败样本不污染结果", () => {
  assert.equal(getMedianDelay([120, null, 80, -1, 100]), 100);
  assert.equal(getMedianDelay([null, -1]), null);
});

test("benchmark 请求会限制轮数、策略组数量和默认测速 URL", () => {
  const normalized = normalizeBenchmarkRequest({
    yamlText: "proxies: []",
    policies: ["🇺🇸 美国", "🇯🇵 日本"],
    rounds: 99,
  });

  assert.equal(normalized.yamlText, "proxies: []");
  assert.deepEqual(normalized.policies, ["🇺🇸 美国", "🇯🇵 日本"]);
  assert.equal(normalized.rounds, 3);
  assert.equal(normalized.testUrl, "https://www.gstatic.com/generate_204");
  assert.equal(normalized.includeExitIp, true);
});

test("benchmark 请求超过 20 个策略组会被拒绝", () => {
  assert.throws(
    () => normalizeBenchmarkRequest({
      yamlText: "proxies: []",
      policies: Array.from({ length: 21 }, (_, index) => `P${index}`),
    }),
    /最多/
  );
});

test("mihomo 不可用时 benchmark 不会泄漏并发名额", async () => {
  const service = createMihomoService({
    mihomoBin: join(tmpdir(), `relaybox-missing-mihomo-${Date.now()}`),
  });
  const payload = {
    yamlText: "proxies: []",
    policies: ["🌐 代理出口"],
  };

  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(
      () => service.benchmarkPolicies(payload),
      (error) => !/测速任务繁忙/.test(error.message)
    );
  }
});

test("策略组提取优先保留最终可选出口并排除技术组", () => {
  const policies = getBenchmarkPoliciesFromConfig({
    "proxy-groups": [
      { name: "🌐 代理出口", type: "select", proxies: ["🇺🇸 美国"] },
      { name: "🇺🇸 美国", type: "select", proxies: ["US - A"] },
      { name: "🇯🇵 日本", type: "select", proxies: ["JP - A"] },
      { name: "🔀 前置跳板组", type: "select", proxies: ["US - A"] },
      { name: "♻️ 自动选择", type: "url-test", proxies: ["US - A"] },
    ],
  });

  assert.deepEqual(policies, ["🌐 代理出口", "🇺🇸 美国", "🇯🇵 日本"]);
});

test("出口 trace 会提取 IP 和机房信息", () => {
  assert.deepEqual(parseExitTrace("ip=1.2.3.4\ncolo=NRT\nloc=JP\n"), {
    exitIp: "1.2.3.4",
    country: "JP",
    colo: "NRT",
    rawTrace: "ip=1.2.3.4\ncolo=NRT\nloc=JP\n",
  });
});
