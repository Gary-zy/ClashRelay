<template>
  <div class="ink-bg">
    <div class="container">
      <div class="hero">
        <div>
          <h1 class="hero-title">ClashRelay - 链式代理配置生成器</h1>
          <p class="hero-desc">
            输入机场订阅与 Socks5 落地节点，选择跳板节点后，一键生成带 DNS 优化与策略组分流的
            config.yaml。支持订阅解析、快速预览、复制与下载。
          </p>
        </div>
      </div>

      <div class="grid">
        <ConfigForm
          :form="form"
          :rules="rules"
          :status="status"
          :is-fetching="isFetching"
          :landing-node="landingNode"
          :handle-fetch="handleFetch"
          :handle-config-import="handleConfigImport"
          :query-subscription-history="querySubscriptionHistory"
          :remove-history-item="removeHistoryItem"
          :parse-landing-node-url="parseLandingNodeUrl"
          :format-time="formatTime"
        />

        <NodeList
          :form="form"
          :selected-nodes="selectedNodes"
          :filtered-nodes="filteredNodes"
          :display-nodes="displayNodes"
          :node-groups="nodeGroups"
          :node-search="nodeSearch"
          :node-sort-by="nodeSortBy"
          :active-node-group="activeNodeGroup"
          :is-testing="isTesting"
          :health-check-config="healthCheckConfig"
          :get-node-display-name="getNodeDisplayName"
          :get-latency-color="getLatencyColor"
          :get-node-health-status="getNodeHealthStatus"
          :is-favorite="isFavorite"
          :toggle-favorite="toggleFavorite"
          :handle-node-row-click="handleNodeRowClick"
          :select-all-nodes="selectAllNodes"
          :invert-selection="invertSelection"
          :clear-selection="clearSelection"
          :test-all-nodes-latency="testAllNodesLatency"
          :on-tab-change="handleNodeGroupChange"
        />
      </div>

      <div class="grid" style="margin-top: 18px;">
        <RuleEditor
          :form="form"
          :rule-templates="ruleTemplates"
          :rule-types="ruleTypes"
          :rule-builder="ruleBuilder"
          :custom-rules="customRules"
          :policy-groups="policyGroups"
          :nodes="nodes"
          :get-node-display-name="getNodeDisplayName"
          :add-custom-rule="addCustomRule"
          :remove-custom-rule="removeCustomRule"
          :apply-rule-template="applyRuleTemplate"
          :generate-yaml="generateYaml"
          :copy-yaml="copyYaml"
          :download-yaml="downloadYaml"
          :show-config-diff="showConfigDiff"
          :save-template="saveTemplate"
          :load-template="loadTemplate"
          :clear-all-config="clearAllConfig"
          :yaml-text="yamlText"
          :previous-yaml="previousYaml"
          :clash-import-url="clashImportUrl"
          :config-name="configName"
          :qrcode-data-url="qrcodeDataUrl"
          :open-clash-import-url="openClashImportUrl"
          :copy-clash-import-url="copyClashImportUrl"
          :default-rules-display="defaultRulesDisplay"
          :show-diff-dialog="showDiffDialog"
          :diff-result="diffResult"
        />

        <YamlPreview :highlighted-yaml="highlightedYaml" />
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
import ConfigForm from "./components/ConfigForm.vue";
import NodeList from "./components/NodeList.vue";
import RuleEditor from "./components/RuleEditor.vue";
import YamlPreview from "./components/YamlPreview.vue";
import { useNodes } from "./composables/useNodes.js";
import { useSubscription } from "./composables/useSubscription.js";
import { useRules } from "./composables/useRules.js";
import { useConfig } from "./composables/useConfig.js";
import { useImportExport } from "./composables/useImportExport.js";
import { highlightYaml } from "./utils/helpers.js";

const STORAGE_KEY = "clashrelay_config";

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

// 处理节点分组切换
const handleNodeGroupChange = (tabName) => {
  activeNodeGroup.value = tabName;
};

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
const clashImportUrl = ref("");
const configName = ref("RelayBox-配置");
const qrcodeDataUrl = ref("");

const {
  diffResult,
  showDiffDialog,
  handleConfigImport,
  saveTemplate,
  loadTemplate,
  copyYaml,
  downloadYaml,
  showConfigDiff,
  openClashImportUrl,
  copyClashImportUrl,
  generateClashImportUrl,
} = useImportExport({
  form,
  nodes,
  customRules,
  status,
  yamlText,
  previousYaml,
  clashImportUrl,
  configName,
  qrcodeDataUrl,
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
  generateClashImportUrl,
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

const highlightedYaml = computed(() => highlightYaml(yamlText.value));

const clearAllConfig = () => {
  ElMessageBox.confirm("此操作将清除所有配置和历史记录，是否继续？", "确认清除", {
    confirmButtonText: "确定清除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      localStorage.removeItem(STORAGE_KEY);
      clearSubscriptionHistory();
      Object.assign(form, formDefaults);
      nodes.value = [];
      yamlText.value = "";
      previousYaml.value = "";
      customRules.value = [];
      if (landingNode) {
        landingNode.value = null;
      }
      ElMessage({
        message: "✅ 已清除所有配置",
        type: "success",
        duration: 2000,
      });
    })
    .catch(() => {});
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
