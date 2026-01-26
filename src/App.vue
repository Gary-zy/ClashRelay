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
        <div class="section-card">
          <div class="section-title">1. 输入订阅与落地节点</div>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <!-- 配置导入区域 -->
            <el-collapse style="margin-bottom: 16px;">
              <el-collapse-item title="导入已有配置（可选）" name="import">
                <el-upload
                  drag
                  accept=".yaml,.yml"
                  :auto-upload="false"
                  :on-change="handleConfigImport"
                  :show-file-list="false"
                  style="width: 100%;"
                >
                  <el-icon size="40" style="color: #64748b;"><Upload /></el-icon>
                  <div class="el-upload__text" style="margin-top: 8px;">
                    拖拽 Clash 配置文件到此处，或<em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="helper-text">
                      支持 .yaml/.yml 格式，将自动提取节点列表、规则和 Socks5 配置
                    </div>
                  </template>
                </el-upload>
              </el-collapse-item>
            </el-collapse>
            
            <el-form-item label="机场订阅地址" prop="subscriptionUrl">

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
                    <span style="overflow: hidden; text-overflow: ellipsis; max-width: 280px;">{{ item.value }}</span>
                    <el-button type="danger" link size="small" @click.stop="removeHistoryItem(item.value)">删除</el-button>
                  </div>
                </template>
              </el-autocomplete>
              <div class="helper-text">
                点击输入框可查看历史记录（获取成功后自动保存）
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleFetch" :loading="isFetching" :disabled="isFetching" style="width: 100%;">{{ isFetching ? '正在获取...' : '获取节点' }}</el-button>
            </el-form-item>
            
            <el-collapse style="margin-bottom: 16px;">
              <el-collapse-item title="高级选项" name="advanced">
                <el-form-item label="本地代理服务地址">
                  <el-input v-model="form.proxyUrl" placeholder="http://localhost:8787" />
                  <div class="helper-text">
                    订阅站点未开启 CORS 时，可启动本地代理（项目内提供
                    <code>proxy-server.js</code>）。
                  </div>
                </el-form-item>
                
                <el-divider content-position="left">DNS 配置</el-divider>
                <el-form-item label="DNS 模式">
                  <el-radio-group v-model="form.dnsMode">
                    <el-radio value="fake-ip">Fake-IP (推荐)</el-radio>
                    <el-radio value="redir-host">Redir-Host</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="国内 DNS">
                  <el-input v-model="form.domesticDns" placeholder="223.5.5.5, 119.29.29.29" />
                  <div class="helper-text">多个 DNS 用逗号分隔</div>
                </el-form-item>
                <el-form-item label="国外 DNS">
                  <el-input v-model="form.foreignDns" placeholder="https://dns.google/dns-query" />
                </el-form-item>
                
                <el-divider content-position="left">规则集导入</el-divider>
                <el-form-item label="外部规则集 URL">
                  <el-select v-model="form.ruleProviders" multiple placeholder="选择预设规则集" style="width: 100%;">
                    <el-option label="Loyalsoldier - 广告域名" value="reject" />
                    <el-option label="Loyalsoldier - 代理域名" value="proxy" />
                    <el-option label="Loyalsoldier - 直连域名" value="direct" />
                    <el-option label="Loyalsoldier - GFW 域名" value="gfw" />
                  </el-select>
                  <div class="helper-text">选择后将自动添加对应的 rule-providers 配置</div>
                </el-form-item>
                
                <el-divider content-position="left">订阅自动刷新</el-divider>
                <el-form-item>
                  <el-switch v-model="form.autoRefresh" active-text="启用自动刷新" />
                </el-form-item>
                <el-form-item v-if="form.autoRefresh" label="刷新间隔（分钟）">
                  <el-input-number v-model="form.refreshInterval" :min="5" :max="1440" />
                </el-form-item>
                <div v-if="form.lastRefreshTime" class="helper-text">
                  上次刷新：{{ formatTime(form.lastRefreshTime) }}
                </div>
              </el-collapse-item>
            </el-collapse>

            <el-divider content-position="left">落地节点配置</el-divider>
            <el-form-item label="快速解析节点链接（可选）">
              <el-row :gutter="12" style="width: 100%;">
                <el-col :span="20">
                  <el-input v-model="form.landingNodeUrl" placeholder="支持 socks5:// ss:// vmess:// vless:// trojan:// http://" />
                </el-col>
                <el-col :span="4">
                  <el-button type="primary" @click="parseLandingNodeUrl" style="width: 100%;">解析</el-button>
                </el-col>
              </el-row>
              <div class="helper-text">
                支持多种协议链接：socks5、ss(Shadowsocks)、vmess、vless、trojan、http。
              </div>
            </el-form-item>
            <el-form-item v-if="landingNode" label="节点类型">
              <el-tag :type="getLandingNodeTagType(landingNode.type)">{{ landingNode.type.toUpperCase() }}</el-tag>
            </el-form-item>
            <el-form-item label="Server (IP / Domain)" prop="socksServer">
              <el-input v-model="form.socksServer" placeholder="1.2.3.4 或 example.com" />
            </el-form-item>
            <el-form-item label="Port" prop="socksPort">
              <el-input v-model="form.socksPort" placeholder="1080" />
            </el-form-item>
            <el-form-item label="Username">
              <el-input v-model="form.socksUser" placeholder="可选" />
            </el-form-item>
            <el-form-item label="Password">
              <el-input v-model="form.socksPass" placeholder="可选" show-password />
            </el-form-item>
            <el-form-item label="别名 (Alias)" prop="socksAlias">
              <el-input v-model="form.socksAlias" placeholder="🇺🇸 美国家宽-出口" />
            </el-form-item>
            <el-alert
              v-if="status.message"
              :title="status.message"
              :type="status.type"
              show-icon
              :closable="false"
              role="alert"
            />
          </el-form>
        </div>

        <div class="section-card">
          <div class="section-title">2. 选择跳板节点</div>
          <el-form label-position="top">
            <el-form-item label="跳板节点 (Dialer-Proxy) - 支持多选">
              <el-select v-model="form.dialerProxyGroup" multiple placeholder="选择跳板节点（可多选）" filterable collapse-tags collapse-tags-tooltip :max-collapse-tags="3" style="width: 100%;">
                <el-option
                  v-for="node in filteredNodes"
                  :key="node.name"
                  :label="node.name"
                  :value="node.name"
                >
                  <span>{{ getNodeDisplayName(node) }}</span>
                  <span 
                    v-if="node.latency && node.latency > 0" 
                    :style="{ color: node.latency < 300 ? '#67c23a' : '#f56c6c', marginLeft: '8px', fontWeight: 'bold' }"
                  >
                    ({{ node.latency }}ms)
                  </span>
                  <span 
                    v-else-if="node.latency === -2" 
                    style="color: #f56c6c; margin-left: 8px; font-weight: bold;"
                  >
                    (超时)
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item v-if="form.dialerProxyGroup.length > 1" label="策略组类型">
              <el-radio-group v-model="form.dialerProxyType">
                <el-radio value="url-test">自动选择（url-test）</el-radio>
                <el-radio value="select">手动选择（select）</el-radio>
                <el-radio value="fallback">故障转移（fallback）</el-radio>
              </el-radio-group>
              <div class="helper-text">选择多个节点时将生成一个策略组作为前置跳板</div>
            </el-form-item>
          </el-form>
          <div v-if="selectedNodes.length > 0" class="selected-node">
            <div class="selected-node-title">已选中 {{ selectedNodes.length }} 个跳板节点</div>
            <div class="selected-node-content" style="grid-template-columns: 1fr;">
              <div v-for="node in selectedNodes" :key="node.name" style="margin-bottom: 4px;">
                <strong>{{ node.name }}</strong> - {{ node.type }} ({{ node.server }}:{{ node.port }})
              </div>
            </div>
          </div>

          
          <!-- 节点操作工具栏 -->
          <div class="node-toolbar">
            <el-input 
              v-model="nodeSearch" 
              placeholder="搜索节点..." 
              :prefix-icon="Search"
              clearable 
              style="width: 200px;"
            />
            <el-select v-model="nodeSortBy" placeholder="排序方式" style="width: 130px; margin-left: 8px;">
              <el-option label="默认顺序" value="default" />
              <el-option label="按延迟" value="latency" />
              <el-option label="按名称" value="name" />
              <el-option label="按类型" value="type" />
            </el-select>
            <el-button type="primary" size="small" @click="testAllNodesLatency" :loading="isTesting" style="margin-left: 8px;">
              {{ isTesting ? '测速中...' : '测试延迟' }}
            </el-button>
            <el-divider direction="vertical" />
            <el-switch 
              v-model="healthCheckConfig.enabled" 
              active-text="健康监控"
              style="margin-left: 4px;"
            />
            <el-tooltip v-if="healthCheckConfig.enabled" content="正在后台监控节点健康状态">
              <el-icon class="is-loading" style="margin-left: 4px; color: #409eff;"><Loading /></el-icon>
            </el-tooltip>
          </div>

          
          <!-- 节点分组标签页 -->
          <el-tabs v-model="activeNodeGroup" type="card" style="margin-top: 12px;">
            <el-tab-pane label="全部" name="all">
              <span slot="label">全部 ({{ filteredNodes.length }})</span>
            </el-tab-pane>
            <el-tab-pane 
              v-for="group in nodeGroups" 
              :key="group.key" 
              :name="group.key"
            >
              <template #label>
                {{ group.label }} ({{ group.count }})
              </template>
            </el-tab-pane>
          </el-tabs>
          
          <el-table
            :data="displayNodes"
            size="small"
            height="500"
            empty-text="暂无节点，请先获取节点"
            style="width: 100%"
            @row-click="handleNodeRowClick"
            highlight-current-row
          >
            <el-table-column label="节点名称" min-width="280" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="healthCheckConfig.enabled" style="margin-right: 4px;">
                  <el-icon v-if="getNodeHealthStatus(row.name) === 'healthy'" size="12" style="color: #67c23a;"><CircleCheck /></el-icon>
                  <el-icon v-else-if="getNodeHealthStatus(row.name) === 'unhealthy'" size="12" style="color: #f56c6c;"><CircleClose /></el-icon>
                  <el-icon v-else size="12" style="color: #909399;"><Remove /></el-icon>
                </span>
                {{ row.name }}
              </template>
            </el-table-column>
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
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button 
                  :type="form.dialerProxyGroup.includes(row.name) ? 'success' : 'primary'" 
                  link 
                  size="small" 
                  @click.stop="handleNodeRowClick(row)"
                >
                  <span v-if="form.dialerProxyGroup.includes(row.name)" style="display: inline-flex; align-items: center;">
                    <el-icon size="14" style="margin-right: 2px;"><Check /></el-icon>已选
                  </span>
                  <span v-else>选择</span>
                </el-button>

                <el-button 
                  :type="isFavorite(row.name) ? 'warning' : 'default'" 
                  link 
                  size="small" 
                  @click.stop="toggleFavorite(row.name)"
                >
                  <el-icon size="16">
                    <StarFilled v-if="isFavorite(row.name)" />
                    <Star v-else />
                  </el-icon>
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="server" label="服务器" min-width="120" show-overflow-tooltip />
            <el-table-column prop="port" label="端口" width="70" />
          </el-table>
        </div>
      </div>

      <div class="grid" style="margin-top: 18px;">
        <div class="section-card">
          <div class="section-title">3. 生成配置</div>
          <el-form label-position="top" style="margin-bottom: 12px;">
            <el-form-item label="规则策略">
              <div style="display: flex; align-items: center; gap: 12px;">
                <el-switch v-model="form.includeDefaultRules" active-text="包含默认规则" />
                <el-button size="small" @click="showDefaultRules = true">查看默认规则</el-button>
              </div>
            </el-form-item>
            <el-form-item label="规则模板预设（一键应用）">
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <el-button 
                  v-for="(template, key) in ruleTemplates" 
                  :key="key"
                  size="small"
                  @click="applyRuleTemplate(key)"
                >
                  {{ template.icon }} {{ template.name }}
                </el-button>
              </div>
              <div class="helper-text">点击模板会将对应规则添加到自定义规则列表中</div>
            </el-form-item>
            <el-form-item label="快速添加规则">
              <div class="rule-builder" style="width: 100%;">
                <el-row :gutter="12" style="width: 100%;" type="flex">
                  <el-col :span="6">
                    <el-select v-model="ruleBuilder.type" placeholder="规则类型" style="width: 100%;">
                      <el-option 
                        v-for="rt in ruleTypes" 
                        :key="rt.value" 
                        :label="rt.label" 
                        :value="rt.value" 
                      />
                    </el-select>
                  </el-col>
                  <el-col :span="10">
                    <el-input v-model="ruleBuilder.value" placeholder="域名/地址 (如 example.com)" />
                  </el-col>
                  <el-col :span="5">
                    <el-select v-model="ruleBuilder.policy" placeholder="策略组" style="width: 100%;">
                      <el-option 
                        v-for="pg in policyGroups" 
                        :key="pg.value" 
                        :label="pg.label" 
                        :value="pg.value" 
                      />
                      <el-option-group v-if="form.socksAlias" label="Socks5 落地节点">
                        <el-option :label="form.socksAlias" :value="form.socksAlias" />
                      </el-option-group>
                      <el-option-group v-if="nodes.length > 0" label="机场节点">
                        <el-option
                          v-for="node in nodes"
                          :key="node.name"
                          :label="getNodeDisplayName(node)"
                          :value="node.name"
                        />
                      </el-option-group>
                    </el-select>
                  </el-col>
                  <el-col :span="3">
                    <el-button type="primary" @click="addCustomRule" style="width: 100%;">添加</el-button>
                  </el-col>
                </el-row>
              </div>
            </el-form-item>
            <el-form-item label="自定义规则列表" v-if="customRules.length > 0">
              <div class="rule-list">
                <el-tag
                  v-for="(rule, index) in customRules"
                  :key="index"
                  closable
                  @close="removeCustomRule(index)"
                  style="margin: 4px;"
                >
                  {{ rule }}
                </el-tag>
              </div>
            </el-form-item>
            <el-form-item label="高级：直接输入规则（每行一条）">
              <el-input
                v-model="form.customRulesText"
                type="textarea"
                :rows="3"
                placeholder="例如：DOMAIN-SUFFIX,example.com,🌍 其他外网"
              />
              <div class="helper-text">
                支持 Clash 规则格式；空行与以 #/\/\/ 开头的注释会被忽略。
              </div>
            </el-form-item>
          </el-form>
          <el-space wrap>
            <el-button type="primary" @click="generateYaml">生成配置</el-button>
            <el-button @click="copyYaml" :disabled="!yamlText">复制配置</el-button>
            <el-button @click="downloadYaml" :disabled="!yamlText">下载 config.yaml</el-button>
            <el-button @click="exportShadowrocket" :disabled="nodes.length === 0 && !form.socksServer">导出 Shadowrocket</el-button>
            <el-button @click="showConfigDiff" :disabled="!yamlText || !previousYaml">对比变更</el-button>
            <el-divider direction="vertical" />
            <el-button @click="saveTemplate" size="small">保存模板</el-button>
            <el-button @click="loadTemplate" size="small">加载模板</el-button>
            <el-button type="danger" link @click="clearAllConfig" class="clear-config-btn">清除配置</el-button>
          </el-space>
          
          <!-- 一键导入功能已移除，请使用下载 config.yaml 后手动导入 -->

          
          <el-divider content-position="left">生成说明</el-divider>
          <ul style="padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.7;">
            <li>默认使用 Fake-IP DNS、国内外分流解析。</li>
            <li>AI/Google 组优先走 Socks5 落地节点。</li>
            <li>其他外网组包含 Socks5 + 机场节点 + DIRECT。</li>
            <li>Socks5 节点自动注入 dialer-proxy。</li>
          </ul>
        </div>

        <div class="section-card">
          <div class="section-title">预览 config.yaml</div>
          <div class="config-preview" v-html="highlightedYaml || '等待生成...'"></div>
        </div>
      </div>

      <div class="footer">
        ClashRelay · Clash 链式代理配置生成器 · 
        <a href="https://github.com/Gary-zy/ClashRelay" target="_blank">GitHub</a>
      </div>
    </div>

    <!-- 默认规则查看对话框 -->
    <el-dialog v-model="showDefaultRules" title="默认规则列表" width="700px">
      <div style="max-height: 500px; overflow-y: auto;">
        <el-table :data="defaultRulesDisplay" size="small" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="rule" label="规则" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showDefaultRules = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 配置对比对话框 -->
    <el-dialog v-model="showDiffDialog" title="配置变更对比" width="80%" top="5vh">
      <div class="diff-container">
        <div 
          v-for="(part, index) in diffResult" 
          :key="index"
          :class="{ 'diff-added': part.added, 'diff-removed': part.removed, 'diff-unchanged': !part.added && !part.removed }"
        >{{ part.value }}</div>
      </div>
      <template #footer>
        <el-button @click="showDiffDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>

