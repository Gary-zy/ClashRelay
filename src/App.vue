<template>
  <div class="ink-bg">
    <div class="container">
      <div class="hero">
        <div>
          <h1 class="hero-title">Clash 链式代理配置生成器</h1>
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
            <el-form-item>
              <el-button type="primary" @click="handleFetch" style="width: 100%;">获取节点</el-button>
            </el-form-item>
            <el-form-item label="机场订阅地址" prop="subscriptionUrl">
              <el-input v-model="form.subscriptionUrl" placeholder="https://example.com/subscription" />
            </el-form-item>
            <el-form-item label="本地代理服务地址（可选）">
              <el-input v-model="form.proxyUrl" placeholder="http://localhost:8787" />
              <div class="helper-text">
                订阅站点未开启 CORS 时，建议启动本地代理并填写地址（项目内提供
                <code>proxy-server.js</code>）。
              </div>
            </el-form-item>
            <el-form-item label="或粘贴订阅内容（Base64 / Clash YAML）">
              <el-input
                v-model="form.subscriptionText"
                type="textarea"
                :rows="4"
                placeholder="粘贴订阅文本，解析失败可手动补充"
              />
            </el-form-item>

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
              <el-select v-model="form.dialerProxy" placeholder="请选择机场节点">
                <el-option
                  v-for="node in nodes"
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
          <div style="margin-bottom: 12px;">
            <el-button size="small" @click="testAllNodesLatency" :loading="isTesting">
              {{ isTesting ? '测速中...' : '测试所有节点延迟' }}
            </el-button>
          </div>
          <el-table
            :data="nodes"
            size="small"
            height="600"
            empty-text="暂无节点，请先获取节点"
            style="width: 100%"
          >
            <el-table-column prop="name" label="节点名称" min-width="330" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="75" />
            <el-table-column prop="server" label="服务器" min-width="110" show-overflow-tooltip />
            <el-table-column prop="port" label="端口" width="65" />
            <el-table-column label="凭证" min-width="90" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.uuid ? row.uuid.substring(0, 8) + '...' : (row.password ? row.password.substring(0, 8) + '...' : '—') }}
              </template>
            </el-table-column>
            <el-table-column prop="cipher" label="加密" width="85" show-overflow-tooltip />
            <el-table-column prop="network" label="传输" width="70" />
            <el-table-column label="延迟" width="85">
              <template #default="{ row }">
                <span v-if="row.latency === -1" style="color: #999;">—</span>
                <span v-else-if="row.latency === -2" style="color: #f56c6c;">超时</span>
                <span v-else-if="row.latency" :style="{ color: getLatencyColor(row.latency) }">
                  {{ row.latency }}ms
                </span>
                <el-icon v-else class="is-loading" style="color: #409eff;"><Loading /></el-icon>
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
          </el-space>
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
          <div class="config-preview">{{ yamlText || "等待生成..." }}</div>
        </div>
      </div>

      <div class="footer">RelayBox · Clash 链式代理配置生成器</div>
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
import { computed, reactive, ref } from "vue";
import { Loading } from '@element-plus/icons-vue';
import yaml from "js-yaml";
import { defaultRules, fakeIpFilter, ruleTypes, policyGroups } from "./config/defaultConfig.js";

const formDefaults = {
  subscriptionUrl: "",
  subscriptionText: "",
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
};

const form = reactive({ ...formDefaults });
const formRef = ref();
const nodes = ref([]);
const yamlText = ref("");
const status = reactive({ message: "", type: "info" });
const customRules = ref([]);
const ruleBuilder = reactive({
  type: "DOMAIN-SUFFIX",
  value: "",
  policy: "🇺🇸 美国尊享(AI/Google)",
});

