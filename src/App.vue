<template>
  <div class="ink-bg">
    <div class="container">
      <div class="hero">
        <div class="hero-content">
          <div class="title-wrapper">
            <h1 class="hero-title">ClashRelay - 链式代理配置生成器</h1>
            <InkSeal class="hero-seal" :size="64" :rotate="-15" />
          </div>
          <InkBrushLine class="hero-brush" />
          <p class="hero-desc">
            输入机场订阅与落地节点，选择跳板节点后，一键生成带 DNS 优化与策略组分流的
            config.yaml。
          </p>
        </div>
        <el-button type="primary" plain size="small" @click="showOnboarding" class="help-btn">
          <el-icon><QuestionFilled /></el-icon>
          使用指南
        </el-button>
      </div>

      <!-- 装饰：右下角墨竹 -->
      <InkBamboo position="fixed" :right="-40" :bottom="-50" :opacity="0.9" />
      
      <!-- 全局 Loading -->
      <Transition name="fade">
        <InkLoading v-if="globalLoading" />
      </Transition>

      <!-- 新手引导 -->
      <OnboardingWizard
        ref="onboardingRef"
        @complete="onOnboardingComplete"
        @load-demo="loadDemoConfig"
      />

      <!-- 垂直布局 -->
      <div class="layout-stack">
        <!-- Step 1: 订阅获取 -->
        <section class="step-section">
          <div class="step-header">
            <span class="step-number">1</span>
            <span class="step-title">获取订阅节点</span>
          </div>
          <el-form label-position="top">
            <el-form-item label="机场订阅地址">
              <el-autocomplete
                v-model="form.subscriptionUrl"
                :fetch-suggestions="querySubscriptionHistory"
                :trigger-on-focus="true"
                placeholder="https://example.com/subscription"
                style="width: 100%;"
                clearable
              >
                <template #default="{ item }">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="overflow: hidden; text-overflow: ellipsis; max-width: 400px;">{{ item.value }}</span>
                    <el-button type="danger" link size="small" @click.stop="removeHistoryItem(item.value)">删除</el-button>
                  </div>
                </template>
              </el-autocomplete>
              <div class="helper-text">点击输入框可查看历史记录</div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                @click="handleFetchWithLoading"
                :loading="isFetching"
                :disabled="isFetching"
                style="width: 100%;"
              >
                {{ isFetching ? '正在获取...' : '获取节点' }}
              </el-button>
            </el-form-item>

            <el-collapse>
              <el-collapse-item title="高级选项" name="advanced">
                <el-form-item label="本地代理服务地址">
                  <el-input v-model="form.proxyUrl" placeholder="http://localhost:8787" />
                  <div class="helper-text">订阅站点未开启 CORS 时使用</div>
                </el-form-item>
                <el-form-item label="导入已有配置">
                  <el-upload
                    drag
                    accept=".yaml,.yml"
                    :auto-upload="false"
                    :on-change="handleConfigImport"
                    :show-file-list="false"
                    style="width: 100%;"
                  >
                    <div style="padding: 20px 0;">
                      <el-icon size="32" style="color: #64748b;"><Upload /></el-icon>
                      <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
                        拖拽 Clash 配置文件到此处
                      </div>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </section>

        <!-- Step 2: 选择跳板节点 -->
        <section class="step-section">
          <div class="step-header">
            <span class="step-number">2</span>
            <span class="step-title">选择跳板节点</span>
            <span v-if="nodes.length > 0" class="step-badge">{{ nodes.length }} 个节点</span>
          </div>

          <!-- 选择托盘 -->
          <SelectionTray
            :selected-nodes="selectedNodes"
            @remove="removeSelectedNode"
            @clear="clearSelection"
          />

          <!-- 工具栏 -->
          <div class="selector-toolbar">
            <el-input
              v-model="nodeSearch"
              placeholder="搜索节点..."
              :prefix-icon="Search"
              clearable
              style="width: 180px;"
            />
            <el-select v-model="nodeSortBy" placeholder="排序" style="width: 110px;">
              <el-option label="默认" value="default" />
              <el-option label="延迟" value="latency" />
              <el-option label="名称" value="name" />
              <el-option label="类型" value="type" />
            </el-select>
            <el-button size="small" @click="testAllNodesLatency" :loading="isTesting">
              测速
            </el-button>
            <el-divider direction="vertical" />
            <el-button-group size="small">
              <el-button @click="selectAllNodes" :disabled="displayNodes.length === 0">全选</el-button>
              <el-button @click="invertSelection" :disabled="displayNodes.length === 0">反选</el-button>
            </el-button-group>
          </div>

          <!-- 分组标签 -->
          <el-tabs v-model="activeNodeGroup" type="card" class="node-tabs">
            <el-tab-pane label="全部" name="all">
              <template #label>全部 ({{ filteredNodes.length }})</template>
            </el-tab-pane>
            <el-tab-pane v-for="group in nodeGroups" :key="group.key" :name="group.key">
              <template #label>{{ group.label }} ({{ group.count }})</template>
            </el-tab-pane>
          </el-tabs>

          <!-- 节点表格 -->
          <el-table
            :data="displayNodes"
            size="small"
            height="400"
            empty-text="暂无节点，请先获取订阅"
            style="width: 100%"
            @row-click="handleNodeRowClick"
            highlight-current-row
            :row-class-name="getRowClassName"
          >
            <el-table-column label="节点名称" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="node-name">
                  <el-icon v-if="form.dialerProxyGroup.includes(row.name)" size="16" class="selected-icon">
                    <InkCheck />
                  </el-icon>
                  {{ row.name }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column label="延迟" width="90">
              <template #default="{ row }">
                <span v-if="row.latency === -1" style="color: #999;">—</span>
                <span v-else-if="row.latency === -2" style="color: #f56c6c;">超时</span>
                <span v-else-if="row.latency" :style="{ color: getLatencyColor(row.latency) }">
                  {{ row.latency }}ms
                </span>
                <el-icon v-else class="is-loading" style="color: #409eff;"><Loading /></el-icon>
              </template>
            </el-table-column>
            <el-table-column prop="server" label="服务器" min-width="140" show-overflow-tooltip />
          </el-table>

          <!-- 策略组配置 -->
          <div v-if="selectedNodes.length > 1" class="strategy-config">
            <div class="config-label">策略组类型</div>
            <el-radio-group v-model="form.dialerProxyType" size="small">
              <el-radio-button value="url-test">自动选择</el-radio-button>
              <el-radio-button value="select">手动选择</el-radio-button>
              <el-radio-button value="fallback">故障转移</el-radio-button>
            </el-radio-group>
          </div>
        </section>

        <!-- Step 3: 落地节点配置 -->
        <section class="step-section">
          <div class="step-header">
            <span class="step-number">3</span>
            <span class="step-title">配置落地节点</span>
          </div>
          <el-form label-position="top">
            <el-form-item label="快速解析节点链接">
              <div style="display: flex; gap: 8px; width: 100%;">
                <el-input
                  v-model="form.landingNodeUrl"
                  placeholder="ss:// vmess:// vless:// trojan:// hysteria2:// socks5://"
                  style="flex: 1;"
                />
                <el-button type="primary" @click="parseLandingNodeUrl">解析</el-button>
              </div>
              <div class="helper-text">支持多种协议链接，解析后自动填充下方配置</div>
            </el-form-item>

            <div class="form-grid">
              <el-form-item label="节点类型">
                <el-select v-model="form.landingNodeType" style="width: 100%;">
                  <el-option label="SOCKS5" value="socks5" />
                  <el-option label="HTTP" value="http" />
                  <el-option label="Shadowsocks" value="ss" />
                  <el-option label="VMess" value="vmess" />
                  <el-option label="VLESS" value="vless" />
                  <el-option label="Trojan" value="trojan" />
                  <el-option label="Hysteria2" value="hysteria2" />
                  <el-option label="TUIC" value="tuic" />
                </el-select>
              </el-form-item>
              <el-form-item label="别名">
                <el-input v-model="form.socksAlias" placeholder="落地节点" />
              </el-form-item>
              <el-form-item label="服务器地址">
                <el-input v-model="form.socksServer" placeholder="1.2.3.4" />
              </el-form-item>
              <el-form-item label="端口">
                <el-input v-model="form.socksPort" placeholder="1080" />
              </el-form-item>
              <el-form-item label="用户名（可选）">
                <el-input v-model="form.socksUser" placeholder="" />
              </el-form-item>
              <el-form-item label="密码（可选）">
                <el-input v-model="form.socksPass" placeholder="" show-password />
              </el-form-item>
            </div>
          </el-form>
        </section>

        <!-- Step 4: 生成配置 -->
        <section class="step-section">
          <div class="step-header">
            <span class="step-number">4</span>
            <span class="step-title">生成配置</span>
          </div>

          <!-- 规则模板 -->
          <div class="rule-templates">
            <span class="templates-label">规则模板：</span>
            <div class="template-tags">
              <span
                v-for="template in ruleTemplates"
                :key="template.name"
                class="template-tag"
                @click="applyRuleTemplate(template)"
              >
                <el-icon class="template-icon"><component :is="iconMap[template.icon]" /></el-icon>
                {{ template.name }}
              </span>
            </div>
          </div>

          <!-- 生成按钮 -->
          <el-button
            type="primary"
            size="large"
            @click="generateYaml"
            style="width: 100%; margin: 16px 0;"
          >
            生成配置
          </el-button>

          <!-- 状态提示 -->
          <el-alert
            v-if="status.message"
            :title="status.message"
            :type="status.type"
            show-icon
            :closable="false"
            style="margin-bottom: 16px;"
          />

          <!-- YAML 预览 -->
          <div v-if="yamlText" class="yaml-section">
            <div class="yaml-header">
              <span>配置预览</span>
              <div class="yaml-actions">
                <el-button size="small" @click="copyYaml">复制</el-button>
                <el-button size="small" type="primary" @click="downloadYaml">下载</el-button>
              </div>
            </div>
            <pre class="config-preview" v-html="highlightedYaml"></pre>
          </div>
        </section>
      </div>

      <div class="footer">
        ClashRelay · Clash 链式代理配置生成器 ·
        <a href="https://github.com/Gary-zy/ClashRelay" target="_blank">GitHub</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { QuestionFilled, Search, Upload, Check, Loading, Film, Monitor, Suitcase, Platform, ChatDotRound, Cpu } from "@element-plus/icons-vue";
import OnboardingWizard from "./components/OnboardingWizard.vue";
import SelectionTray from "./components/SelectionTray.vue";
import InkSeal from "./components/decorations/InkSeal.vue";
import InkBamboo from "./components/decorations/InkBamboo.vue";
import InkBrushLine from "./components/decorations/InkBrushLine.vue";
import InkLoading from "./components/InkLoading.vue";
import InkCheck from "./components/decorations/InkCheck.vue";
import { useNodes } from "./composables/useNodes.js";
import { useSubscription } from "./composables/useSubscription.js";
import { useRules } from "./composables/useRules.js";
import { useConfig } from "./composables/useConfig.js";
import { useImportExport } from "./composables/useImportExport.js";
import { useNodeParams } from "./composables/useNodeParams.js";
import { highlightYaml } from "./utils/helpers.js";

const iconMap = {
  Film,
  Monitor,
  Suitcase,
  Platform,
  ChatDotRound,
  Cpu
};

const STORAGE_KEY = "clashrelay_config";
const globalLoading = ref(false);

const loadSavedConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};
const formDefaults = {
  subscriptionUrl: "",
  proxyUrl: "http://localhost:8787",
  includeDefaultRules: true,
  customRulesText: "",
  landingNodeUrl: "",
  landingNodeType: "socks5",
  socksServer: "",
  socksPort: "",
  socksUser: "",
  socksPass: "",
  socksAlias: "落地节点",
  dialerProxyGroup: [],
  dialerProxyType: "url-test",
  urlTestInterval: 30,
  urlTestTolerance: 50,
  urlTestLazy: false,
  dialerProxy: "",
  dnsMode: "fake-ip",
  domesticDns: "223.5.5.5, 119.29.29.29",
  foreignDns: "https://dns.google/dns-query, https://cloudflare-dns.com/dns-query",
  ruleProviders: [],
  autoRefresh: false,
  refreshInterval: 30,
  lastRefreshTime: null,
};

