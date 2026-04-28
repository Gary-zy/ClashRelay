import test from "node:test";
import assert from "node:assert/strict";
import { parseSS } from "../src/utils/parsers.js";

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
