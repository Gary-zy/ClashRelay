import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRuleCandidate,
  buildRulePolicyOptions,
  buildRuleHelperSuggestions,
  RULE_ASSISTANT_SITE_GROUPS,
} from "../src/utils/ruleAssistant.js";

test("网址输入会生成关键词、后缀和精确域名候选", () => {
  const result = buildRuleHelperSuggestions("https://chat.openai.com/", "🌐 代理出口");
  const lines = result.candidates.map((candidate) => candidate.line);

  assert.deepEqual(lines, [
    "DOMAIN-KEYWORD,openai,🌐 代理出口",
    "DOMAIN-SUFFIX,openai.com,🌐 代理出口",
    "DOMAIN,chat.openai.com,🌐 代理出口",
  ]);
});

test("纯域名输入默认走代理出口并保留关键词候选", () => {
  const result = buildRuleHelperSuggestions("linux.do", "🌐 代理出口");
  const lines = result.candidates.map((candidate) => candidate.line);

  assert.ok(lines.includes("DOMAIN-KEYWORD,linux,🌐 代理出口"));
  assert.ok(lines.includes("DOMAIN-SUFFIX,linux.do,🌐 代理出口"));
  assert.ok(lines.includes("DOMAIN,linux.do,🌐 代理出口"));
});

test("带通用前缀的子域名仍至少保留后缀和精确域名候选", () => {
  const result = buildRuleHelperSuggestions("api.deepseek.com", "🌐 代理出口");
  const lines = result.candidates.map((candidate) => candidate.line);

  assert.ok(lines.includes("DOMAIN-SUFFIX,deepseek.com,🌐 代理出口"));
  assert.ok(lines.includes("DOMAIN,api.deepseek.com,🌐 代理出口"));
});

test("相同规则会被识别为完全重复", () => {
  const analysis = analyzeRuleCandidate("DOMAIN-SUFFIX,example.com,🌐 代理出口", [
    "DOMAIN-SUFFIX,example.com,🌐 代理出口",
  ]);

  assert.equal(analysis.exactDuplicate, true);
});

test("精确域名候选会提示已存在更宽泛规则", () => {
  const analysis = analyzeRuleCandidate("DOMAIN,api.example.com,🌐 代理出口", [
    "DOMAIN-SUFFIX,example.com,🌐 代理出口",
  ]);

  assert.equal(analysis.broaderMatches.length, 1);
  assert.match(analysis.broaderMatches[0], /DOMAIN-SUFFIX,example\.com/);
});

test("后缀规则候选会提示已存在更精确规则", () => {
  const analysis = analyzeRuleCandidate("DOMAIN-SUFFIX,openai.com,🌐 代理出口", [
    "DOMAIN,chat.openai.com,🌐 代理出口",
  ]);

  assert.equal(analysis.narrowerMatches.length, 1);
  assert.match(analysis.narrowerMatches[0], /DOMAIN,chat\.openai\.com/);
});

test("relay 模式的规则目标分成推荐和高级两层，且不暴露前置跳板组", () => {
  const groups = buildRulePolicyOptions({
    mode: "relay",
    landingPolicyName: "🎯 我的落地",
  });
  const options = groups.flatMap((group) => group.options);
  const values = options.map((option) => option.value);

  assert.deepEqual(groups.map((group) => group.label), ["推荐目标", "高级目标"]);
  assert.ok(values.includes("🌐 代理出口"));
  assert.ok(values.includes("🎯 我的落地"));
  assert.ok(values.includes("DIRECT"));
  assert.ok(values.includes("♻️ 自动选择"));
  assert.ok(values.includes("🛡️ 故障转移"));
  assert.ok(values.includes("⚖️ 负载均衡"));
  assert.ok(!values.includes("🔀 前置跳板组"));
});

test("AI 服务快捷站点默认标记为落地策略，普通站点默认标记为代理出口", () => {
  const openai = RULE_ASSISTANT_SITE_GROUPS[0].items.find((item) => item.domain === "openai.com");
  const github = RULE_ASSISTANT_SITE_GROUPS[1].items.find((item) => item.domain === "github.com");

  assert.equal(openai.policyKind, "landing");
  assert.equal(github.policyKind, "proxy");
});