const form = reactive({ ...formDefaults });
const status = reactive({ message: "", type: "info" });

const {
  nodes,
  nodeSearch,
  nodeSortBy,
  activeNodeGroup,
  nodeGroups,
  filteredNodes,
  displayNodes,
  isTesting,
  healthCheckConfig,
  getNodeDisplayName,
  getLatencyColor,
  toggleFavorite,
  isFavorite,
  handleNodeRowClick,
  selectAllNodes,
  invertSelection,
  clearSelection,
  testAllNodesLatency,
  getNodeHealthStatus,
  formatTime,
} = useNodes({ form, status });

const {
  customRules,
  ruleBuilder,
  addCustomRule,
  removeCustomRule,
  applyRuleTemplate,
  rules,
  ruleTypes,
  ruleTemplates,
} = useRules({ status });

const yamlText = ref("");
const previousYaml = ref("");

const {
  diffResult,
  showDiffDialog,
  handleConfigImport,
  saveTemplate,
  loadTemplate,
  copyYaml,
  downloadYaml,
  showConfigDiff,
} = useImportExport({
  form,
  nodes,
  customRules,
  status,
  yamlText,
  previousYaml,
});

const {
  landingNode,
  parseLandingNodeUrl,
  selectedNodes,
  policyGroups,
  defaultRulesDisplay,
  generateYaml,
} = useConfig({
  form,
  nodes,
  customRules,
  status,
  yamlText,
  previousYaml,
});

