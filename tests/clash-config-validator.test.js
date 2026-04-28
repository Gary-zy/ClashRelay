import test from "node:test";
import assert from "node:assert/strict";
import {
  getAvailablePolicies,
  validateClashConfig,
} from "../src/utils/clashConfigValidator.js";

const baseConfig = () => ({
  proxies: [
    { name: "HK-A", type: "ss", server: "hk.example.com", port: 443, cipher: "aes-128-gcm", password: "pw" },
    { name: "落地节点", type: "socks5", server: "1.2.3.4", port: 1080, "dialer-proxy": "HK-A" },
  ],
  "proxy-groups": [
    { name: "🎯 落地节点", type: "select", proxies: ["落地节点"] },
    { name: "🌐 代理出口", type: "select", proxies: ["🎯 落地节点", "DIRECT"] },
  ],
  rules: ["MATCH,🌐 代理出口"],
});

test("有效 Clash 配置健康校验通过", () => {
  const result = validateClashConfig(baseConfig());

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.ok(getAvailablePolicies(baseConfig()).has("🌐 代理出口"));
});

test("配置健康校验能发现重复名和悬空引用", () => {
  const config = baseConfig();
  config.proxies.push({ name: "HK-A", type: "ss", server: "hk-b.example.com", port: 443 });
  config["proxy-groups"][1].proxies.push("不存在的策略");
  config.rules.push("DOMAIN-SUFFIX,example.com,不存在的策略");

  const result = validateClashConfig(config);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("重复代理名")));
  assert.ok(result.errors.some((error) => error.includes("代理组 🌐 代理出口 引用了不存在的策略 不存在的策略")));
  assert.ok(result.errors.some((error) => error.includes("规则引用了不存在的策略 不存在的策略")));
});