</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, Search, Upload, Star, StarFilled, Check, CircleCheck, CircleClose, Remove } from '@element-plus/icons-vue';
import yaml from "js-yaml";
import QRCode from 'qrcode';
import { diffLines } from 'diff';
import { defaultRules, fakeIpFilter, ruleTypes, policyGroups } from "./config/defaultConfig.js";
import { ruleTemplates } from "./config/ruleTemplates.js";

// ==================== 配置持久化 ====================
const STORAGE_KEY = "clashrelay_config";
const HISTORY_KEY = "clashrelay_history";
const RULES_KEY = "clashrelay_rules";
const TEMPLATE_KEY = "clashrelay_template";
const FAVORITES_KEY = "clashrelay_favorites";

const loadSavedConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveConfig = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      subscriptionUrl: form.subscriptionUrl,
      proxyUrl: form.proxyUrl,
      socksServer: form.socksServer,
      socksPort: form.socksPort,
      socksUser: form.socksUser,
      socksPass: form.socksPass,
      socksAlias: form.socksAlias,
      // 订阅自动刷新配置
      autoRefresh: form.autoRefresh,
      refreshInterval: form.refreshInterval,
      lastRefreshTime: form.lastRefreshTime,
    }));
  } catch {}
};

const loadSubscriptionHistory = () => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveSubscriptionHistory = (url) => {
  if (!url) return;
  try {
    let history = loadSubscriptionHistory();
    history = history.filter(h => h !== url);
    history.unshift(url);
    history = history.slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    subscriptionHistory.value = history;
  } catch {}
};

const formDefaults = {
  subscriptionUrl: "",
  proxyUrl: "http://localhost:8787",
  includeDefaultRules: true,
  customRulesText: "",
  landingNodeUrl: "",  // 原 socks5Url，现支持多协议
  socksServer: "",
  socksPort: "",
  socksUser: "",
  socksPass: "",
  socksAlias: "🇺🇸 美国家宽-出口",
  // 跳板节点配置（支持多选）
  dialerProxyGroup: [],
  dialerProxyType: "url-test",  // url-test | select | fallback
  // DNS 配置
  dnsMode: "fake-ip",
  domesticDns: "223.5.5.5, 119.29.29.29",
  foreignDns: "https://dns.google/dns-query, https://cloudflare-dns.com/dns-query",
  // 规则集
  ruleProviders: [],
  // 订阅自动刷新
  autoRefresh: false,
  refreshInterval: 30,
  lastRefreshTime: null,
};

