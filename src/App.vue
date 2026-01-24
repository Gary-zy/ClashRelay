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
              <el-button type="primary" @click="handleFetch" style="width: 100%;">获取节点</el-button>
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
              </el-collapse-item>
            </el-collapse>

            <el-divider content-position="left">Socks5 落地节点</el-divider>
            <el-form-item label="快速解析 Socks5 链接（可选）">
              <el-row :gutter="12" style="width: 100%;">
                <el-col :span="20">
                  <el-input v-model="form.socks5Url" placeholder="socks5://username:password@host:port" />
                </el-col>
                <el-col :span="4">
                  <el-button type="primary" @click="parseSocks5Url" style="width: 100%;">解析</el-button>
                </el-col>
              </el-row>
              <div class="helper-text">
                粘贴 Socks5 链接后点击解析，自动填充下方配置信息。
              </div>
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
            <el-form-item label="跳板节点 (Dialer-Proxy)">
              <el-select v-model="form.dialerProxy" placeholder="请选择机场节点" filterable>
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
          </el-form>
          <div v-if="selectedNode" class="selected-node">
            <div class="selected-node-title">当前选中节点</div>
            <div class="selected-node-content">
              <div><strong>名称：</strong>{{ selectedNode.name }}</div>
              <div><strong>类型：</strong>{{ selectedNode.type }}</div>
              <div><strong>服务器：</strong>{{ selectedNode.server || "—" }}:{{ selectedNode.port || "—" }}</div>
              <div v-if="selectedNode.uuid"><strong>UUID：</strong>{{ selectedNode.uuid }}</div>
              <div v-if="selectedNode.password"><strong>密码：</strong>{{ selectedNode.password.substring(0, 8) }}...</div>
              <div v-if="selectedNode.cipher"><strong>加密：</strong>{{ selectedNode.cipher }}</div>
              <div v-if="selectedNode.network"><strong>传输：</strong>{{ selectedNode.network }}</div>
              <div v-if="selectedNode.tls"><strong>TLS：</strong>已启用</div>
              <div v-if="selectedNode.sni"><strong>SNI：</strong>{{ selectedNode.sni }}</div>
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
            <el-table-column prop="name" label="节点名称" min-width="300" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="server" label="服务器" min-width="120" show-overflow-tooltip />
            <el-table-column prop="port" label="端口" width="70" />
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
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click.stop="form.dialerProxy = row.name">
                  选择
                </el-button>
              </template>
            </el-table-column>
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
            <el-button type="danger" link @click="clearAllConfig" class="clear-config-btn">清除配置</el-button>
          </el-space>
          
          <!-- 一键导入区域 -->
          <div v-if="yamlText" class="import-section">
            <el-divider content-position="left">一键导入 Clash</el-divider>
            <div class="import-box">
              <el-input 
                v-model="clashImportUrl" 
                readonly 
                placeholder="生成配置后显示导入链接"
              >
                <template #prepend>clash://</template>
                <template #append>
                  <el-button @click="copyClashImportUrl">复制</el-button>
                </template>
              </el-input>
              <div class="qr-section">
                <div v-if="qrcodeDataUrl" style="display: flex; align-items: flex-start; gap: 16px; margin-top: 12px;">
                  <img :src="qrcodeDataUrl" alt="扫码导入" class="qrcode-img" />
                  <div class="qr-tips">
                    <div class="qr-tips-title">📱 手机扫码导入</div>
                    <ul class="qr-tips-list">
                      <li><strong>Clash for Android</strong>：扫码自动导入</li>
                      <li><strong>Stash (iOS)</strong>：扫码自动导入</li>
                      <li><strong>Shadowrocket</strong>：复制链接手动添加</li>
                    </ul>
                  </div>
                </div>
                <div v-else class="helper-text" style="margin-top: 8px;">
                  配置较大，请使用"下载 config.yaml"后手动导入手机客户端
                </div>
              </div>
            </div>
          </div>
          
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
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from "vue";
import { Loading, Search } from '@element-plus/icons-vue';
import yaml from "js-yaml";
import QRCode from 'qrcode';
import { defaultRules, fakeIpFilter, ruleTypes, policyGroups } from "./config/defaultConfig.js";

