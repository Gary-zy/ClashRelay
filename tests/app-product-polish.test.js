import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("App 接入配置体检、mihomo 历史和融合导入预览", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");
  const panel = await readFile(new URL("../src/components/ConfigHealthPanel.vue", import.meta.url), "utf8");

  assert.match(app, /<ConfigHealthPanel\s+:report="configHealthReport"\s*\/>/);
  assert.match(app, /MIHOMO_BENCHMARK_HISTORY_KEY/);
  assert.match(app, /mergeImportPreview/);
  assert.match(app, /confirmMergedClashConfigImport/);
  assert.match(app, /outputTarget:\s*"clash"/);
  assert.match(app, /output-target-group/);
  assert.match(app, /<el-radio-button\s+:value="OUTPUT_TARGETS\.CLASH"/);
  assert.match(app, /<el-radio-button\s+:value="OUTPUT_TARGETS\.SHADOWROCKET"/);
  assert.match(app, /Shadowrocket 小火箭/);
  assert.match(app, /shadowrocket\.yaml/);
  assert.match(app, /config\.yaml/);
  assert.doesNotMatch(
    app,
    /form\.customRulesText,\s*form\.outputTarget,/,
    "切换导出客户端只改变文案和文件名，不应清空已生成 YAML"
  );
  assert.match(panel, /配置体检/);
  assert.match(panel, /链路摘要/);
});

test("工作区导航不被 activeStep 自动抢走", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /@click="goToWorkspaceTab\(tab\.key\)"/);
  const activeStepWatch = app.match(/watch\(activeStep,[\s\S]*?\n\}\);/);
  assert.ok(activeStepWatch, "App 应保留 activeStep watcher 用于状态提示和移动端展开");
  assert.doesNotMatch(
    activeStepWatch[0],
    /activeWorkspaceTab\.value\s*=\s*step/,
    "activeStep 变化不应直接切换用户当前工作区 tab"
  );
});

test("主动导入节点成功后进入节点工作区", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");
  const subscription = await readFile(new URL("../src/composables/useSubscription.js", import.meta.url), "utf8");
  const interactionSpec = await readFile(new URL("../specs/business/前端交互规范.md", import.meta.url), "utf8");

  assert.match(subscription, /return applyImportedNodes\(parsed/);

  const fetchHandler = app.match(/const handleFetchWithLoading = async \(\) => \{[\s\S]*?\n\};/);
  assert.ok(fetchHandler, "App 应有获取订阅的 loading 包装函数");
  assert.match(fetchHandler[0], /result = await handleFetch\(\)/);
  assert.match(fetchHandler[0], /if \(result\?\.ok\) \{\s*goToWorkspaceTab\("nodes"\);\s*\}/);

  const manualPasteHandler = app.match(/const handleManualPaste = \(\) => \{[\s\S]*?\n\};/);
  assert.ok(manualPasteHandler, "App 应有手动粘贴导入函数");
  assert.match(manualPasteHandler[0], /goToWorkspaceTab\("nodes"\)/);

  const clashImportHandler = app.match(/const handleClashConfigImport = \(\) => \{[\s\S]*?\n\};/);
  assert.ok(clashImportHandler, "App 应有 Clash 配置导入函数");
  assert.match(clashImportHandler[0], /goToWorkspaceTab\("nodes"\)/);

  const mergeConfirmHandler = app.match(/const confirmMergedClashConfigImport = \(\) => \{[\s\S]*?\n\};/);
  assert.ok(mergeConfirmHandler, "App 应有融合导入确认函数");
  assert.match(mergeConfirmHandler[0], /goToWorkspaceTab\("nodes"\)/);

  assert.match(interactionSpec, /主动导入节点成功后应切到节点工作区/);
});

test("公网 Web 部署默认通过同源代理抓订阅", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /const getDefaultProxyUrl = \(\) =>/);
  assert.match(app, /window\.location\?\.origin/);
  assert.match(app, /proxyUrl:\s*defaultProxyUrl/);
  assert.match(
    app,
    /if \(!result\.proxyUrl && defaultProxyUrl\) \{\s*result\.proxyUrl = defaultProxyUrl;\s*\}/,
    "生产环境本地存档为空时，也要恢复到当前站点代理，避免直连订阅源触发 CORS"
  );
});