const saveConfig = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        subscriptionUrl: form.subscriptionUrl,
        proxyUrl: form.proxyUrl,
        socksServer: form.socksServer,
        socksPort: form.socksPort,
        socksUser: form.socksUser,
        socksPass: form.socksPass,
        socksAlias: form.socksAlias,
        autoRefresh: form.autoRefresh,
        refreshInterval: form.refreshInterval,
        lastRefreshTime: form.lastRefreshTime,
      })
    );
  } catch {}
};

const {
  isFetching,
  querySubscriptionHistory,
  removeHistoryItem,
  clearSubscriptionHistory,
  handleFetch,
} = useSubscription({
  form,
  nodes,
  status,
  saveConfig,
});

const handleFetchWithLoading = async () => {
  globalLoading.value = true;
  const minTime = new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    await handleFetch();
  } finally {
    await minTime;
    globalLoading.value = false;
  }
};

const highlightedYaml = computed(() => highlightYaml(yamlText.value));

// 参数补全（静默运行）
const { globalParams, previewRename } = useNodeParams();

// 移除已选节点
const removeSelectedNode = (nodeName) => {
  const index = form.dialerProxyGroup.indexOf(nodeName);
  if (index > -1) {
    form.dialerProxyGroup.splice(index, 1);
  }
};

