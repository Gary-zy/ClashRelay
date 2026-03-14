import test from "node:test";
import assert from "node:assert/strict";
import { countInformationalNodes, isInformationalNodeName } from "../src/utils/nodeMetadata.js";

test("能识别流量和到期提示节点名", () => {
  assert.equal(isInformationalNodeName("剩余流量：329.98 GB"), true);
  assert.equal(isInformationalNodeName("距离下次重置剩余：11 天"), true);
  assert.equal(isInformationalNodeName("套餐到期：2026-04-25"), true);
});

test("能识别公告和官网提示节点名", () => {
  assert.equal(isInformationalNodeName("🪧 官网 : 性价比机场.net"), true);
  assert.equal(isInformationalNodeName("🪧 不可用请软件内更新订阅或官网看问题排查"), true);
});

test("普通地区节点不会被误判成提示节点", () => {
  assert.equal(isInformationalNodeName("⚡️🇯🇵 日本1丨4x"), false);
  assert.equal(isInformationalNodeName("🇭🇰 香港1 (移动>联通>电信)"), false);
  assert.equal(
    countInformationalNodes([
      { name: "剩余流量：329.98 GB" },
      { name: "⚡️🇯🇵 日本1丨4x" },
      { name: "🪧 官网 : 性价比机场.net" },
    ]),
    2
  );
});
