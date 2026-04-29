import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("App 卸载前会 flush 待写入的 localStorage 配置", async () => {
  const source = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(source, /const persistConfigNow = \(\) => \{/);
  assert.match(
    source,
    /onBeforeUnmount\(\(\) => \{[\s\S]*if \(localStorageTimer\) \{[\s\S]*persistConfigNow\(\);[\s\S]*\}/
  );
});
