import test from "node:test";
import assert from "node:assert/strict";
import { defaultRules, subscriptionDefaultRules } from "../src/config/defaultConfig.js";

test("默认 AI 规则补齐常见国外服务并保持国产服务直连", () => {
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,openrouter.ai,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,v0.dev,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,windsurf.com,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,codeium.com,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,bolt.new,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,lovable.dev,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,fal.ai,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,deepinfra.com,{{LANDING}}"));
  assert.ok(defaultRules.includes("DOMAIN-SUFFIX,minimax.io,DIRECT"));
});

test("默认 AI 规则移除过宽的共享基础设施与泛 Google 兜底", () => {
  assert.equal(defaultRules.includes("DOMAIN-SUFFIX,todesktop.com,{{LANDING}}"), false);
  assert.equal(defaultRules.includes("DOMAIN-SUFFIX,auth0.com,{{LANDING}}"), false);
  assert.equal(defaultRules.includes("DOMAIN-SUFFIX,quora.com,{{LANDING}}"), false);
  assert.equal(defaultRules.includes("DOMAIN-KEYWORD,google,{{LANDING}}"), false);
  assert.equal(defaultRules.includes("DOMAIN-SUFFIX,google.com,{{LANDING}}"), false);
});

test("subscription 模式的默认规则同步补齐 AI 服务域名", () => {
  assert.ok(subscriptionDefaultRules.includes("DOMAIN-SUFFIX,openrouter.ai,{{PROXY}}"));
  assert.ok(subscriptionDefaultRules.includes("DOMAIN-SUFFIX,v0.dev,{{PROXY}}"));
  assert.ok(subscriptionDefaultRules.includes("DOMAIN-SUFFIX,windsurf.com,{{PROXY}}"));
  assert.ok(subscriptionDefaultRules.includes("DOMAIN-SUFFIX,lovable.dev,{{PROXY}}"));
  assert.ok(subscriptionDefaultRules.includes("DOMAIN-SUFFIX,minimax.io,DIRECT"));
});