// ==================== 配置持久化 ====================
const STORAGE_KEY = "clashrelay_config";
const HISTORY_KEY = "clashrelay_history";

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
  socks5Url: "",
  socksServer: "",
  socksPort: "",
  socksUser: "",
  socksPass: "",
  socksAlias: "🇺🇸 美国家宽-出口",
  dialerProxy: "",
  // DNS 配置
  dnsMode: "fake-ip",
  domesticDns: "223.5.5.5, 119.29.29.29",
  foreignDns: "https://dns.google/dns-query, https://cloudflare-dns.com/dns-query",
  // 规则集
  ruleProviders: [],
};

const form = reactive({ ...formDefaults });
const formRef = ref();
const nodes = ref([]);
const yamlText = ref("");
const clashImportUrl = ref("");
const qrcodeDataUrl = ref("");
const status = reactive({ message: "", type: "info" });
const customRules = ref([]);
const ruleBuilder = reactive({
  type: "DOMAIN-SUFFIX",
  value: "",
  policy: "🇺🇸 美国尊享(AI/Google)",
});

const isTesting = ref(false);
const showDefaultRules = ref(false);

// ==================== 节点筛选/排序/分组 ====================
const nodeSearch = ref("");
const nodeSortBy = ref("default");
const activeNodeGroup = ref("all");
const subscriptionHistory = ref([]);

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

// 点击行选中节点
const handleNodeRowClick = (row) => {
  form.dialerProxy = row.name;
};

// 初始化
onMounted(() => {
  const savedConfig = loadSavedConfig();
  if (savedConfig) {
    Object.assign(form, savedConfig);
  }
  subscriptionHistory.value = loadSubscriptionHistory();
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
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(HISTORY_KEY);
  Object.assign(form, formDefaults);
  subscriptionHistory.value = [];
  nodes.value = [];
  yamlText.value = "";
  status.message = "已清除所有配置。";
  status.type = "info";
};

const rules = {
  subscriptionUrl: [{ type: "url", message: "请输入有效的 URL", trigger: "blur" }],
  socksServer: [{ required: true, message: "请输入落地服务器", trigger: "blur" }],
  socksPort: [{ required: true, message: "请输入端口", trigger: "blur" }],
  socksAlias: [{ required: true, message: "请输入节点别名", trigger: "blur" }],
};

const selectedNode = computed(() =>
  nodes.value.find((node) => node.name === form.dialerProxy)
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

const parseSocks5Url = () => {
  const url = form.socks5Url.trim();
  if (!url) {
    status.message = "请输入 Socks5 链接。";
    status.type = "warning";
    return;
  }

  try {
    // 支持格式: socks5://username:password@host:port 或 socks5://host:port
    const match = url.match(/^socks5:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (!match) {
      status.message = "链接格式不正确，请使用格式：socks5://[username:password@]host:port";
      status.type = "error";
      return;
    }

    const [, username, password, host, port] = match;
    form.socksServer = host;
    form.socksPort = port;
    form.socksUser = username || "";
    form.socksPass = password || "";

    status.message = "解析成功，已填充配置。";
    status.type = "success";
  } catch (error) {
    status.message = "解析失败，请检查链接格式。";
    status.type = "error";
  }
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
  // 模拟延迟测试（实际应用中需要向节点服务器发送请求）
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(-2), 5000); // 5秒超时
    
    // 模拟测速：生成随机延迟（实际应该是真实的 ping 或 HTTP 请求）
    const simulatedLatency = Math.floor(Math.random() * 300) + 50;
    const testTime = Math.floor(Math.random() * 1000) + 500;
    
    setTimeout(() => {
      clearTimeout(timeout);
      resolve(simulatedLatency);
    }, testTime);
  });
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
    status.message = "订阅拉取失败，可能存在 CORS 限制。请展开高级选项配置本地代理后再试。";
    status.type = "warning";
    return;
  }
  
  if (!text) {
    status.message = "订阅内容为空。";
    status.type = "warning";
    return;
  }
  const parsed = parseSubscription(text);
  if (!parsed.length) {
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
        headers: json.host ? { Host: json.host } : undefined,
      };
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
        host: json.host ? [json.host] : undefined,
      };
    }
    
    // HTTP
    if (json.net === "http") {
      node["http-opts"] = {
        path: json.path ? [json.path] : ["/"],
        headers: json.host ? { Host: [json.host] } : undefined,
      };
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

const parseRules = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));

