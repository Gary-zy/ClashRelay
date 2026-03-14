// 默认 Clash 规则配置
// 使用占位符 {{LANDING}} 表示落地节点专线，{{PROXY}} 表示通用代理出口
// 生成配置时会自动替换为用户设置的策略组名称

const buildDomainSuffixRules = (domains, policy) =>
  domains.map((domain) => `DOMAIN-SUFFIX,${domain},${policy}`);

const buildKeywordRules = (keywords, policy) =>
  keywords.map((keyword) => `DOMAIN-KEYWORD,${keyword},${policy}`);

const privateDirectRules = [
  "IP-CIDR,0.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "IP-CIDR,172.16.0.0/12,DIRECT",
  "IP-CIDR,127.0.0.0/8,DIRECT",
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,198.18.0.0/15,DIRECT,no-resolve",
  "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
  "IP-CIDR,8.154.20.44/32,DIRECT,no-resolve",
  "IP-CIDR,47.110.145.64/32,DIRECT,no-resolve",
  "IP-CIDR,47.96.0.3/32,DIRECT,no-resolve",
  "DOMAIN,localhost,DIRECT",
  "DOMAIN-SUFFIX,local,DIRECT",
];

const foreignAISuffixDomains = [
  "anthropic.com",
  "claude.ai",
  "cursor.sh",
  "cursor.com",
  "anysphere.co",
  "openai.com",
  "chatgpt.com",
  "oaistatic.com",
  "oaiusercontent.com",
  "openaiapi-site.azureedge.net",
  "sora.com",
  "openrouter.ai",
  "perplexity.ai",
  "pplx.ai",
  "x.ai",
  "grok.x.ai",
  "grok.com",
  "huggingface.co",
  "hf.co",
  "huggingface.tech",
  "copilot.microsoft.com",
  "copilot.githubusercontent.com",
  "midjourney.com",
  "mj.run",
  "stability.ai",
  "stablediffusionweb.com",
  "dreamstudio.ai",
  "clipdrop.co",
  "runwayml.com",
  "runway.com",
  "poe.com",
  "character.ai",
  "replicate.com",
  "replicate.delivery",
  "cohere.ai",
  "cohere.com",
  "mistral.ai",
  "chat.mistral.ai",
  "meta.ai",
  "llama.meta.com",
  "ai.meta.com",
  "notion.so",
  "notion.site",
  "jasper.ai",
  "copy.ai",
  "writesonic.com",
  "rytr.me",
  "grammarly.com",
  "leonardo.ai",
  "ideogram.ai",
  "lexica.art",
  "playground.com",
  "civitai.com",
  "elevenlabs.io",
  "suno.ai",
  "suno.com",
  "pika.art",
  "heygen.com",
  "luma.ai",
  "you.com",
  "phind.com",
  "consensus.app",
  "elicit.org",
  "together.ai",
  "anyscale.com",
  "fireworks.ai",
  "groq.com",
  "ai.google.dev",
  "makersuite.google.com",
  "generativelanguage.googleapis.com",
  "deepmind.com",
  "notebooklm.google.com",
  "aistudio.google.com",
  "v0.dev",
  "windsurf.com",
  "codeium.com",
  "bolt.new",
  "lovable.dev",
  "fal.ai",
  "deepinfra.com",
];

const foreignAIKeywordRules = [
  "antigravity",
  "anthropic",
  "claude",
  "copilot",
  "gemini",
];

const domesticAIDirectDomains = [
  "trae.ai",
  "trae.com",
  "doubao.com",
  "kimi.ai",
  "klingai.com",
  "deepseek.com",
  "moonshot.cn",
  "minimax.io",
];

