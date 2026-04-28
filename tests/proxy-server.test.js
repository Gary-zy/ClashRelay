import test from "node:test";
import assert from "node:assert/strict";
import { resolveRedirectUrl } from "../proxy-server.js";

test("相对重定向会基于原始订阅地址解析成绝对 URL", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "/api/final?token=1"
  );

  assert.equal(resolved, "https://example.com/api/final?token=1");
});

test("绝对重定向会保持原样", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "https://cdn.example.net/final"
  );

  assert.equal(resolved, "https://cdn.example.net/final");
});

test("非法重定向地址会返回 null，避免同步抛错", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "http://%zz"
  );

  assert.equal(resolved, null);
});

test("非 http(s) 重定向协议会被拒绝", () => {
  const resolved = resolveRedirectUrl(
    "https://example.com/api/subscription?token=1",
    "ftp://example.com/archive"
  );

  assert.equal(resolved, null);
});