// 获取行样式
const getRowClassName = ({ row }) => {
  return form.dialerProxyGroup.includes(row.name) ? "selected-row" : "";
};

// 新手引导相关
const onboardingRef = ref(null);

const showOnboarding = () => {
  onboardingRef.value?.show();
};

const onOnboardingComplete = () => {};

const loadDemoConfig = () => {
  form.subscriptionUrl = "https://example.com/subscription";
  form.socksServer = "127.0.0.1";
  form.socksPort = "1080";
  form.socksAlias = "示例落地节点";
  ElMessage({
    message: "已加载示例配置，请替换为你的实际订阅地址和落地节点信息",
    type: "info",
    duration: 5000,
  });
};

onMounted(() => {
  const savedConfig = loadSavedConfig();
  if (savedConfig) {
    Object.assign(form, savedConfig);
  }
});

watch(
  () => ({
    subscriptionUrl: form.subscriptionUrl,
    proxyUrl: form.proxyUrl,
    socksServer: form.socksServer,
    socksPort: form.socksPort,
    socksUser: form.socksUser,
    socksPass: form.socksPass,
    socksAlias: form.socksAlias,
    autoRefresh: form.autoRefresh,
    refreshInterval: form.refreshInterval,
    lastRefreshTime: form.lastRefreshTime,
  }),
  () => saveConfig(),
  { deep: true }
);
</script>