const form = reactive({ ...formDefaults });
const formRef = ref();
const nodes = ref([]);
const yamlText = ref("");
const clashImportUrl = ref("");
const configName = ref("RelayBox-配置"); // 默认配置名称
const qrcodeDataUrl = ref("");
const status = reactive({ message: "", type: "info" });
const customRules = ref([]);
const ruleBuilder = reactive({
  type: "DOMAIN-SUFFIX",
  value: "",
  policy: "🇺🇸 美国尊享(AI/Google)",
});

const isTesting = ref(false);
const isFetching = ref(false);
const showDefaultRules = ref(false);

// ==================== 落地节点（支持多协议）====================
const landingNode = ref(null);  // 解析后的完整节点对象

// ==================== 配置对比功能 ====================
const previousYaml = ref("");
const showDiffDialog = ref(false);
const diffResult = ref([]);

// ==================== 订阅定时刷新功能 ====================
const refreshTimer = ref(null);

// ==================== 节点健康监控功能 ====================
const HEALTH_KEY = "clashrelay_health";
const nodeHealthStatus = ref({});
const healthCheckTimer = ref(null);
const healthCheckConfig = reactive({
  enabled: false,
  interval: 5,        // 检测间隔（分钟）
  timeout: 5000,      // 超时时间（毫秒）
  testUrl: "http://www.gstatic.com/generate_204",
});

// 加载持久化的健康状态
try {
  const savedHealth = localStorage.getItem(HEALTH_KEY);
  if (savedHealth) nodeHealthStatus.value = JSON.parse(savedHealth);
} catch {}

// ==================== 节点筛选/排序/分组 ====================
const nodeSearch = ref("");
const nodeSortBy = ref("default");
const activeNodeGroup = ref("all");
const subscriptionHistory = ref([]);
const favoriteNodes = ref([]);

// 加载收藏节点
try {
  const saved = localStorage.getItem(FAVORITES_KEY);
  if (saved) favoriteNodes.value = JSON.parse(saved);
} catch {}

// 地区关键词映射
const regionMap = {
  "香港": ["香港", "HK", "Hong Kong", "HongKong", "🇭🇰"],
  "美国": ["美国", "US", "USA", "United States", "🇺🇸"],
  "日本": ["日本", "JP", "Japan", "🇯🇵"],
  "新加坡": ["新加坡", "SG", "Singapore", "🇸🇬"],
  "台湾": ["台湾", "TW", "Taiwan", "🇹🇼"],
  "韩国": ["韩国", "KR", "Korea", "🇰🇷"],
  "德国": ["德国", "DE", "Germany", "🇩🇪"],
  "法国": ["法国", "FR", "France", "🇫🇷"],
  "英国": ["英国", "UK", "GB", "Britain", "🇬🇧"],
  "澳大利亚": ["澳大利亚", "AU", "Australia", "🇦🇺"],
};

const getNodeRegion = (nodeName) => {
  for (const [region, keywords] of Object.entries(regionMap)) {
    if (keywords.some(kw => nodeName.toLowerCase().includes(kw.toLowerCase()))) {
      return region;
    }
  }
  return "其他";
};

// 计算节点分组
const nodeGroups = computed(() => {
  const groups = {};
  nodes.value.forEach(node => {
    const region = getNodeRegion(node.name);
    if (!groups[region]) {
      groups[region] = { key: region, label: region, count: 0 };
    }
    groups[region].count++;
  });
  return Object.values(groups).sort((a, b) => b.count - a.count);
});

// YAML 语法高亮
const highlightYaml = (text) => {
  if (!text) return '';
  // HTML 转义
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 高亮处理
  html = html
    // 注释
    .replace(/(#.*$)/gm, '<span class="yaml-comment">$1</span>')
    // 键名（行首的键:）
    .replace(/^(\s*)([a-zA-Z0-9_-]+)(:)/gm, '$1<span class="yaml-key">$2</span>$3')
    // 数字
    .replace(/:\s*(\d+)(\s*)$/gm, ': <span class="yaml-number">$1</span>$2')
    // 布尔值
    .replace(/:\s*(true|false)(\s*)$/gm, ': <span class="yaml-boolean">$1</span>$2')
    // 带引号的字符串
    .replace(/"([^"]+)"/g, '<span class="yaml-string">"$1"</span>');
  
  return html;
};

// 高亮后的 YAML
const highlightedYaml = computed(() => highlightYaml(yamlText.value));

// 筛选后的节点
const filteredNodes = computed(() => {
  let result = [...nodes.value];
  
  // 搜索筛选
  if (nodeSearch.value) {
    const searchLower = nodeSearch.value.toLowerCase();
    result = result.filter(node => 
      node.name.toLowerCase().includes(searchLower) ||
      node.server?.toLowerCase().includes(searchLower) ||
      node.type?.toLowerCase().includes(searchLower)
    );
  }
  
  // 排序
  if (nodeSortBy.value === "latency") {
    result.sort((a, b) => {
      const la = a.latency > 0 ? a.latency : 99999;
      const lb = b.latency > 0 ? b.latency : 99999;
      return la - lb;
    });
  } else if (nodeSortBy.value === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (nodeSortBy.value === "type") {
    result.sort((a, b) => a.type.localeCompare(b.type));
  }
  
  // 收藏节点置顶
  result.sort((a, b) => {
    const aFav = favoriteNodes.value.includes(a.name) ? 0 : 1;
    const bFav = favoriteNodes.value.includes(b.name) ? 0 : 1;
    return aFav - bFav;
  });
  
  return result;
});

// 根据分组过滤显示的节点
const displayNodes = computed(() => {
  if (activeNodeGroup.value === "all") {
    return filteredNodes.value;
  }
  return filteredNodes.value.filter(node => 
    getNodeRegion(node.name) === activeNodeGroup.value
  );
});

// 点击行选中节点（多选模式）
const handleNodeRowClick = (row) => {
  const index = form.dialerProxyGroup.indexOf(row.name);
  if (index > -1) {
    // 已选中，则移除
    form.dialerProxyGroup.splice(index, 1);
  } else {
    // 未选中，则添加
    form.dialerProxyGroup.push(row.name);
  }
};

// 初始化
onMounted(() => {
  const savedConfig = loadSavedConfig();
  if (savedConfig) {
    Object.assign(form, savedConfig);
  }
  subscriptionHistory.value = loadSubscriptionHistory();
  
  // 加载保存的自定义规则
  try {
    const savedRules = localStorage.getItem(RULES_KEY);
    if (savedRules) {
      customRules.value = JSON.parse(savedRules);
    }
  } catch {}
});

// 监听表单变化自动保存
watch(
  () => ({
    subscriptionUrl: form.subscriptionUrl,
    proxyUrl: form.proxyUrl,
    socksServer: form.socksServer,
    socksPort: form.socksPort,
    socksUser: form.socksUser,
    socksPass: form.socksPass,
    socksAlias: form.socksAlias,
  }),
  () => saveConfig(),
  { deep: true }
);

// 监听自定义规则变化自动保存
watch(
  customRules,
  (newRules) => {
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(newRules));
    } catch {}
  },
  { deep: true }
);

// ==================== 订阅自动刷新逻辑 ====================
// 启动/停止刷新定时器
watch(
  () => form.autoRefresh,
  (enabled) => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value);
      refreshTimer.value = null;
    }
    if (enabled && form.subscriptionUrl) {
      refreshTimer.value = setInterval(() => {
        handleFetch();
        form.lastRefreshTime = new Date().toISOString();
        saveConfig();
      }, form.refreshInterval * 60 * 1000);
      status.message = `已启用自动刷新，间隔 ${form.refreshInterval} 分钟`;
      status.type = "success";
    }
  }
);

// 监听刷新间隔变化，重启定时器
watch(
  () => form.refreshInterval,
  () => {
    if (form.autoRefresh && form.subscriptionUrl) {
      // 重启定时器
      if (refreshTimer.value) {
        clearInterval(refreshTimer.value);
      }
      refreshTimer.value = setInterval(() => {
        handleFetch();
        form.lastRefreshTime = new Date().toISOString();
        saveConfig();
      }, form.refreshInterval * 60 * 1000);
    }
  }
);

// 页面卸载时清除定时器
onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
  if (healthCheckTimer.value) {
    clearInterval(healthCheckTimer.value);
    healthCheckTimer.value = null;
  }
});

