import test from "node:test";
import assert from "node:assert/strict";
import { buildConfigHealthReport } from "../src/utils/configHealth.js";

const relayConfig = () => ({
  mode: "rule",
  proxies: [
    { name: "US - A", type: "ss", server: "us.example.com", port: 443 },
    { name: "落地节点", type: "socks5", server: "1.2.3.4", port: 1080, "dialer-proxy": "🔀 前置跳板组" },
  ],
  "proxy-groups": [
    { name: "🔀 前置跳板组", type: "select", proxies: ["US - A"] },
    { name: "🎯 落地节点", type: "select", proxies: ["落地节点"] },
    { name: "🌐 代理出口", type: "select", proxies: ["🎯 落地节点", "DIRECT"] },
  ],
  rules: ["MATCH,🌐 代理出口"],
});

test("配置体检报告汇总数量、模式和 relay 链路", () => {
  const report = buildConfigHealthReport(relayConfig());

  assert.deepEqual(report.summary, {
    proxyCount: 2,
    proxyGroupCount: 3,
    ruleCount: 1,
    mode: "relay",
    status: "ok",
  });
  assert.deepEqual(report.routeChain, ["🔀 前置跳板组", "🎯 落地节点", "🌐 代理出口"]);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.warnings, []);
});

test("配置体检报告识别 subscription 模式", () => {
  const report = buildConfigHealthReport({
    mode: "rule",
    proxies: [{ name: "HK-A", type: "ss", server: "hk.example.com", port: 443 }],
    "proxy-groups": [
      { name: "🌐 代理出口", type: "select", proxies: ["HK-A", "DIRECT"] },
    ],
    rules: ["MATCH,🌐 代理出口"],
  });

  assert.equal(report.summary.mode, "subscription");
  assert.deepEqual(report.routeChain, ["🌐 代理出口"]);
});

test("配置体检报告把无效配置和悬空引用列为阻断问题", () => {
  const emptyReport = buildConfigHealthReport(null);
  assert.equal(emptyReport.summary.status, "blocked");
  assert.match(emptyReport.issues[0].message, /还没有生成/);

  const broken = relayConfig();
  broken["proxy-groups"][0].proxies = ["GHOST"];
  const brokenReport = buildConfigHealthReport(broken);
  assert.equal(brokenReport.summary.status, "blocked");
  assert.ok(brokenReport.issues.some((issue) => /不存在的策略 GHOST/.test(issue.message)));
});

test("配置体检报告发现重复代理名", () => {
  const config = relayConfig();
  config.proxies.push({ name: "US - A", type: "ss", server: "us2.example.com", port: 443 });

  const report = buildConfigHealthReport(config);

  assert.equal(report.summary.status, "blocked");
  assert.ok(report.issues.some((issue) => /重复代理名：US - A/.test(issue.message)));
});