<style>
/* 垂直布局 */
.layout-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 步骤区块 */
.step-section {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(26, 26, 26, 0.06);
}

/* 步骤标题 */
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-200);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-600);
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.step-title {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  color: var(--accent-600);
}

.step-badge {
  margin-left: auto;
  padding: 2px 10px;
  background: rgba(31, 42, 68, 0.08);
  border-radius: 999px;
  font-size: 12px;
  color: var(--ink-700);
}

/* 工具栏 */
.selector-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* 节点表格 */
.node-tabs {
  margin-bottom: 12px;
}

.node-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selected-icon {
  margin-right: 2px;
  filter: drop-shadow(0 0 2px rgba(185, 43, 39, 0.2));
}

.el-table .selected-row {
  background-color: rgba(31, 42, 68, 0.04) !important;
  font-weight: 500;
  position: relative;
}

.el-table .selected-row td:first-child {
  /* 左侧朱砂竖线指示器 */
  box-shadow: inset 4px 0 0 -1px #b92b27 !important;
}

.el-table .selected-row:hover > td {
  background-color: rgba(31, 42, 68, 0.08) !important;
}

/* 策略组配置 */
.strategy-config {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--line-200);
}

.config-label {
  font-size: 13px;
  color: var(--ink-700);
  white-space: nowrap;
}

/* 表单网格 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 16px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

/* 规则模板 */
.rule-templates {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.templates-label {
  font-size: 13px;
  color: var(--ink-700);
  padding-top: 6px;
  white-space: nowrap;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.template-tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  background: rgba(20, 24, 35, 0.05);
  border: 1px solid var(--line-200);
  border-radius: 999px;
  font-size: 12px;
  color: var(--ink-700);
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  background: rgba(20, 24, 35, 0.1);
  border-color: var(--accent-600);
  color: var(--accent-600);
}

.template-icon {
  margin-right: 4px;
  font-size: 14px;
  vertical-align: middle;
}

/* YAML 预览 */
.yaml-section {
  margin-top: 16px;
}

.yaml-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--ink-700);
}

.yaml-actions {
  display: flex;
  gap: 8px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .layout-stack {
    gap: 16px;
  }

  .step-section {
    padding: 16px;
    border-radius: 12px;
  }

  .step-title {
    font-size: 16px;
  }

  .selector-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .selector-toolbar .el-input,
  .selector-toolbar .el-select {
    width: 100% !important;
  }

  .strategy-config {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* 装饰元素样式 */
.hero-content {
  position: relative;
  flex: 1;
}

.title-wrapper {
  position: relative;
  display: inline-block;
}

.hero-seal {
  position: absolute;
  top: -10px;
  right: -50px;
  opacity: 0.9;
  z-index: 0;
  pointer-events: none;
}

.hero-brush {
  width: 100%;
  max-width: 420px;
  height: 12px;
  margin-top: -6px;
  margin-bottom: 12px;
  display: block;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .hero-seal {
    right: -20px;
    top: -20px;
    transform: scale(0.7) rotate(-15deg);
  }
}
</style>