test("订阅地址输入不保留历史缓存", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");
  const subscription = await readFile(new URL("../src/composables/useSubscription.js", import.meta.url), "utf8");
  const dataSpec = await readFile(new URL("../specs/business/数据模型与状态.md", import.meta.url), "utf8");
  const moduleSpec = await readFile(new URL("../specs/business/模块职责.md", import.meta.url), "utf8");
  const analysisSpec = await readFile(new URL("../specs/analysis/当前代码结构盘点.md", import.meta.url), "utf8");
  const interactionSpec = await readFile(new URL("../specs/business/前端交互规范.md", import.meta.url), "utf8");

  assert.doesNotMatch(app, /el-autocomplete/);
  assert.match(app, /autocomplete="off"/);
  assert.doesNotMatch(app, /querySubscriptionHistory|removeHistoryItem/);
  const persistedKeysBlock = app.match(/const persistedKeys = \[[\s\S]*?\];/);
  assert.ok(persistedKeysBlock, "App 应有主配置持久化字段列表");
  assert.doesNotMatch(persistedKeysBlock[0], /subscriptionUrl/);
  const assignFormSafelyBlock = app.match(/const assignFormSafely = \(target, source\) => \{[\s\S]*?\n\};/);
  assert.ok(assignFormSafelyBlock, "App 应有安全恢复表单函数");
  assert.match(assignFormSafelyBlock[0], /key === "subscriptionUrl"/);
  assert.doesNotMatch(subscription, /clashrelay_history|subscriptionHistory|saveSubscriptionHistory/);
  assert.doesNotMatch(dataSpec, /clashrelay_history|订阅历史|subscriptionHistory/);
  assert.match(dataSpec, /`subscriptionUrl` 不进入 `clashrelay_config`/);
  assert.doesNotMatch(moduleSpec, /订阅历史|subscriptionHistory/);
  assert.doesNotMatch(analysisSpec, /订阅历史|subscriptionHistory/);
  assert.match(interactionSpec, /订阅 URL 输入框不提供历史下拉/);
  assert.match(interactionSpec, /浏览器自动补全/);
});

test("生成后预览优先展示在配置体检和 mihomo 面板之前", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  const previewIndex = app.indexOf('class="yaml-section"');
  const healthIndex = app.indexOf("<ConfigHealthPanel");
  const mihomoIndex = app.indexOf('class="mihomo-panel"');

  assert.notEqual(previewIndex, -1);
  assert.notEqual(healthIndex, -1);
  assert.notEqual(mihomoIndex, -1);
  assert.ok(previewIndex < healthIndex, "YAML 预览应排在配置体检之前");
  assert.ok(previewIndex < mihomoIndex, "YAML 预览应排在 mihomo 校验之前");
});

test("中转节点选择使用显式 checkbox 且行点击不再误导", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");
  const nodes = await readFile(new URL("../src/composables/useNodes.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(app, /class="node-selection-checkbox"/);
  assert.match(app, /<el-checkbox[\s\S]*:model-value="form\.dialerProxyGroup\.includes\(row\.name\)"/);
  assert.match(app, /@change="toggleNodeSelection\(row\)"/);
  assert.doesNotMatch(app, /@row-click=/);
  assert.match(nodes, /const toggleNodeSelection = \(row\) =>/);
  assert.doesNotMatch(styles, /\.el-table\s+\.el-table__row\s*\{[\s\S]*?cursor:\s*pointer/);
});

test("移动端主流程改为自然页面滚动", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(styles, /@media \(max-width: 900px\) \{[\s\S]*\.ink-bg\s*\{[\s\S]*height:\s*auto/);
  assert.match(styles, /@media \(max-width: 900px\) \{[\s\S]*\.ink-bg\s*\{[\s\S]*min-height:\s*100dvh/);
  assert.match(styles, /@media \(max-width: 900px\) \{[\s\S]*\.ink-bg\s*\{[\s\S]*overflow-y:\s*auto/);

  assert.match(app, /@media \(max-width: 900px\) \{[\s\S]*\.layout-flow\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(app, /@media \(max-width: 900px\) \{[\s\S]*\.step-body\s*\{[\s\S]*overflow:\s*visible/);
});

test("桌面节点长列表使用页面外层滚动", async () => {
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.doesNotMatch(app, /<el-table[\s\S]*height="400"/);
  assert.match(styles, /\.ink-bg\s*\{[\s\S]*height:\s*auto/);
  assert.match(styles, /\.ink-bg\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(app, /\.layout-flow\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(app, /\.step-body\s*\{[\s\S]*overflow:\s*visible/);
});

test("规则页不被预览校验面板抢首屏", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /class="output-checks-panel"/);
  assert.match(app, /v-show="activeOutputTab === 'preview'"[\s\S]*class="output-checks-panel"/);
  const ruleIndex = app.indexOf('class="rule-card"');
  const checksIndex = app.indexOf('class="output-checks-panel"');
  assert.ok(checksIndex < ruleIndex, "校验面板可以保留在预览页 YAML 后，但规则页必须通过 v-show 隐藏它");
});

test("只读节点表格不产生 current-row 选择视觉", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /:highlight-current-row="!isNodeSelectionDisabled"/);
});

test("移动端折叠步骤标题支持键盘操作", async () => {
  const app = await readFile(new URL("../src/App.vue", import.meta.url), "utf8");

  assert.match(app, /:role="getStepHeaderRole\('fetch'\)"/);
  assert.match(app, /:tabindex="getStepHeaderTabIndex\('fetch'\)"/);
  assert.match(app, /@keydown\.enter\.prevent="toggleStepPanel\('fetch'\)"/);
  assert.match(app, /@keydown\.space\.prevent="toggleStepPanel\('fetch'\)"/);
  assert.match(app, /const getStepHeaderRole = \(key\) =>/);
  assert.match(app, /const getStepHeaderTabIndex = \(key\) =>/);
});