export const defaultRules = [
  // ==================== 内网直连 ====================
  ...privateDirectRules,

  // ==================== AI 服务 (走落地节点) ====================
  ...buildDomainSuffixRules(foreignAISuffixDomains, "{{LANDING}}"),
  ...buildKeywordRules(foreignAIKeywordRules, "{{LANDING}}"),
  ...buildDomainSuffixRules(domesticAIDirectDomains, "DIRECT"),

  // ==================== GitHub (走代理出口) ====================
  "DOMAIN-SUFFIX,github.com,{{PROXY}}",
  "DOMAIN-SUFFIX,githubusercontent.com,{{PROXY}}",

  // ==================== IP 检测网站 (走落地节点) ====================
  // 国内常用
  "DOMAIN-SUFFIX,ipip.la,{{LANDING}}",
  "DOMAIN-SUFFIX,ipip.net,{{LANDING}}",
  "DOMAIN-SUFFIX,ip.sb,{{LANDING}}",
  "DOMAIN-SUFFIX,ip.cn,{{LANDING}}",
  "DOMAIN-SUFFIX,ip138.com,{{LANDING}}",
  "DOMAIN-SUFFIX,cip.cc,{{LANDING}}",
  "DOMAIN-SUFFIX,myip.la,{{LANDING}}",
  "DOMAIN-SUFFIX,ipw.cn,{{LANDING}}",
  "DOMAIN-SUFFIX,ip.tool.chinaz.com,{{LANDING}}",
  "DOMAIN-SUFFIX,tool.chinaz.com,{{LANDING}}",
  "DOMAIN-SUFFIX,chinaz.com,{{LANDING}}",
  "DOMAIN-SUFFIX,boce.com,{{LANDING}}",
  "DOMAIN-SUFFIX,17ce.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ping.pe,{{LANDING}}",
  "DOMAIN-SUFFIX,ce8.com,{{LANDING}}",
  "DOMAIN-SUFFIX,itdog.cn,{{LANDING}}",
  "DOMAIN-SUFFIX,ipshudi.com,{{LANDING}}",
  "DOMAIN-SUFFIX,chaipip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipshu.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipplus360.com,{{LANDING}}",
  "DOMAIN-SUFFIX,test-ipv6.com,{{LANDING}}",
  // 国际常用
  "DOMAIN-SUFFIX,ipinfo.io,{{LANDING}}",
  "DOMAIN-SUFFIX,ip-api.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ifconfig.me,{{LANDING}}",
  "DOMAIN-SUFFIX,ifconfig.co,{{LANDING}}",
  "DOMAIN-SUFFIX,ipify.org,{{LANDING}}",
  "DOMAIN-SUFFIX,icanhazip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,whatismyip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,whatismyipaddress.com,{{LANDING}}",
  "DOMAIN-SUFFIX,checkip.amazonaws.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipecho.net,{{LANDING}}",
  "DOMAIN-SUFFIX,ident.me,{{LANDING}}",
  "DOMAIN-SUFFIX,ipgeolocation.io,{{LANDING}}",
  "DOMAIN-SUFFIX,ip2location.com,{{LANDING}}",
  "DOMAIN-SUFFIX,whoer.net,{{LANDING}}",
  "DOMAIN-SUFFIX,browserleaks.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipaddress.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipaddress.my,{{LANDING}}",
  "DOMAIN-SUFFIX,myip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,showmyip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,iplocation.net,{{LANDING}}",
  "DOMAIN-SUFFIX,ipleak.net,{{LANDING}}",
  "DOMAIN-SUFFIX,dnsleaktest.com,{{LANDING}}",
  "DOMAIN-SUFFIX,dnsleak.com,{{LANDING}}",
  "DOMAIN-SUFFIX,perfect-privacy.com,{{LANDING}}",
  "DOMAIN-SUFFIX,expressvpn.com,{{LANDING}}",
  "DOMAIN-SUFFIX,speedtest.net,{{LANDING}}",
  "DOMAIN-SUFFIX,fast.com,{{LANDING}}",
  "DOMAIN-SUFFIX,speedof.me,{{LANDING}}",
  "DOMAIN-SUFFIX,testmy.net,{{LANDING}}",
  "DOMAIN-SUFFIX,meter.net,{{LANDING}}",
  "DOMAIN-SUFFIX,bandwidthplace.com,{{LANDING}}",
  "DOMAIN-SUFFIX,speedcheck.org,{{LANDING}}",
  "DOMAIN-SUFFIX,ipchicken.com,{{LANDING}}",
  "DOMAIN-SUFFIX,myexternalip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,wtfismyip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,curlmyip.net,{{LANDING}}",
  "DOMAIN-SUFFIX,httpbin.org,{{LANDING}}",
  "DOMAIN-SUFFIX,jsonip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipapi.co,{{LANDING}}",
  "DOMAIN-SUFFIX,geoiplookup.net,{{LANDING}}",
  "DOMAIN-SUFFIX,db-ip.com,{{LANDING}}",
  "DOMAIN-SUFFIX,maxmind.com,{{LANDING}}",
  // IP 质量 / 风控 / 代理检测
  "DOMAIN-SUFFIX,scamalytics.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ipqualityscore.com,{{LANDING}}",
  "DOMAIN-SUFFIX,proxycheck.io,{{LANDING}}",
  "DOMAIN-SUFFIX,abuseipdb.com,{{LANDING}}",
  "DOMAIN-SUFFIX,pixelscan.net,{{LANDING}}",
  "DOMAIN-SUFFIX,ipleak.org,{{LANDING}}",
  "DOMAIN-SUFFIX,iphey.com,{{LANDING}}",

  // ==================== 国内直连 ====================
  "DOMAIN-SUFFIX,cn,DIRECT",
  "DOMAIN-KEYWORD,-cn,DIRECT",
  "GEOIP,CN,DIRECT",
  "GEOSITE,CN,DIRECT",

  // ==================== 默认规则 ====================
  "MATCH,{{PROXY}}",
];

// 订阅整理模式默认规则 — 不依赖 {{LANDING}}，仅使用 {{PROXY}} 和 DIRECT
export const subscriptionDefaultRules = [
  // ==================== 内网直连 ====================
  ...privateDirectRules,

  // ==================== 常用代理站点 ====================
  "DOMAIN-SUFFIX,github.com,{{PROXY}}",
  "DOMAIN-SUFFIX,githubusercontent.com,{{PROXY}}",
  ...buildDomainSuffixRules(foreignAISuffixDomains, "{{PROXY}}"),
  ...buildKeywordRules(foreignAIKeywordRules, "{{PROXY}}"),

  // ==================== 国内直连 ====================
  ...buildDomainSuffixRules(domesticAIDirectDomains, "DIRECT"),
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
