import test from "node:test";
import assert from "node:assert/strict";
import { highlightYaml } from "../src/utils/helpers.js";

test("highlightYaml 不会重写自己生成的 span 属性", () => {
  const html = highlightYaml('name: "HK Node"');

  assert.equal(html.includes("class=<span"), false);
  assert.match(html, /<span class="yaml-key">name<\/span>:/);
  assert.match(html, /<span class="yaml-string">"HK Node"<\/span>/);
});

test("highlightYaml 只高亮引号外的 YAML 注释", () => {
  const quotedHash = highlightYaml('password: "my # pass"');
  const realComment = highlightYaml("password: value # comment");

  assert.equal(quotedHash.includes("yaml-comment"), false);
  assert.match(realComment, /<span class="yaml-comment"> # comment<\/span>/);
});
