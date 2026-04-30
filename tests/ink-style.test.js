import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourceFiles = [
  "../src/styles.css",
  "../src/App.vue",
  "../src/components/OnboardingWizard.vue",
  "../src/components/SelectionTray.vue",
  "../src/components/InkLoading.vue",
  "../src/components/ConfigHealthPanel.vue",
];

const forbiddenModernColors = [
  "#409eff",
  "#3b82f6",
  "#1e40af",
  "#7dd3fc",
  "#86efac",
  "#22c55e",
  "#67c23a",
  "#f56c6c",
  "#ef4444",
  "#c4b5fd",
  "rgba(59, 130, 246",
  "rgba(34, 197, 94",
  "rgba(239, 68, 68",
  "rgba(24, 50, 112",
];

test("水墨主题不再混入默认科技色和 emoji 图标", async () => {
  const entries = await Promise.all(
    sourceFiles.map(async (path) => [
      path,
      await readFile(new URL(path, import.meta.url), "utf8"),
    ]),
  );
  const combined = entries.map(([path, content]) => `\n/* ${path} */\n${content}`).join("\n");

  for (const color of forbiddenModernColors) {
    assert.ok(!combined.toLowerCase().includes(color), `found forbidden modern color ${color}`);
  }

  assert.ok(!combined.includes("🔗"), "onboarding logo should use an icon component instead of emoji");
  assert.ok(!combined.includes("🎉"), "completion state should use an icon component instead of emoji");
});

test("水墨主题补齐被组件引用的自定义 token", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  for (const token of [
    "--ink-400",
    "--ink-500",
    "--accent-400",
    "--status-ok",
    "--status-warning",
    "--status-danger",
    "--status-info",
  ]) {
    assert.match(styles, new RegExp(`${token}\\s*:`), `missing ${token}`);
  }
});

test("水墨工作台自定义控件保留键盘与窄屏可用性", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /:aria-pressed="currentWorkbenchMode === mode\.key"/);
  assert.match(app, /role="tablist"/);
  assert.match(app, /role="tab"/);
  assert.match(app, /:aria-selected="activeWorkspaceTab === tab\.key"/);
  assert.match(app, /:aria-selected="activeOutputTab === 'rules'"/);
  assert.match(app, /:aria-selected="activeOutputTab === 'preview'"/);
  assert.match(app, /\.mode-pill:focus-visible/);
  assert.match(app, /\.rule-snippet-chip:focus-visible/);
  assert.match(app, /\.dashboard-right\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(app, /\.output-target-group\s+:deep\(\.el-radio-group\)/);
  assert.doesNotMatch(app, /\.sticky-action-bar\s*\{/);
  assert.doesNotMatch(app, /\.mode-card/);
});

test("水墨组件减少玻璃拟态和现代弹跳动效", async () => {
  const selectionTray = await readFile(new URL("../src/components/SelectionTray.vue", import.meta.url), "utf8");
  const inkLoading = await readFile(new URL("../src/components/InkLoading.vue", import.meta.url), "utf8");
  const onboarding = await readFile(new URL("../src/components/OnboardingWizard.vue", import.meta.url), "utf8");

  assert.match(selectionTray, /<button[\s\S]*class="node-tag"/);
  assert.match(selectionTray, /:aria-label="`移除跳板节点 \$\{node\.name\}`"/);
  assert.match(selectionTray, /\.node-tag:focus-visible/);
  assert.doesNotMatch(selectionTray, /transition:\s*all/);
  assert.doesNotMatch(selectionTray, /scale\(/);
  assert.doesNotMatch(selectionTray, /@keyframes\s+bounce/);
  assert.doesNotMatch(inkLoading, /backdrop-filter/);
  assert.match(onboarding, /<button type="button" class="action-item"/);
  assert.match(onboarding, /\.action-item:focus-visible/);
});