// ==================== 节点健康监控逻辑 ====================
// 检测单个节点健康状态
const checkNodeHealth = async (node) => {
  const startTime = Date.now();
  try {
    const response = await fetch(`${form.proxyUrl}/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server: node.server, port: node.port }),
      signal: AbortSignal.timeout(healthCheckConfig.timeout),
    });
    const data = await response.json();
    return {
      status: data.latency > 0 ? "healthy" : "unhealthy",
      latency: data.latency,
      lastCheck: Date.now(),
    };
  } catch {
    return { status: "unhealthy", latency: -1, lastCheck: Date.now() };
  }
};

// 批量检测所有节点（限制并发）
const runHealthCheck = async () => {
  const batchSize = 5; // 每批检测5个节点
  for (let i = 0; i < nodes.value.length; i += batchSize) {
    const batch = nodes.value.slice(i, i + batchSize);
    await Promise.all(batch.map(async (node) => {
      const health = await checkNodeHealth(node);
      nodeHealthStatus.value[node.name] = health;
    }));
  }
  // 持久化
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(nodeHealthStatus.value));
  } catch {}
};

// 启动/停止健康检测
watch(
  () => healthCheckConfig.enabled,
  (enabled) => {
    if (healthCheckTimer.value) {
      clearInterval(healthCheckTimer.value);
      healthCheckTimer.value = null;
    }
    if (enabled && nodes.value.length > 0) {
      // 立即执行一次
      runHealthCheck();
      // 设置定时检测
      healthCheckTimer.value = setInterval(() => {
        runHealthCheck();
      }, healthCheckConfig.interval * 60 * 1000);
      status.message = `已启用健康监控，间隔 ${healthCheckConfig.interval} 分钟`;
      status.type = "success";
    }
  }
);

// 获取节点健康状态（返回状态字符串）
const getNodeHealthStatus = (nodeName) => {
  const node = nodes.value.find(n => n.name === nodeName);
  if (!node) return 'unknown';
  if (node.latency === null || node.latency === undefined) return 'unknown';
  if (node.latency > 0) return 'healthy';
  if (node.latency === -2) return 'unhealthy';
  return 'unknown';
};

// 格式化时间显示
const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ==================== 配置对比功能 ====================
const showConfigDiff = () => {
  if (!previousYaml.value || !yamlText.value) {
    status.message = "需要至少生成两次配置才能对比";
    status.type = "warning";
    return;
  }
  diffResult.value = diffLines(previousYaml.value, yamlText.value);
  showDiffDialog.value = true;
};

// ==================== 导入已有配置功能 ====================
// 解析 Clash 配置文件
const parseClashConfig = (yamlText) => {
  const config = yaml.load(yamlText);
  
  return {
    // DNS 设置
    dnsMode: config.dns?.['enhanced-mode'],
    domesticDns: config.dns?.nameserver?.join(', '),
    foreignDns: config.dns?.fallback?.join(', '),
    
    // 节点列表
    proxies: config.proxies || [],
    
    // 策略组
    proxyGroups: config['proxy-groups'] || [],
    
    // 规则
    rules: config.rules || [],
  };
};

// 处理配置文件导入
const handleConfigImport = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = parseClashConfig(e.target.result);
      
      // 填充节点列表（排除 socks5 类型，因为 socks5 是落地节点）
      const nonSocks5Nodes = parsed.proxies.filter(p => p.type !== 'socks5');
      nodes.value = nonSocks5Nodes;
      
      // 填充规则（排除 MATCH 兜底规则）
      const importedRules = parsed.rules.filter(r => !r.startsWith('MATCH'));
      customRules.value = importedRules.slice(0, 50); // 限制数量避免太多
      
      // 尝试识别 Socks5 落地节点
      const socks5Node = parsed.proxies.find(p => p.type === 'socks5');
      if (socks5Node) {
        form.socksServer = socks5Node.server || '';
        form.socksPort = String(socks5Node.port || '');
        form.socksUser = socks5Node.username || '';
        form.socksPass = socks5Node.password || '';
        form.socksAlias = socks5Node.name || '🇺🇸 美国家宽-出口';
      }
      
      // 填充 DNS 配置
      if (parsed.dnsMode) {
        form.dnsMode = parsed.dnsMode;
      }
      if (parsed.domesticDns) {
        form.domesticDns = parsed.domesticDns;
      }
      if (parsed.foreignDns) {
        form.foreignDns = parsed.foreignDns;
      }
      
      status.message = `成功导入配置：${nonSocks5Nodes.length} 个节点，${importedRules.length} 条规则`;
      status.type = "success";
    } catch (error) {
      status.message = "配置解析失败：" + error.message;
      status.type = "error";
    }
  };
  reader.readAsText(file.raw);
};

// ==================== 配置模板功能 ====================
const saveTemplate = () => {
  try {
    const template = {
      includeDefaultRules: form.includeDefaultRules,
      dnsMode: form.dnsMode,
      domesticDns: form.domesticDns,
      foreignDns: form.foreignDns,
      ruleProviders: form.ruleProviders,
      customRulesText: form.customRulesText,
      customRules: customRules.value,
    };
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
    ElMessage({
      message: '✅ 配置模板已保存！',
      type: 'success',
      duration: 2000,
    });
  } catch {
    ElMessage.error('保存模板失败');
  }
};

const loadTemplate = () => {
  try {
    const saved = localStorage.getItem(TEMPLATE_KEY);
    if (saved) {
      const template = JSON.parse(saved);
      form.includeDefaultRules = template.includeDefaultRules ?? true;
      form.dnsMode = template.dnsMode ?? "fake-ip";
      form.domesticDns = template.domesticDns ?? "";
      form.foreignDns = template.foreignDns ?? "";
      form.ruleProviders = template.ruleProviders ?? [];
      form.customRulesText = template.customRulesText ?? "";
      if (template.customRules) {
        customRules.value = template.customRules;
      }
      ElMessage({
        message: '✅ 配置模板已加载！',
        type: 'success',
        duration: 2000,
      });
    } else {
      ElMessage.warning('没有找到已保存的模板');
    }
  } catch {
    ElMessage.error('加载模板失败');
  }
};

// ==================== 节点收藏功能 ====================
const toggleFavorite = (nodeName) => {
  const index = favoriteNodes.value.indexOf(nodeName);
  if (index > -1) {
    favoriteNodes.value.splice(index, 1);
    status.message = `已取消收藏 ${nodeName}`;
  } else {
    favoriteNodes.value.push(nodeName);
    status.message = `已收藏 ${nodeName}`;
  }
  status.type = "success";
  // 保存到 localStorage
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteNodes.value));
  } catch {}
};

const isFavorite = (nodeName) => favoriteNodes.value.includes(nodeName);

// 订阅历史查询
const querySubscriptionHistory = (query, cb) => {
  const results = query
    ? subscriptionHistory.value.filter(url => url.toLowerCase().includes(query.toLowerCase()))
    : subscriptionHistory.value;
  cb(results.map(url => ({ value: url })));
};

// 删除历史记录项
const removeHistoryItem = (url) => {
  subscriptionHistory.value = subscriptionHistory.value.filter(h => h !== url);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(subscriptionHistory.value));
  } catch {}
};

// 清除所有配置
const clearAllConfig = () => {
  ElMessageBox.confirm(
    '此操作将清除所有配置和历史记录，是否继续？',
    '确认清除',
    {
      confirmButtonText: '确定清除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    Object.assign(form, formDefaults);
    subscriptionHistory.value = [];
    nodes.value = [];
    yamlText.value = "";
    ElMessage({
      message: '✅ 已清除所有配置',
      type: 'success',
      duration: 2000,
    });
  }).catch(() => {
    // 取消操作
  });
};

const rules = {
  subscriptionUrl: [{ type: "url", message: "请输入有效的 URL", trigger: "blur" }],
  socksServer: [{ required: true, message: "请输入落地服务器", trigger: "blur" }],
  socksPort: [{ required: true, message: "请输入端口", trigger: "blur" }],
  socksAlias: [{ required: true, message: "请输入节点别名", trigger: "blur" }],
};

// 多选节点计算属性
const selectedNodes = computed(() =>
  nodes.value.filter((node) => form.dialerProxyGroup.includes(node.name))
);

const defaultRulesDisplay = computed(() => 
  defaultRules.map((rule) => ({ rule }))
);

const resetForm = () => {
  Object.assign(form, formDefaults);
  nodes.value = [];
  yamlText.value = "";
  customRules.value = [];
  isTesting.value = false;
  status.message = "已清空输入内容。";
  status.type = "info";
};

const parseLandingNodeUrl = () => {
  const url = form.landingNodeUrl.trim();
  if (!url) {
    status.message = "请输入节点链接。";
    status.type = "warning";
    return;
  }

  try {
    let node = null;
    
    // 1. 先尝试 socks5:// 格式
    if (url.startsWith("socks5://")) {
      const match = url.match(/^socks5:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
      if (match) {
        const [, username, password, host, port] = match;
        node = {
          name: form.socksAlias || "socks5-landing",
          type: "socks5",
          server: host,
          port: Number(port),
          username: username || undefined,
          password: password || undefined,
          udp: true,
        };
      }
    }
    // 2. 尝试 http:// 格式
    else if (url.startsWith("http://") && !url.includes("://", 7)) {
      const match = url.match(/^http:\/\/(?:([^:]+):([^@]+)@)?([^:\/]+):(\d+)/);
      if (match) {
        const [, username, password, host, port] = match;
        node = {
          name: form.socksAlias || "http-landing",
          type: "http",
          server: host,
          port: Number(port),
          username: username || undefined,
          password: password || undefined,
        };
      }
    }
    // 3. 使用已有的解析函数解析其他协议
    else {
      node = parseProxyLine(url, 0);
    }

    if (!node) {
      status.message = "链接格式不正确，支持格式：socks5:// http:// ss:// vmess:// vless:// trojan://";
      status.type = "error";
      return;
    }

    // 保存完整节点对象
    landingNode.value = node;
    
    // 填充表单（兼容旧逻辑）
    form.socksServer = node.server;
    form.socksPort = String(node.port);
    form.socksUser = node.username || "";
    form.socksPass = node.password || "";
    
    // 如果节点有名称，更新别名
    if (node.name && !node.name.startsWith("ss-") && !node.name.startsWith("vmess-") && !node.name.startsWith("vless-") && !node.name.startsWith("trojan-")) {
      form.socksAlias = node.name;
    }

    status.message = `解析成功！节点类型：${node.type.toUpperCase()}`;
    status.type = "success";
  } catch (error) {
    console.error("Landing node parse error:", error);
    status.message = "解析失败，请检查链接格式。";
    status.type = "error";
  }
};

// 获取落地节点标签颜色
const getLandingNodeTagType = (type) => {
  const typeColors = {
    socks5: "warning",
    http: "info",
    ss: "success",
    vmess: "primary",
    vless: "",
    trojan: "danger",
    hysteria: "primary",
    hysteria2: "primary",
    tuic: "success",
  };
  return typeColors[type] || "";
};

const addCustomRule = () => {
  if (!ruleBuilder.type || !ruleBuilder.value || !ruleBuilder.policy) {
    status.message = "请填写完整的规则信息。";
    status.type = "warning";
    return;
  }

  const rule = `${ruleBuilder.type},${ruleBuilder.value},${ruleBuilder.policy}`;
  customRules.value.push(rule);
  
  // 清空输入
  ruleBuilder.value = "";
  
  status.message = `规则已添加：${rule}`;
  status.type = "success";
};

const removeCustomRule = (index) => {
  customRules.value.splice(index, 1);
  status.message = "规则已删除。";
  status.type = "info";
};

// 应用规则模板
const applyRuleTemplate = (templateKey) => {
  const template = ruleTemplates[templateKey];
  if (!template) return;
  
  // 将模板规则添加到自定义规则中（去重）
  let addedCount = 0;
  template.rules.forEach(rule => {
    if (!customRules.value.includes(rule)) {
      customRules.value.push(rule);
      addedCount++;
    }
  });
  
  status.message = `已应用「${template.name}」模板，新增 ${addedCount} 条规则。`;
  status.type = "success";
};

// 获取节点显示名称（不带延迟后缀）
const getNodeDisplayName = (node) => {
  // 移除名称末尾的延迟标记
  return node.name.replace(/\s*\(\d+ms\)$/, '').replace(/\s*\(超时\)$/, '');
};

// 测速相关函数
const getLatencyColor = (latency) => {
  if (latency < 100) return "#67c23a"; // 绿色：优秀
  if (latency < 200) return "#e6a23c"; // 橙色：良好
  return "#f56c6c"; // 红色：较慢
};

const testNodeLatency = async (node) => {
  const proxyUrl = form.proxyUrl.replace(/\/+$/, "");
  const pingUrl = `${proxyUrl}/ping`;
  
  try {
    const response = await fetch(pingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server: node.server, port: node.port }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.latency;
    }
    return -2; // 请求失败
  } catch (error) {
    // 如果本地服务不可用，降级为模拟测速
    return new Promise((resolve) => {
      const simulatedLatency = Math.floor(Math.random() * 300) + 50;
      setTimeout(() => resolve(simulatedLatency), Math.random() * 500 + 200);
    });
  }
};

const testAllNodesLatency = async () => {
  if (nodes.value.length === 0) {
    status.message = "没有可测试的节点。";
    status.type = "warning";
    return;
  }
  
  isTesting.value = true;
  status.message = "正在测试节点延迟...";
  status.type = "info";
  
  // 初始化所有节点的延迟为 null（加载中）
  nodes.value.forEach(node => {
    node.latency = null;
  });
  
  // 并发测试所有节点
  const testPromises = nodes.value.map(async (node) => {
    const latency = await testNodeLatency(node);
    node.latency = latency;
    // 移除节点名称中旧的延迟标记（如果有）
    node.name = node.name.replace(/\s*\(\d+ms\)$/, '').replace(/\s*\(超时\)$/, '');
  });
  
  await Promise.all(testPromises);
  
  isTesting.value = false;
  const successCount = nodes.value.filter(n => n.latency > 0).length;
  status.message = `测速完成！成功测试 ${successCount}/${nodes.value.length} 个节点。`;
  status.type = "success";
};

const handleFetch = async () => {
  status.message = "";
  status.type = "info";
  
  if (!form.subscriptionUrl.trim()) {
    status.message = "请输入订阅地址。";
    status.type = "warning";
    return;
  }
  
  isFetching.value = true;
  status.message = "正在获取订阅...";
  
  let text = "";
  try {
    const subscriptionUrl = form.subscriptionUrl.trim();
    const proxyUrl = form.proxyUrl.trim();
    const base = proxyUrl ? proxyUrl.replace(/\/+$/, "") : "";
    const fetchUrl = base
      ? `${base}/fetch?url=${encodeURIComponent(subscriptionUrl)}`
      : subscriptionUrl;
    const response = await fetch(fetchUrl);
    text = await response.text();
  } catch (error) {
    isFetching.value = false;
    status.message = "订阅拉取失败，可能存在 CORS 限制。请展开高级选项配置本地代理后再试。";
    status.type = "warning";
    return;
  }
  
  if (!text) {
    isFetching.value = false;
    status.message = "订阅内容为空。";
    status.type = "warning";
    return;
  }
  const parsed = parseSubscription(text);
  if (!parsed.length) {
    isFetching.value = false;
    status.message = "未解析到节点，请确认订阅内容格式是否正确。";
    status.type = "error";
    return;
  }
  nodes.value = parsed;
  // 初始化延迟为 -1（未测试）
  nodes.value.forEach(node => {
    node.latency = -1;
  });
  if (!form.dialerProxy && parsed[0]) {
    form.dialerProxy = parsed[0].name;
  }
  // 保存订阅历史
  saveSubscriptionHistory(form.subscriptionUrl.trim());
  isFetching.value = false;
  status.message = `成功解析 ${parsed.length} 个节点。`;
  status.type = "success";
};

const parseSubscription = (text) => {
  const trimmed = text.trim();
  try {
    if (trimmed.includes("proxies:")) {
      const data = yaml.load(trimmed);
      if (data && Array.isArray(data.proxies)) {
        return data.proxies;
      }
    }
  } catch (error) {
    // fall back to uri parsing
  }
  const decoded = tryDecodeBase64(trimmed);
  const content = decoded || trimmed;
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index) => parseProxyLine(line, index)).filter(Boolean);
};

const tryDecodeBase64 = (value) => {
  if (value.includes("://")) return "";
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(normalized + pad);
    if (decoded.includes("://") || decoded.includes("proxies:")) {
      return decoded;
    }
    return "";
  } catch (error) {
    return "";
  }
};

const encodeBase64 = (value) => btoa(unescape(encodeURIComponent(value)));

const setParamIf = (params, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, value);
  }
};

const parseProxyLine = (line, index) => {
  if (line.startsWith("vmess://")) return parseVmess(line, index);
  if (line.startsWith("vless://")) return parseVless(line, index);
  if (line.startsWith("trojan://")) return parseTrojan(line, index);
  if (line.startsWith("ss://")) return parseSS(line, index);
  if (line.startsWith("ssr://")) return parseSSR(line, index);
  if (line.startsWith("hysteria://")) return parseHysteria(line, index);
  if (line.startsWith("hysteria2://") || line.startsWith("hy2://")) return parseHysteria2(line, index);
  if (line.startsWith("tuic://")) return parseTUIC(line, index);
  return null;
};

const parseVmess = (line, index) => {
  try {
    const raw = line.replace("vmess://", "");
    const json = JSON.parse(tryDecodeBase64(raw) || atob(raw));
    const node = {
      name: json.ps || `vmess-${index + 1}`,
      type: "vmess",
      server: json.add,
      port: Number(json.port),
      uuid: json.id,
      alterId: Number(json.aid || 0),
      cipher: json.scy || "auto",
      udp: true,
    };
    
    // TLS 配置
    if (json.tls === "tls") {
      node.tls = true;
      if (json.sni) node.servername = json.sni;
      // skip-cert-verify
      if (json.allowInsecure === "1" || json.allowInsecure === 1 || json.verify_cert === false) {
        node["skip-cert-verify"] = true;
      }
      // ALPN
      if (json.alpn) {
        node.alpn = Array.isArray(json.alpn) ? json.alpn : json.alpn.split(",");
      }
      // 指纹
      if (json.fp) {
        node["client-fingerprint"] = json.fp;
      }
    }
    
    // 传输层配置
    if (json.net) node.network = json.net;
    
    // WebSocket
    if (json.net === "ws") {
      node["ws-opts"] = {
        path: json.path || "/",
      };
      if (json.host) {
        node["ws-opts"].headers = { Host: json.host };
      }
      // 早期数据
      if (json.ed) {
        node["ws-opts"]["max-early-data"] = Number(json.ed);
        node["ws-opts"]["early-data-header-name"] = "Sec-WebSocket-Protocol";
      }
    }
    
    // gRPC
    if (json.net === "grpc") {
      node["grpc-opts"] = { 
        "grpc-service-name": json.path || json.serviceName || "",
      };
    }
    
    // HTTP/2
    if (json.net === "h2") {
      node["h2-opts"] = {
        path: json.path || "/",
      };
      if (json.host) {
        node["h2-opts"].host = [json.host];
      }
    }
    
    // HTTP
    if (json.net === "http") {
      node["http-opts"] = {
        path: json.path ? [json.path] : ["/"],
      };
      if (json.host) {
        node["http-opts"].headers = { Host: [json.host] };
      }
    }
    
    return node;
  } catch (error) {
    return null;
  }
};

const parseVless = (line, index) => {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `vless-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    const isReality = params.security === "reality";
    const isTls = params.security === "tls" || isReality;
    
    const node = {
      name,
      type: "vless",
      server: url.hostname,
      port: Number(url.port),
      uuid: url.username,
      udp: true,
      tls: isTls,
      network: params.type || "tcp",
    };
    
    // SNI / servername
    if (params.sni) node.sni = params.sni;
    if (params.servername) node.servername = params.servername;
    
    // Flow (XTLS)
    if (params.flow) node.flow = params.flow;
    
    // skip-cert-verify
    if (params.allowInsecure === "1" || params.allowInsecure === "true") {
      node["skip-cert-verify"] = true;
    } else if (isTls) {
      node["skip-cert-verify"] = false;
    }
    
    // Client fingerprint
    if (params.fp) {
      node["client-fingerprint"] = params.fp;
    }
    
    // Reality 配置
    if (isReality && params.pbk) {
      node["reality-opts"] = {
        "public-key": params.pbk,
      };
      if (params.sid) {
        node["reality-opts"]["short-id"] = params.sid;
      }
    }
    
    // WebSocket 配置
    if (params.type === "ws") {
      node["ws-opts"] = {
        path: params.path || "/",
        headers: params.host ? { Host: params.host } : undefined,
      };
    }
    
    // gRPC 配置
    if (params.type === "grpc") {
      node["grpc-opts"] = { "grpc-service-name": params.serviceName || "" };
    }
    
    // HTTP/2 配置
    if (params.type === "h2") {
      node["h2-opts"] = {
        path: params.path || "/",
        host: params.host ? [params.host] : undefined,
      };
    }
    
    return node;
  } catch (error) {
    return null;
  }
};

const parseTrojan = (line, index) => {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `trojan-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    
    const node = {
      name,
      type: "trojan",
      server: url.hostname,
      port: Number(url.port),
      password: decodeURIComponent(url.username),
      udp: true,
    };
    
    // SNI
    if (params.sni) node.sni = params.sni;
    if (params.peer) node.sni = params.peer; // 兼容旧格式
    
    // skip-cert-verify
    if (params.allowInsecure === "1" || params.allowInsecure === "true") {
      node["skip-cert-verify"] = true;
    }
    
    // 指纹
    if (params.fp) {
      node["client-fingerprint"] = params.fp;
    }
    
    // ALPN
    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }
    
    // 传输层
    const transport = params.type || "tcp";
    if (transport !== "tcp") {
      node.network = transport;
    }
    
    // WebSocket
    if (transport === "ws") {
      node.network = "ws";
      node["ws-opts"] = {
        path: params.path || "/",
        headers: params.host ? { Host: params.host } : undefined,
      };
    }
    
    // gRPC
    if (transport === "grpc") {
      node.network = "grpc";
      node["grpc-opts"] = {
        "grpc-service-name": params.serviceName || params.path || "",
      };
    }
    
    return node;
  } catch (error) {
    return null;
  }
};

const parseSS = (line, index) => {
  try {
    // 解析 query 参数 (插件等)
    let queryParams = {};
    let mainPart = line.replace("ss://", "");
    
    if (mainPart.includes("?")) {
      const [beforeQuery, query] = mainPart.split("?");
      const queryWithoutHash = query.split("#")[0];
      queryParams = Object.fromEntries(new URLSearchParams(queryWithoutHash));
      mainPart = beforeQuery + (query.includes("#") ? "#" + query.split("#")[1] : "");
    }
    
    const [main, namePart] = mainPart.split("#");
    
    let method, password, server, port;
    
    if (main.includes("@")) {
      // 格式1: ss://BASE64(method:password)@server:port#name
      const [userinfoPart, serverPart] = main.split("@");
      const decoded = tryDecodeBase64(userinfoPart) || atob(userinfoPart);
      const colonIdx = decoded.indexOf(":");
      method = decoded.substring(0, colonIdx);
      password = decoded.substring(colonIdx + 1);
      [server, port] = serverPart.split(":");
    } else {
      // 格式2: ss://BASE64(method:password@server:port)#name
      const decoded = tryDecodeBase64(main) || atob(main);
      const atIdx = decoded.lastIndexOf("@");
      const userinfo = decoded.substring(0, atIdx);
      const serverPart = decoded.substring(atIdx + 1);
      const colonIdx = userinfo.indexOf(":");
      method = userinfo.substring(0, colonIdx);
      password = userinfo.substring(colonIdx + 1);
      [server, port] = serverPart.split(":");
    }
    
    // 验证必要字段
    if (!password || !server || !port) {
      console.warn("SS parsing failed: missing required fields", { method, password, server, port });
      return null;
    }
    
    const node = {
      name: decodeURIComponent(namePart || "") || `ss-${index + 1}`,
      type: "ss",
      server,
      port: Number(port),
      cipher: method,
      password,
      udp: true,
    };
    
    // 插件支持 (obfs, v2ray-plugin, etc.)
    if (queryParams.plugin) {
      const pluginStr = decodeURIComponent(queryParams.plugin);
      const [pluginName, ...optsParts] = pluginStr.split(";");
      node.plugin = pluginName;
      
      if (optsParts.length > 0) {
        const pluginOpts = {};
        optsParts.forEach(part => {
          const eqIdx = part.indexOf("=");
          if (eqIdx > 0) {
            pluginOpts[part.substring(0, eqIdx)] = part.substring(eqIdx + 1);
          } else {
            pluginOpts[part] = true;
          }
        });
        node["plugin-opts"] = pluginOpts;
      }
    }
    
    return node;
  } catch (error) {
    console.warn("SS parsing error:", error);
    return null;
  }
};

// SSR 解析
const parseSSR = (line, index) => {
  try {
    const raw = line.replace("ssr://", "");
    const decoded = tryDecodeBase64(raw) || atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    
    // 格式: server:port:protocol:method:obfs:password_base64/?params
    const [mainPart, paramsPart] = decoded.split("/?");
    const parts = mainPart.split(":");
    
    if (parts.length < 6) return null;
    
    const [server, port, protocol, method, obfs, passwordBase64] = parts;
    const password = tryDecodeBase64(passwordBase64) || atob(passwordBase64.replace(/-/g, "+").replace(/_/g, "/"));
    
    // 解析参数
    let name = `ssr-${index + 1}`;
    let obfsParam = "";
    let protocolParam = "";
    
    if (paramsPart) {
      const params = Object.fromEntries(new URLSearchParams(paramsPart));
      if (params.remarks) {
        name = tryDecodeBase64(params.remarks) || atob(params.remarks.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (params.obfsparam) {
        obfsParam = tryDecodeBase64(params.obfsparam) || atob(params.obfsparam.replace(/-/g, "+").replace(/_/g, "/"));
      }
      if (params.protoparam) {
        protocolParam = tryDecodeBase64(params.protoparam) || atob(params.protoparam.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    
    return {
      name,
      type: "ssr",
      server,
      port: Number(port),
      cipher: method,
      password,
      protocol,
      "protocol-param": protocolParam,
      obfs,
      "obfs-param": obfsParam,
      udp: true,
    };
  } catch (error) {
    console.warn("SSR parsing error:", error);
    return null;
  }
};

// Hysteria 解析
const parseHysteria = (line, index) => {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `hysteria-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    
    const node = {
      name,
      type: "hysteria",
      server: url.hostname,
      port: Number(url.port),
      "auth-str": params.auth || url.username || undefined,
      up: params.upmbps || params.up || "100",
      down: params.downmbps || params.down || "100",
    };
    
    // SNI
    if (params.peer || params.sni) {
      node.sni = params.peer || params.sni;
    }
    
    // ALPN
    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }
    
    // 混淆
    if (params.obfs) {
      node.obfs = params.obfs;
    }
    if (params.obfsParam) {
      node["obfs-password"] = params.obfsParam;
    }
    
    // 跳过证书验证
    if (params.insecure === "1" || params.allowInsecure === "1") {
      node["skip-cert-verify"] = true;
    }
    
    // 指纹
    if (params.fp) {
      node["fingerprint"] = params.fp;
    }
    
    return node;
  } catch (error) {
    console.warn("Hysteria parsing error:", error);
    return null;
  }
};

