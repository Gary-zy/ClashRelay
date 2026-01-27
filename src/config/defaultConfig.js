// 默认 Clash 规则配置
// 使用占位符 {{LANDING}} 表示落地节点专线，{{PROXY}} 表示通用代理出口
// 生成配置时会自动替换为用户设置的策略组名称

export const defaultRules = [
  // ==================== 内网直连 ====================
  "IP-CIDR,192.168.0.0/16,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT",
  "IP-CIDR,172.16.0.0/12,DIRECT",
  "IP-CIDR,127.0.0.0/8,DIRECT",
  "DOMAIN-SUFFIX,local,DIRECT",

  // ==================== AI 服务 (走落地节点) ====================
  // Claude / Anthropic
  "DOMAIN-KEYWORD,antigravity,{{LANDING}}",
  "DOMAIN-SUFFIX,anthropic.com,{{LANDING}}",
  "DOMAIN-SUFFIX,claude.ai,{{LANDING}}",
  "DOMAIN-KEYWORD,anthropic,{{LANDING}}",
  "DOMAIN-KEYWORD,claude,{{LANDING}}",

  // Cursor
  "DOMAIN-SUFFIX,cursor.sh,{{LANDING}}",
  "DOMAIN-SUFFIX,cursor.com,{{LANDING}}",
  "DOMAIN-SUFFIX,anysphere.co,{{LANDING}}",
  "DOMAIN-SUFFIX,todesktop.com,{{LANDING}}",
  "DOMAIN-SUFFIX,auth0.com,{{LANDING}}",

  // OpenAI / ChatGPT
  "DOMAIN-SUFFIX,openai.com,{{LANDING}}",
  "DOMAIN-SUFFIX,chatgpt.com,{{LANDING}}",
  "DOMAIN-SUFFIX,oaistatic.com,{{LANDING}}",
  "DOMAIN-SUFFIX,oaiusercontent.com,{{LANDING}}",

  // 其他 AI 服务
  "DOMAIN-SUFFIX,perplexity.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,x.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,grok.x.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,huggingface.co,{{LANDING}}",

  // GitHub Copilot
  "DOMAIN-SUFFIX,copilot.microsoft.com,{{LANDING}}",
  "DOMAIN-SUFFIX,copilot.githubusercontent.com,{{LANDING}}",
  "DOMAIN-KEYWORD,copilot,{{LANDING}}",

  // ==================== GitHub (走代理出口) ====================
  "DOMAIN-SUFFIX,github.com,{{PROXY}}",
  "DOMAIN-SUFFIX,githubusercontent.com,{{PROXY}}",

  // ==================== Google 服务 (走落地节点) ====================
  "DOMAIN-SUFFIX,google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleapis.com,{{LANDING}}",
  "DOMAIN-SUFFIX,gstatic.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleusercontent.com,{{LANDING}}",
  "DOMAIN-SUFFIX,gvt1.com,{{LANDING}}",

  // Google AI
  "DOMAIN-KEYWORD,gemini,{{LANDING}}",
  "DOMAIN-SUFFIX,bard.google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,deepmind.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ai.google.dev,{{LANDING}}",

  // YouTube
  "DOMAIN-SUFFIX,youtube.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googlevideo.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ytimg.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ggpht.com,{{LANDING}}",

  // Google 其他服务
  "DOMAIN-SUFFIX,android.com,{{LANDING}}",
  "DOMAIN-SUFFIX,firebaseio.com,{{LANDING}}",
  "DOMAIN-SUFFIX,appspot.com,{{LANDING}}",
  "DOMAIN-SUFFIX,go.dev,{{LANDING}}",
  "DOMAIN-SUFFIX,golang.org,{{LANDING}}",
  "DOMAIN-SUFFIX,recaptcha.net,{{LANDING}}",
  "DOMAIN-KEYWORD,google,{{LANDING}}",

  // ==================== 国内直连 ====================
  "DOMAIN-SUFFIX,cn,DIRECT",
  "DOMAIN-KEYWORD,-cn,DIRECT",
  "GEOIP,CN,DIRECT",
  "GEOSITE,CN,DIRECT",

  // ==================== 默认规则 ====================
  "MATCH,{{PROXY}}",
];

// DNS 配置中的 fake-ip-filter
export const fakeIpFilter = [
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
];

// 规则类型选项
export const ruleTypes = [
  { label: "DOMAIN-SUFFIX", value: "DOMAIN-SUFFIX", description: "域名后缀匹配" },
  { label: "DOMAIN-KEYWORD", value: "DOMAIN-KEYWORD", description: "域名关键词匹配" },
  { label: "DOMAIN", value: "DOMAIN", description: "完整域名匹配" },
  { label: "IP-CIDR", value: "IP-CIDR", description: "IP 地址段匹配" },
  { label: "GEOIP", value: "GEOIP", description: "IP 地理位置匹配" },
  { label: "MATCH", value: "MATCH", description: "默认匹配（放最后）" },
];

// 策略组占位符 - 实际名称在 App.vue 中动态生成
// {{LANDING}} = 落地节点专线策略组（基于用户输入的别名）
// {{PROXY}} = 通用代理出口策略组
export const POLICY_PLACEHOLDERS = {
  LANDING: "{{LANDING}}",
  PROXY: "{{PROXY}}",
};
