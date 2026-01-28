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

  // Cursor (AI 编程)
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
  "DOMAIN-SUFFIX,openaiapi-site.azureedge.net,{{LANDING}}",
  "DOMAIN-SUFFIX,sora.com,{{LANDING}}",

  // Perplexity
  "DOMAIN-SUFFIX,perplexity.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,pplx.ai,{{LANDING}}",

  // xAI / Grok
  "DOMAIN-SUFFIX,x.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,grok.x.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,grok.com,{{LANDING}}",

  // Hugging Face
  "DOMAIN-SUFFIX,huggingface.co,{{LANDING}}",
  "DOMAIN-SUFFIX,hf.co,{{LANDING}}",
  "DOMAIN-SUFFIX,huggingface.tech,{{LANDING}}",

  // GitHub Copilot
  "DOMAIN-SUFFIX,copilot.microsoft.com,{{LANDING}}",
  "DOMAIN-SUFFIX,copilot.githubusercontent.com,{{LANDING}}",
  "DOMAIN-KEYWORD,copilot,{{LANDING}}",

  // Midjourney (AI 绘画)
  "DOMAIN-SUFFIX,midjourney.com,{{LANDING}}",
  "DOMAIN-SUFFIX,mj.run,{{LANDING}}",

  // Stable Diffusion / Stability AI
  "DOMAIN-SUFFIX,stability.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,stablediffusionweb.com,{{LANDING}}",
  "DOMAIN-SUFFIX,dreamstudio.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,clipdrop.co,{{LANDING}}",

  // Runway (AI 视频)
  "DOMAIN-SUFFIX,runwayml.com,{{LANDING}}",
  "DOMAIN-SUFFIX,runway.com,{{LANDING}}",

  // Poe (AI 聚合平台)
  "DOMAIN-SUFFIX,poe.com,{{LANDING}}",
  "DOMAIN-SUFFIX,quora.com,{{LANDING}}",

  // Character.AI
  "DOMAIN-SUFFIX,character.ai,{{LANDING}}",

  // Replicate
  "DOMAIN-SUFFIX,replicate.com,{{LANDING}}",
  "DOMAIN-SUFFIX,replicate.delivery,{{LANDING}}",

  // Cohere
  "DOMAIN-SUFFIX,cohere.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,cohere.com,{{LANDING}}",

  // Mistral AI
  "DOMAIN-SUFFIX,mistral.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,chat.mistral.ai,{{LANDING}}",

  // Meta AI / Llama
  "DOMAIN-SUFFIX,meta.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,llama.meta.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ai.meta.com,{{LANDING}}",

  // Notion AI
  "DOMAIN-SUFFIX,notion.so,{{LANDING}}",
  "DOMAIN-SUFFIX,notion.site,{{LANDING}}",

  // AI 写作工具
  "DOMAIN-SUFFIX,jasper.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,copy.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,writesonic.com,{{LANDING}}",
  "DOMAIN-SUFFIX,rytr.me,{{LANDING}}",
  "DOMAIN-SUFFIX,grammarly.com,{{LANDING}}",

  // AI 图像工具
  "DOMAIN-SUFFIX,leonardo.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,ideogram.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,lexica.art,{{LANDING}}",
  "DOMAIN-SUFFIX,playground.com,{{LANDING}}",
  "DOMAIN-SUFFIX,civitai.com,{{LANDING}}",

  // AI 音频/视频工具
  "DOMAIN-SUFFIX,elevenlabs.io,{{LANDING}}",
  "DOMAIN-SUFFIX,suno.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,suno.com,{{LANDING}}",
  "DOMAIN-SUFFIX,pika.art,{{LANDING}}",
  "DOMAIN-SUFFIX,heygen.com,{{LANDING}}",
  "DOMAIN-SUFFIX,luma.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,klingai.com,{{LANDING}}",

  // AI 搜索/研究
  "DOMAIN-SUFFIX,you.com,{{LANDING}}",
  "DOMAIN-SUFFIX,phind.com,{{LANDING}}",
  "DOMAIN-SUFFIX,consensus.app,{{LANDING}}",
  "DOMAIN-SUFFIX,elicit.org,{{LANDING}}",

  // 其他 AI 平台
  "DOMAIN-SUFFIX,together.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,anyscale.com,{{LANDING}}",
  "DOMAIN-SUFFIX,fireworks.ai,{{LANDING}}",
  "DOMAIN-SUFFIX,groq.com,{{LANDING}}",
  "DOMAIN-SUFFIX,deepseek.com,{{LANDING}}",
  "DOMAIN-SUFFIX,moonshot.cn,{{LANDING}}",

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

  // ==================== Google 服务 (走落地节点) ====================
  // Google 核心域名
  "DOMAIN-SUFFIX,google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleapis.com,{{LANDING}}",
  "DOMAIN-SUFFIX,gstatic.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleusercontent.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googlesyndication.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googletagmanager.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googletagservices.com,{{LANDING}}",
  "DOMAIN-SUFFIX,google-analytics.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleadservices.com,{{LANDING}}",
  "DOMAIN-SUFFIX,googleads.g.doubleclick.net,{{LANDING}}",
  "DOMAIN-SUFFIX,doubleclick.net,{{LANDING}}",
  "DOMAIN-SUFFIX,gvt1.com,{{LANDING}}",
  "DOMAIN-SUFFIX,gvt2.com,{{LANDING}}",
  "DOMAIN-SUFFIX,gvt3.com,{{LANDING}}",
  "DOMAIN-SUFFIX,1e100.net,{{LANDING}}",

  // Google AI / Gemini
  "DOMAIN-KEYWORD,gemini,{{LANDING}}",
  "DOMAIN-SUFFIX,bard.google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,deepmind.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ai.google.dev,{{LANDING}}",
  "DOMAIN-SUFFIX,makersuite.google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,generativelanguage.googleapis.com,{{LANDING}}",

  // YouTube
  "DOMAIN-SUFFIX,youtube.com,{{LANDING}}",
  "DOMAIN-SUFFIX,youtu.be,{{LANDING}}",
  "DOMAIN-SUFFIX,googlevideo.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ytimg.com,{{LANDING}}",
  "DOMAIN-SUFFIX,ggpht.com,{{LANDING}}",
  "DOMAIN-SUFFIX,youtube-nocookie.com,{{LANDING}}",

  // Google Cloud / Firebase
  "DOMAIN-SUFFIX,cloud.google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,firebaseio.com,{{LANDING}}",
  "DOMAIN-SUFFIX,firebase.google.com,{{LANDING}}",
  "DOMAIN-SUFFIX,firebasestorage.googleapis.com,{{LANDING}}",
  "DOMAIN-SUFFIX,firebaseapp.com,{{LANDING}}",
  "DOMAIN-SUFFIX,crashlytics.com,{{LANDING}}",

  // Google 其他服务
  "DOMAIN-SUFFIX,android.com,{{LANDING}}",
  "DOMAIN-SUFFIX,appspot.com,{{LANDING}}",
  "DOMAIN-SUFFIX,go.dev,{{LANDING}}",
  "DOMAIN-SUFFIX,golang.org,{{LANDING}}",
  "DOMAIN-SUFFIX,googlesource.com,{{LANDING}}",
  "DOMAIN-SUFFIX,chromium.org,{{LANDING}}",
  "DOMAIN-SUFFIX,chrome.com,{{LANDING}}",
  "DOMAIN-SUFFIX,withgoogle.com,{{LANDING}}",
  "DOMAIN-SUFFIX,recaptcha.net,{{LANDING}}",

  // Google FCM 推送 IP 段 (重要)
  "IP-CIDR,142.250.0.0/15,{{LANDING}},no-resolve",
  "IP-CIDR,172.217.0.0/16,{{LANDING}},no-resolve",
  "IP-CIDR,216.58.192.0/19,{{LANDING}},no-resolve",
  "IP-CIDR,74.125.0.0/16,{{LANDING}},no-resolve",

  // Google 关键词兜底
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