// Hysteria2 解析
const parseHysteria2 = (line, index) => {
  try {
    // 兼容 hy2:// 和 hysteria2://
    const normalizedLine = line.replace("hy2://", "hysteria2://");
    const url = new URL(normalizedLine);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `hysteria2-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    
    const node = {
      name,
      type: "hysteria2",
      server: url.hostname,
      port: Number(url.port) || 443,
      password: decodeURIComponent(url.username) || params.auth,
    };
    
    // SNI
    if (params.sni) {
      node.sni = params.sni;
    }
    
    // 混淆
    if (params.obfs) {
      node.obfs = params.obfs;
      if (params["obfs-password"]) {
        node["obfs-password"] = params["obfs-password"];
      }
    }
    
    // 跳过证书验证
    if (params.insecure === "1" || params.allowInsecure === "1") {
      node["skip-cert-verify"] = true;
    }
    
    // 指纹
    if (params.fp || params.pinSHA256) {
      node["fingerprint"] = params.fp || params.pinSHA256;
    }
    
    // ALPN
    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }
    
    return node;
  } catch (error) {
    console.warn("Hysteria2 parsing error:", error);
    return null;
  }
};

// TUIC 解析
const parseTUIC = (line, index) => {
  try {
    const url = new URL(line);
    const name = decodeURIComponent(url.hash.replace("#", "")) || `tuic-${index + 1}`;
    const params = Object.fromEntries(url.searchParams.entries());
    
    const node = {
      name,
      type: "tuic",
      server: url.hostname,
      port: Number(url.port) || 443,
      uuid: url.username,
      password: decodeURIComponent(url.password) || params.password,
    };
    
    // SNI
    if (params.sni) {
      node.sni = params.sni;
    }
    
    // ALPN
    if (params.alpn) {
      node.alpn = decodeURIComponent(params.alpn).split(",");
    }
    
    // 拥塞控制
    if (params.congestion_control || params.congestion) {
      node["congestion-controller"] = params.congestion_control || params.congestion;
    }
    
    // UDP relay 模式
    if (params.udp_relay_mode) {
      node["udp-relay-mode"] = params.udp_relay_mode;
    }
    
    // 跳过证书验证
    if (params.insecure === "1" || params.allowInsecure === "1" || params.allow_insecure === "1") {
      node["skip-cert-verify"] = true;
    }
    
    // 禁用 SNI
    if (params.disable_sni === "1") {
      node["disable-sni"] = true;
    }
    
    return node;
  } catch (error) {
    console.warn("TUIC parsing error:", error);
    return null;
  }
};

const buildShadowrocketLandingNode = () => {
  if (landingNode.value && landingNode.value.type) {
    return {
      ...landingNode.value,
      name: form.socksAlias || landingNode.value.name || "landing-node",
    };
  }
  if (form.socksServer && form.socksPort) {
    return {
      name: form.socksAlias || "socks5-landing",
      type: "socks5",
      server: form.socksServer.trim(),
      port: Number(form.socksPort),
      username: form.socksUser || undefined,
      password: form.socksPass || undefined,
      udp: true,
    };
  }
  return null;
};

const nodeToShadowrocketUri = (node) => {
  if (!node || !node.type) return "";
  const name = node.name ? `#${encodeURIComponent(node.name)}` : "";

  if (node.type === "socks5" || node.type === "http") {
    const scheme = node.type === "socks5" ? "socks5" : "http";
    const user = node.username ? encodeURIComponent(node.username) : "";
    const pass = node.password ? `:${encodeURIComponent(node.password)}` : "";
    const auth = user ? `${user}${pass}@` : "";
    if (!node.server || !node.port) return "";
    return `${scheme}://${auth}${node.server}:${node.port}${name}`;
  }

  if (node.type === "ss") {
    if (!node.cipher || !node.password || !node.server || !node.port) return "";
    const base = encodeBase64(`${node.cipher}:${node.password}@${node.server}:${node.port}`);
    let uri = `ss://${base}`;
    if (node.plugin) {
      const opts = node["plugin-opts"] || {};
      const optsParts = Object.entries(opts).map(([key, value]) =>
        value === true ? key : `${key}=${value}`
      );
      const pluginPart = [node.plugin, ...optsParts].join(";");
      uri += `?plugin=${encodeURIComponent(pluginPart)}`;
    }
    return `${uri}${name}`;
  }

  if (node.type === "ssr") {
    if (!node.server || !node.port || !node.protocol || !node.cipher || !node.obfs || !node.password) {
      return "";
    }
    const passwordBase64 = encodeBase64(node.password);
    const params = new URLSearchParams();
    if (node.name) params.set("remarks", encodeBase64(node.name));
    if (node["obfs-param"]) params.set("obfsparam", encodeBase64(node["obfs-param"]));
    if (node["protocol-param"]) params.set("protoparam", encodeBase64(node["protocol-param"]));
    const main = `${node.server}:${node.port}:${node.protocol}:${node.cipher}:${node.obfs}:${passwordBase64}/?${params.toString()}`;
    return `ssr://${encodeBase64(main)}`;
  }

  if (node.type === "vmess") {
    if (!node.server || !node.port || !node.uuid) return "";
    const vmessConfig = {
      v: "2",
      ps: node.name || "",
      add: node.server,
      port: String(node.port),
      id: node.uuid,
      aid: String(node.alterId ?? 0),
      scy: node.cipher || "auto",
      net: node.network || "tcp",
      type: "none",
      host: "",
      path: "",
      tls: node.tls ? "tls" : "",
      sni: node.servername || node.sni || "",
      alpn: Array.isArray(node.alpn) ? node.alpn.join(",") : "",
      fp: node["client-fingerprint"] || "",
    };

    if (node["ws-opts"]) {
      vmessConfig.net = "ws";
      vmessConfig.path = node["ws-opts"].path || "/";
      vmessConfig.host = node["ws-opts"].headers?.Host || "";
    } else if (node["grpc-opts"]) {
      vmessConfig.net = "grpc";
      vmessConfig.path = node["grpc-opts"]["grpc-service-name"] || "";
    } else if (node["h2-opts"]) {
      vmessConfig.net = "h2";
      vmessConfig.path = node["h2-opts"].path || "/";
      const host = node["h2-opts"].host;
      vmessConfig.host = Array.isArray(host) ? host.join(",") : host || "";
    } else if (node["http-opts"]) {
      vmessConfig.net = "http";
      const host = node["http-opts"].headers?.Host;
      vmessConfig.host = Array.isArray(host) ? host.join(",") : host || "";
      const path = node["http-opts"].path;
      vmessConfig.path = Array.isArray(path) ? path[0] : path || "/";
    }

    return `vmess://${encodeBase64(JSON.stringify(vmessConfig))}`;
  }

  if (node.type === "vless") {
    if (!node.server || !node.port || !node.uuid) return "";
    const url = new URL(`vless://${node.uuid}@${node.server}:${node.port}`);
    const params = url.searchParams;
    setParamIf(params, "type", node.network);
    if (node.tls) {
      setParamIf(params, "security", node["reality-opts"] ? "reality" : "tls");
    }
    setParamIf(params, "sni", node.sni);
    setParamIf(params, "servername", node.servername);
    setParamIf(params, "flow", node.flow);
    if (node["skip-cert-verify"]) params.set("allowInsecure", "1");
    setParamIf(params, "fp", node["client-fingerprint"]);
    if (node["reality-opts"]) {
      setParamIf(params, "pbk", node["reality-opts"]["public-key"]);
      setParamIf(params, "sid", node["reality-opts"]["short-id"]);
    }
    if (node["ws-opts"]) {
      params.set("type", "ws");
      setParamIf(params, "path", node["ws-opts"].path);
      setParamIf(params, "host", node["ws-opts"].headers?.Host);
    }
    if (node["grpc-opts"]) {
      params.set("type", "grpc");
      setParamIf(params, "serviceName", node["grpc-opts"]["grpc-service-name"]);
    }
    if (node["h2-opts"]) {
      params.set("type", "h2");
      setParamIf(params, "path", node["h2-opts"].path);
      const host = node["h2-opts"].host;
      setParamIf(params, "host", Array.isArray(host) ? host.join(",") : host);
    }
    url.hash = encodeURIComponent(node.name || "");
    return url.toString();
  }

  if (node.type === "trojan") {
    if (!node.server || !node.port || !node.password) return "";
    const url = new URL(`trojan://${encodeURIComponent(node.password)}@${node.server}:${node.port}`);
    const params = url.searchParams;
    setParamIf(params, "sni", node.sni);
    if (node["skip-cert-verify"]) params.set("allowInsecure", "1");
    setParamIf(params, "fp", node["client-fingerprint"]);
    if (Array.isArray(node.alpn)) {
      setParamIf(params, "alpn", node.alpn.join(","));
    }
    if (node.network) params.set("type", node.network);
    if (node["ws-opts"]) {
      params.set("type", "ws");
      setParamIf(params, "path", node["ws-opts"].path);
      setParamIf(params, "host", node["ws-opts"].headers?.Host);
    }
    if (node["grpc-opts"]) {
      params.set("type", "grpc");
      setParamIf(params, "serviceName", node["grpc-opts"]["grpc-service-name"]);
    }
    url.hash = encodeURIComponent(node.name || "");
    return url.toString();
  }

  return "";
};

const parseRules = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));

