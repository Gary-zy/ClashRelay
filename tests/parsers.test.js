import test from "node:test";
import assert from "node:assert/strict";
import { parseProxyLine, parseSS } from "../src/utils/parsers.js";

test("SS 链接支持 IPv6 server", () => {
  const node = parseSS(
    "ss://YWVzLTEyOC1nY206cHc=@[2001:db8::1]:443#IPv6-SS",
    0
  );

  assert.ok(node);
  assert.equal(node.server, "2001:db8::1");
  assert.equal(node.port, 443);
  assert.equal(node.password, "pw");
  assert.equal(node.cipher, "aes-128-gcm");
});

test("SS SIP002 明文 userinfo 和 URL 编码密码能按 Verge 参数解析", () => {
  const node = parseSS("ss://aes-128-gcm:pa%40ss@ss.example.com:8443#SS-Plain", 0);

  assert.deepEqual(node, {
    name: "SS-Plain",
    type: "ss",
    server: "ss.example.com",
    port: 8443,
    cipher: "aes-128-gcm",
    password: "pa@ss",
  });
});

test("URL 解析协议的 IPv6 server 不保留方括号", () => {
  const node = parseProxyLine(
    "vless://44444444-4444-4444-4444-444444444444@[2001:db8::10]:443?encryption=none&security=tls&type=ws&path=%2Fipv6#VLESS%20IPv6",
    0
  );

  assert.equal(node.server, "2001:db8::10");
});

test("Hysteria/TUIC 显式非法端口会被拒绝，缺省端口才默认 443", () => {
  const invalidLines = [
    "hysteria://host:0?auth=x#bad-hysteria",
    "hysteria2://pass@host:0#bad-hysteria2",
    "tuic://uuid:pass@host:0#bad-tuic",
  ];

  invalidLines.forEach((line, index) => {
    assert.equal(parseProxyLine(line, index), null);
  });

  assert.equal(parseProxyLine("hysteria://host?auth=x#ok-hysteria", 0).port, 443);
  assert.equal(parseProxyLine("hysteria2://pass@host#ok-hysteria2", 1).port, 443);
  assert.equal(parseProxyLine("tuic://uuid:pass@host#ok-tuic", 2).port, 443);
});
