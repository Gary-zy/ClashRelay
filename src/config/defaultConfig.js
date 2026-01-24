// 默认 Clash 规则配置
// 可在此文件中添加、修改或删除规则

// AI 和 Google 相关服务使用美国尊享线路
// GitHub 等开发者服务使用其他外网
// 国内域名和 IP 直连

export const defaultRules = [
  // ==================== 内网直连 ====================
  "IP-CIDR,192.168.0.0/16,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT",
  "IP-CIDR,172.16.0.0/12,DIRECT",
  "IP-CIDR,127.0.0.0/8,DIRECT",
  "DOMAIN-SUFFIX,local,DIRECT",

  // ==================== AI 服务 (美国家宽) ====================
  // Claude / Anthropic
  "DOMAIN-KEYWORD,antigravity,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,anthropic.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,claude.ai,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-KEYWORD,anthropic,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-KEYWORD,claude,🇺🇸 美国尊享(AI/Google)",

  // Cursor
  "DOMAIN-SUFFIX,cursor.sh,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,cursor.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,anysphere.co,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,todesktop.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,auth0.com,🇺🇸 美国尊享(AI/Google)",

  // OpenAI / ChatGPT
  "DOMAIN-SUFFIX,openai.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,chatgpt.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,oaistatic.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,oaiusercontent.com,🇺🇸 美国尊享(AI/Google)",

  // 其他 AI 服务
  "DOMAIN-SUFFIX,perplexity.ai,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,x.ai,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,grok.x.ai,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,huggingface.co,🇺🇸 美国尊享(AI/Google)",

  // GitHub Copilot
  "DOMAIN-SUFFIX,copilot.microsoft.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,copilot.githubusercontent.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-KEYWORD,copilot,🇺🇸 美国尊享(AI/Google)",

  // ==================== GitHub (其他外网) ====================
  "DOMAIN-SUFFIX,github.com,🌍 其他外网(默认香港)",
  "DOMAIN-SUFFIX,githubusercontent.com,🌍 其他外网(默认香港)",

  // ==================== Google 服务 (美国家宽) ====================
  "DOMAIN-SUFFIX,google.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,googleapis.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,gstatic.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,googleusercontent.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,gvt1.com,🇺🇸 美国尊享(AI/Google)",

  // Google AI
  "DOMAIN-KEYWORD,gemini,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,bard.google.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,deepmind.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,ai.google.dev,🇺🇸 美国尊享(AI/Google)",

  // YouTube
  "DOMAIN-SUFFIX,youtube.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,googlevideo.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,ytimg.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,ggpht.com,🇺🇸 美国尊享(AI/Google)",

  // Google 其他服务
  "DOMAIN-SUFFIX,android.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,firebaseio.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,appspot.com,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,go.dev,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,golang.org,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-SUFFIX,recaptcha.net,🇺🇸 美国尊享(AI/Google)",
  "DOMAIN-KEYWORD,google,🇺🇸 美国尊享(AI/Google)",

  // ==================== 国内直连 ====================
  "DOMAIN-SUFFIX,cn,DIRECT",
  "DOMAIN-KEYWORD,-cn,DIRECT",
  "GEOIP,CN,DIRECT",
  "GEOSITE,CN,DIRECT",

  // ==================== 默认规则 ====================
  "MATCH,🌍 其他外网(默认香港)",
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

// 策略组选项
export const policyGroups = [
  { label: "🇺🇸 美国尊享", value: "🇺🇸 美国尊享(AI/Google)" },
  { label: "🌍 其他外网", value: "🌍 其他外网" },
  { label: "DIRECT", value: "DIRECT" },
];