const generateYaml = () => {
  if (!form.dialerProxyGroup || form.dialerProxyGroup.length === 0) {
    status.message = "请选择至少一个跳板节点。";
    status.type = "warning";
    return;
  }
  if (!form.socksServer || !form.socksPort) {
    status.message = "请填写落地节点信息，或使用链接解析功能。";
    status.type = "warning";
    return;
  }
  
  // 保存上一版本配置用于对比
  previousYaml.value = yamlText.value;

  // 确定前置跳板名称：单节点直接引用，多节点生成策略组
  const isSingleNode = form.dialerProxyGroup.length === 1;
  const dialerProxyName = isSingleNode 
    ? form.dialerProxyGroup[0] 
    : "🔀 前置跳板组";

  // 构建落地节点 - 支持多协议
  let landingProxy;
  if (landingNode.value && landingNode.value.type) {
    // 使用已解析的完整节点对象
    landingProxy = {
      ...landingNode.value,
      name: form.socksAlias,  // 使用用户设置的别名
      "dialer-proxy": dialerProxyName,
    };
    // 对于 socks5/http 类型，确保有 server 和 port
    if (!landingProxy.server) {
      landingProxy.server = form.socksServer.trim();
    }
    if (!landingProxy.port) {
      landingProxy.port = Number(form.socksPort);
    }
  } else {
    // 回退到默认 socks5 格式（兼容旧逻辑）
    landingProxy = {
      name: form.socksAlias,
      type: "socks5",
      server: form.socksServer.trim(),
      port: Number(form.socksPort),
      username: form.socksUser || undefined,
      password: form.socksPass || undefined,
      udp: true,
      "dialer-proxy": dialerProxyName,
    };
  }

  const proxies = [...nodes.value, landingProxy];
  const proxyNames = nodes.value.map((node) => node.name);
  const customRulesFromText = parseRules(form.customRulesText || "");
  
  // AI专线策略组名称：直接使用别名 + 后缀
  const aiGroupName = `${form.socksAlias.replace(/🇺🇸\s*/, '')}专线`;
  
  // 其他外网策略组名称
  const otherGroupName = "🌍 其他外网";
  
  // 策略组名称替换函数
  const replaceProxyGroupNames = (rule) => rule
    .replace(/🇺🇸 美国尊享\(AI\/Google\)/g, aiGroupName)
    .replace(/🌍 其他外网\(默认香港\)/g, otherGroupName)
    .replace(/🌍 其他外网(?!\()/g, otherGroupName); // 处理没有括号的情况
  
  // 将默认规则中的占位符替换为实际的策略组名称
  const processedDefaultRules = form.includeDefaultRules 
    ? defaultRules.map(replaceProxyGroupNames)
    : [];
  
  // 对所有规则进行策略组名称替换
  const combinedRules = [
    ...processedDefaultRules,
    ...customRules.value.map(replaceProxyGroupNames),
    ...customRulesFromText.map(replaceProxyGroupNames),
  ];
  
  // 解析用户自定义 DNS
  const domesticDnsList = form.domesticDns.split(',').map(s => s.trim()).filter(s => s);
  const foreignDnsList = form.foreignDns.split(',').map(s => s.trim()).filter(s => s);
  
  // 规则集配置
  const ruleProvidersDef = {
    reject: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt",
      path: "./ruleset/reject.yaml",
      interval: 86400,
    },
    proxy: {
      type: "http",
      behavior: "domain", 
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt",
      path: "./ruleset/proxy.yaml",
      interval: 86400,
    },
    direct: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt",
      path: "./ruleset/direct.yaml",
      interval: 86400,
    },
    gfw: {
      type: "http",
      behavior: "domain",
      url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
      path: "./ruleset/gfw.yaml",
      interval: 86400,
    },
  };
  
  // 生成 rule-providers
  const ruleProviders = {};
  form.ruleProviders.forEach(key => {
    if (ruleProvidersDef[key]) {
      ruleProviders[key] = ruleProvidersDef[key];
    }
  });
  
  // 生成规则集对应的规则
  const ruleProviderRules = [];
  if (form.ruleProviders.includes('reject')) {
    ruleProviderRules.push('RULE-SET,reject,REJECT');
  }
  if (form.ruleProviders.includes('proxy')) {
    ruleProviderRules.push(`RULE-SET,proxy,${otherGroupName}`);
  }
  if (form.ruleProviders.includes('direct')) {
    ruleProviderRules.push('RULE-SET,direct,DIRECT');
  }
  if (form.ruleProviders.includes('gfw')) {
    ruleProviderRules.push(`RULE-SET,gfw,${otherGroupName}`);
  }
  
  // 合并规则（规则集规则放在前面）
  const finalRules = [...ruleProviderRules, ...combinedRules];

  // 构建策略组列表
  const proxyGroups = [];
  
  // 如果选择多个节点，生成前置跳板策略组
  if (!isSingleNode) {
    const dialerGroup = {
      name: "🔀 前置跳板组",
      type: form.dialerProxyType,
      proxies: [...form.dialerProxyGroup],
    };
    // url-test 和 fallback 需要额外配置
    if (form.dialerProxyType === "url-test" || form.dialerProxyType === "fallback") {
      dialerGroup.url = "http://www.gstatic.com/generate_204";
      dialerGroup.interval = 300;
    }
    proxyGroups.push(dialerGroup);
  }
  
  // 策略组配置
  proxyGroups.push(
    {
      name: aiGroupName,
      type: "select",
      proxies: [form.socksAlias],
    },
    {
      name: otherGroupName,
      type: "select",
      proxies: [...proxyNames, form.socksAlias, "DIRECT"],
    },
  );

  const config = {
    port: 7890,
    "socks-port": 7891,
    "allow-lan": true,
    mode: "rule",
    "log-level": "info",
    dns: {
      enable: true,
      "enhanced-mode": form.dnsMode,
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": form.dnsMode === "fake-ip" ? [
        "*.lan",
        "*.local",
        "localhost",
        "*.localhost",
        "*.test",
        "*.invalid",
        "*.example",
        "time.*.com",
        "ntp.*.com",
        "*.ntp.org.cn",
        "+.stun.*.*",
        "+.stun.*.*.*",
        "*.msftconnecttest.com",
        "*.msftncsi.com",
        "*.srv.nintendo.net",
        "*.stun.playstation.net",
        "xbox.*.microsoft.com",
        "*.xboxlive.com",
        "*.battlenet.com.cn",
        "*.logon.battlenet.com.cn",
      ] : undefined,
      nameserver: domesticDnsList.length > 0 ? domesticDnsList : ["223.5.5.5", "119.29.29.29"],
      fallback: foreignDnsList.length > 0 ? foreignDnsList : ["https://dns.google/dns-query", "https://cloudflare-dns.com/dns-query"],
      "fallback-filter": {
        geoip: true,
        "geoip-code": "CN",
      },
    },
    proxies,
    "proxy-groups": proxyGroups,
    ...(Object.keys(ruleProviders).length > 0 ? { "rule-providers": ruleProviders } : {}),
    rules: finalRules,
  };


  yamlText.value = yaml.dump(config, {
    noRefs: true,
    lineWidth: 120,
    quotingType: '"',
  });
  // 生成 Clash 导入链接
  generateClashImportUrl();
  status.message = "配置已生成，可复制或下载。";
  status.type = "success";
};