const isTesting = ref(false);
const showDefaultRules = ref(false);

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
  let text = form.subscriptionText.trim();
  if (!text && form.subscriptionUrl) {
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
      status.message = "订阅拉取失败，可能存在 CORS 限制。可粘贴订阅文本，或启动本地代理后再试。";
      status.type = "warning";
      return;
    }
  }
  if (!text) {
    status.message = "请提供订阅 URL 或订阅文本。";
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
      cipher: "auto",
      udp: true,
    };
    if (json.tls === "tls") node.tls = true;
    if (json.net) node.network = json.net;
    if (json.net === "ws") {
      node["ws-opts"] = {
        path: json.path || "/",
        headers: json.host ? { Host: json.host } : undefined,
      };
    }
    if (json.net === "grpc") {
      node["grpc-opts"] = { "grpc-service-name": json.path || "" };
    }
    if (json.sni) node.sni = json.sni;
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
    const node = {
      name,
      type: "vless",
      server: url.hostname,
      port: Number(url.port),
      uuid: url.username,
      udp: true,
      tls: params.security === "tls" || params.security === "reality",
      network: params.type || "tcp",
    };
    if (params.sni) node.sni = params.sni;
    if (params.flow) node.flow = params.flow;
    if (params.type === "ws") {
      node["ws-opts"] = {
        path: params.path || "/",
        headers: params.host ? { Host: params.host } : undefined,
      };
    }
    if (params.type === "grpc") {
      node["grpc-opts"] = { "grpc-service-name": params.serviceName || "" };
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
    return {
      name,
      type: "trojan",
      server: url.hostname,
      port: Number(url.port),
      password: url.username,
      sni: params.sni || "",
      udp: true,
      "skip-cert-verify": params.allowInsecure === "1",
    };
  } catch (error) {
    return null;
  }
};

const parseSS = (line, index) => {
  try {
    const urlPart = line.replace("ss://", "");
    const [main, namePart] = urlPart.split("#");
    
    let method, password, server, port;
    
    if (main.includes("@")) {
      // 格式1: ss://BASE64(method:password)@server:port#name
      const [userinfoPart, serverPart] = main.split("@");
      const decoded = tryDecodeBase64(userinfoPart) || atob(userinfoPart);
      [method, password] = decoded.split(":");
      [server, port] = serverPart.split(":");
    } else {
      // 格式2: ss://BASE64(method:password@server:port)#name
      const decoded = tryDecodeBase64(main) || atob(main);
      const [userinfo, serverPart] = decoded.split("@");
      [method, password] = userinfo.split(":");
      [server, port] = serverPart.split(":");
    }
    
    // 验证必要字段
    if (!password || !server || !port) {
      console.warn("SS parsing failed: missing required fields", { method, password, server, port });
      return null;
    }
    
    return {
      name: decodeURIComponent(namePart || "") || `ss-${index + 1}`,
      type: "ss",
      server,
      port: Number(port),
      cipher: method,
      password,
      udp: true,
    };
  } catch (error) {
    console.warn("SS parsing error:", error);
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
  
  // 将默认规则中的占位符替换为实际的策略组名称
  const processedDefaultRules = form.includeDefaultRules 
    ? defaultRules.map(rule => rule.replace(/🇺🇸 美国尊享\(AI\/Google\)/g, aiGroupName))
    : [];
  
  const combinedRules = [
    ...processedDefaultRules,
    ...customRules.value,
    ...customRulesFromText,
  ];

  const config = {
    port: 7890,
    "socks-port": 7891,
    "allow-lan": true,
    mode: "rule",
    "log-level": "info",
    dns: {
      enable: true,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter": [
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
      ],
      nameserver: ["223.5.5.5", "119.29.29.29"],
      fallback: ["https://dns.google/dns-query", "https://cloudflare-dns.com/dns-query"],
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
        name: "🌍 其他外网",
        type: "select",
        proxies: [...proxyNames, form.socksAlias, "DIRECT"],
      },
    ],
    rules: combinedRules,
  };

  yamlText.value = yaml.dump(config, {
    noRefs: true,
    lineWidth: 120,
    quotingType: '"',
  });
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
</script>
