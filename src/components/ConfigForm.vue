<template>
  <div class="section-card">
    <div class="section-title">1. 输入订阅与落地节点</div>
    <el-form :model="form" :rules="rules" label-position="top">
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
              <div class="helper-text">支持 .yaml/.yml 格式，将自动提取节点列表、规则和 Socks5 配置</div>
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
        <div class="helper-text">点击输入框可查看历史记录（获取成功后自动保存）</div>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="handleFetch"
          :loading="isFetchingValue"
          :disabled="isFetchingValue"
          style="width: 100%;"
        >
          {{ isFetchingValue ? '正在获取...' : '获取节点' }}
        </el-button>
      </el-form-item>

      <el-collapse style="margin-bottom: 16px;">
        <el-collapse-item title="高级选项" name="advanced">
          <el-form-item label="本地代理服务地址">
            <el-input v-model="form.proxyUrl" placeholder="http://localhost:8787" />
            <div class="helper-text">
              订阅站点未开启 CORS 时，可启动本地代理（项目内提供 <code>proxy-server.js</code>）。
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
              <el-option-group label="广告拦截">
                <el-option label="广告拦截精简版 (blackmatrix7)" value="ad-lite" />
                <el-option label="Loyalsoldier - 广告域名" value="reject" />
              </el-option-group>
              <el-option-group label="直连规则">
                <el-option label="局域网直连 (ACL4SSR)" value="lan" />
                <el-option label="解除屏蔽 (ACL4SSR)" value="unban" />
                <el-option label="Loyalsoldier - 直连域名" value="direct" />
              </el-option-group>
              <el-option-group label="代理规则">
                <el-option label="Loyalsoldier - 代理域名" value="proxy" />
                <el-option label="Loyalsoldier - GFW 域名" value="gfw" />
              </el-option-group>
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
            <el-input
              v-model="form.landingNodeUrl"
              placeholder="支持 ss:// ssr:// vmess:// vless:// trojan:// hysteria:// hysteria2:// tuic://"
            />
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="parseLandingNodeUrl" style="width: 100%;">解析</el-button>
          </el-col>
        </el-row>
        <div class="helper-text">
          支持多种协议链接：ss(Shadowsocks)、ssr、vmess、vless、trojan、hysteria、hysteria2、tuic、socks5、http。
        </div>
      </el-form-item>
      <el-form-item label="节点类型">
        <el-select v-model="form.landingNodeType" placeholder="选择协议类型" style="width: 200px;">
          <el-option label="SOCKS5" value="socks5" />
          <el-option label="HTTP" value="http" />
          <el-option label="Shadowsocks (SS)" value="ss" />
          <el-option label="ShadowsocksR (SSR)" value="ssr" />
          <el-option label="Trojan" value="trojan" />
          <el-option label="VMess" value="vmess" />
          <el-option label="VLESS" value="vless" />
          <el-option label="Hysteria" value="hysteria" />
          <el-option label="Hysteria2" value="hysteria2" />
          <el-option label="TUIC" value="tuic" />
        </el-select>
        <el-tag
          v-if="landingNodeValue && landingNodeValue.type !== form.landingNodeType"
          type="warning"
          style="margin-left: 8px;"
        >
          解析类型: {{ landingNodeValue.type.toUpperCase() }}
        </el-tag>
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
        <el-input v-model="form.socksAlias" placeholder="例如：US-Home 或 落地节点" />
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
</template>

<script setup>
import { computed } from "vue";
import { Upload } from "@element-plus/icons-vue";

const props = defineProps({
  form: { type: Object, required: true },
  rules: { type: Object, required: true },
  status: { type: Object, required: true },
  isFetching: { type: [Boolean, Object], required: true },
  landingNode: { type: [Object, null], default: null },
  handleFetch: { type: Function, required: true },
  handleConfigImport: { type: Function, required: true },
  querySubscriptionHistory: { type: Function, required: true },
  removeHistoryItem: { type: Function, required: true },
  parseLandingNodeUrl: { type: Function, required: true },
  formatTime: { type: Function, required: true },
});

const unwrapRef = (value) =>
  value && typeof value === "object" && "value" in value ? value.value : value;

const isFetchingValue = computed(() => unwrapRef(props.isFetching));
const landingNodeValue = computed(() => unwrapRef(props.landingNode));
</script>