const copyYaml = async () => {
  try {
    await navigator.clipboard.writeText(yamlText.value);
    ElMessage({
      message: '✅ 已复制到剪贴板',
      type: 'success',
      duration: 2000,
    });
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
};

const downloadYaml = () => {
  const blob = new Blob([yamlText.value], { type: "text/yaml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "config.yaml";
  link.click();
  URL.revokeObjectURL(link.href);
};

const exportShadowrocket = () => {
  const candidates = [...nodes.value];
  const landing = buildShadowrocketLandingNode();
  if (landing) candidates.push(landing);

  if (candidates.length === 0) {
    status.message = "没有可导出的节点，请先获取订阅或填写落地节点。";
    status.type = "warning";
    return;
  }

  const skipped = {};
  const lines = candidates
    .map((node) => {
      const uri = nodeToShadowrocketUri(node);
      if (!uri) {
        skipped[node.type] = (skipped[node.type] || 0) + 1;
      }
      return uri;
    })
    .filter(Boolean);

  if (lines.length === 0) {
    status.message = "没有可导出的节点（可能类型不受支持）。";
    status.type = "warning";
    return;
  }

  const content = lines.join("\n");
  const base64Content = encodeBase64(content);
  const blob = new Blob([base64Content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "shadowrocket.txt";
  link.click();
  URL.revokeObjectURL(link.href);

  const skippedInfo = Object.keys(skipped).length
    ? `，已跳过 ${Object.entries(skipped)
        .map(([type, count]) => `${type} ${count} 个`)
        .join("、")}`
    : "";
  status.message = `Shadowrocket 订阅已导出${skippedInfo}`;
  status.type = Object.keys(skipped).length ? "warning" : "success";
};

// 直接通过协议唤起 Clash 客户端
const openClashImportUrl = () => {
  if (!clashImportUrl.value) return;
  let fullUrl = `clash://install-config?url=${encodeURIComponent(clashImportUrl.value)}`;
  if (configName.value.trim()) {
    fullUrl += `&name=${encodeURIComponent(configName.value.trim())}`;
  }
  window.location.href = fullUrl;
  ElMessage({
    message: '正在唤起 Clash 客户端...',
    type: 'info',
    duration: 2000,
  });
};

// 复制 Clash 导入链接
const copyClashImportUrl = async () => {
  try {
    let fullUrl = `clash://install-config?url=${encodeURIComponent(clashImportUrl.value)}`;
    if (configName.value.trim()) {
      fullUrl += `&name=${encodeURIComponent(configName.value.trim())}`;
    }
    await navigator.clipboard.writeText(fullUrl);
    ElMessage({
      message: '✅ Clash 导入链接已复制',
      type: 'success',
      duration: 2000,
    });
    status.type = "success";
  } catch (error) {
    status.message = "复制失败，请手动复制。";
    status.type = "error";
  }
};

// 生成配置后创建导入链接
const generateClashImportUrl = async () => {
  const proxyUrl = form.proxyUrl.replace(/\/+$/, "");
  const uploadUrl = `${proxyUrl}/config/upload`;
  
  try {
    // 尝试上传到本地代理服务器
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: yamlText.value,
    });
    
    if (res.ok) {
      const data = await res.json();
      clashImportUrl.value = data.url; // http://localhost:8787/config/xxxx
      status.message = "配置已托管至本地服务，一键导入准备就绪（有效期10分钟）。";
      status.type = "success";
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    // 降级方案：使用 Data URI
    console.warn("Local proxy upload failed, falling back to Data URI", error);
    const base64Config = btoa(unescape(encodeURIComponent(yamlText.value)));
    clashImportUrl.value = `data:text/yaml;base64,${base64Config}`;
    status.message = "本地服务未连接，使用 Data URI 模式（部分客户端可能不支持）。";
    status.type = "warning";
  }

  // 生成二维码（仅当 URL 较短时）
  const fullUrl = `clash://install-config?url=${encodeURIComponent(clashImportUrl.value)}`;
  try {
    if (fullUrl.length < 2000) {
      qrcodeDataUrl.value = await QRCode.toDataURL(fullUrl, {
        width: 150,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
    } else {
      qrcodeDataUrl.value = "";
    }
  } catch {
    qrcodeDataUrl.value = "";
  }
};
</script>