const generateYaml = () => {
  if (!form.dialerProxy) {
    status.message = "请选择跳板节点。";
    status.type = "warning";
    return;
  }
  if (!form.socksServer || !form.socksPort) {
    status.message = "请填写 Socks5 落地节点信息。";
    status.type = "warning";
    return;
  }
  const socksProxy = {
    name: form.socksAlias,
    type: "socks5",
    server: form.socksServer.trim(),
    port: Number(form.socksPort),
    username: form.socksUser || undefined,
    password: form.socksPass || undefined,
    udp: true,
    "dialer-proxy": "🚀 前置跳板", // 指向策略组，可在 Clash 客户端切换
  };

  const proxies = [...nodes.value, socksProxy];
  const proxyNames = nodes.value.map((node) => node.name);
  const customRulesFromText = parseRules(form.customRulesText || "");
  
  // AI专线策略组名称：直接使用别名 + 后缀
  const aiGroupName = `${form.socksAlias.replace(/🇺🇸\s*/, '')}专线`;
  
  // 其他外网策略组名称
  const otherGroupName = "🌍 其他外网";
  
  // 将默认规则中的占位符替换为实际的策略组名称
  const processedDefaultRules = form.includeDefaultRules 
    ? defaultRules.map(rule => 
        rule
          .replace(/🇺🇸 美国尊享\(AI\/Google\)/g, aiGroupName)
          .replace(/🌍 其他外网\(默认香港\)/g, otherGroupName)
      )
    : [];
  
  const combinedRules = [
    ...processedDefaultRules,
    ...customRules.value,
    ...customRulesFromText,
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
    "proxy-groups": [
      {
        name: "🚀 前置跳板",
        type: "select",
        proxies: proxyNames,
      },
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
    ],
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
    status.message = "已复制到剪贴板。";
    status.type = "success";
  } catch (error) {
    status.message = "复制失败，请手动复制。";
    status.type = "error";
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

// 复制 Clash 导入链接
const copyClashImportUrl = async () => {
  try {
    const fullUrl = `clash://install-config?url=${clashImportUrl.value}`;
    await navigator.clipboard.writeText(fullUrl);
    status.message = "Clash 导入链接已复制到剪贴板。";
    status.type = "success";
  } catch (error) {
    status.message = "复制失败，请手动复制。";
    status.type = "error";
  }
};

// 生成配置后创建导入链接
const generateClashImportUrl = async () => {
  // 使用 data URI 方案，将配置编码为 base64
  const base64Config = btoa(unescape(encodeURIComponent(yamlText.value)));
  clashImportUrl.value = `data:text/yaml;base64,${base64Config}`;
  
  // 生成二维码（由于导入链接太长，改用下载链接提示）
  const fullUrl = `clash://install-config?url=${clashImportUrl.value}`;
  try {
    // 二维码内容限制，如果太长就使用简化提示
    if (fullUrl.length < 2000) {
      qrcodeDataUrl.value = await QRCode.toDataURL(fullUrl, {
        width: 150,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
    } else {
      // 链接太长，生成下载说明二维码
      qrcodeDataUrl.value = "";
    }
  } catch {
    qrcodeDataUrl.value = "";
  }
};
</script>
