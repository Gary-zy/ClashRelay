import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseProxyLine } from "../src/utils/parsers.js";

test("订阅链接解析结果和 Clash Verge golden proxies 逐字段一致", async () => {
  const [input, goldenRaw] = await Promise.all([
    readFile(new URL("./fixtures/verge/basic.input.txt", import.meta.url), "utf8"),
    readFile(new URL("./fixtures/verge/basic.golden-proxies.json", import.meta.url), "utf8"),
  ]);
  const golden = JSON.parse(goldenRaw);
  const parsed = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseProxyLine(line, index));

  assert.deepEqual(parsed, golden);
});
