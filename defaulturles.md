rules:
  # 1. 局域网直连
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,10.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - DOMAIN-SUFFIX,local,DIRECT

  # 2. Antigravity
  - DOMAIN-KEYWORD,antigravity,🇺🇸 美国尊享(AI/Google)

  # 3. Anthropic / Claude
  - DOMAIN-SUFFIX,anthropic.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,claude.ai,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-KEYWORD,anthropic,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-KEYWORD,claude,🇺🇸 美国尊享(AI/Google)

  # 4. Cursor / OpenAI / Perplexity / xAI
  - DOMAIN-SUFFIX,cursor.sh,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,cursor.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,anysphere.co,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,todesktop.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,auth0.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,openai.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,chatgpt.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,oaistatic.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,oaiusercontent.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,perplexity.ai,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,x.ai,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,grok.x.ai,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,huggingface.co,🇺🇸 美国尊享(AI/Google)

  # 5. GitHub Copilot 智能分流 (省流量优化版)
  # ✅ Copilot 的 AI 补全功能 -> 强制走美国家宽 (防封号)
  - DOMAIN-SUFFIX,copilot.microsoft.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,copilot.githubusercontent.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-KEYWORD,copilot,🇺🇸 美国尊享(AI/Google)
  # 📉 普通 GitHub 代码下载/浏览 -> 走香港 (速度快/省家宽流量)
  # 如果您坚持要 GitHub 全走美国，把下面这行最后的策略组改成 "🇺🇸 美国尊享..." 即可
  - DOMAIN-SUFFIX,github.com,🌍 其他外网(默认香港)
  - DOMAIN-SUFFIX,githubusercontent.com,🌍 其他外网(默认香港)

  # 6. Google 全家桶
  - DOMAIN-SUFFIX,google.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,googleapis.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,gstatic.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,googleusercontent.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,gvt1.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-KEYWORD,gemini,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,bard.google.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,deepmind.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,ai.google.dev,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,youtube.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,googlevideo.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,ytimg.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,ggpht.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,android.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,firebaseio.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,appspot.com,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,go.dev,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,golang.org,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-SUFFIX,recaptcha.net,🇺🇸 美国尊享(AI/Google)
  - DOMAIN-KEYWORD,google,🇺🇸 美国尊享(AI/Google)

  # 7. 国内直连
  - DOMAIN-SUFFIX,cn,DIRECT
  - DOMAIN-KEYWORD,-cn,DIRECT
  - GEOIP,CN,DIRECT
  - GEOSITE,CN,DIRECT

  # 8. 兜底
  - MATCH,🌍 其他外网(默认香港)