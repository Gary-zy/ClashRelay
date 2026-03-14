const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;
const GENERIC_HOST_PREFIXES = new Set([
  "www",
  "m",
  "wap",
  "api",
  "web",
  "app",
  "mobile",
  "beta",
  "cdn",
  "img",
  "static",
]);
const GENERIC_KEYWORDS = new Set([
  "www",
  "api",
  "app",
  "web",
  "site",
  "home",
  "blog",
  "cloud",
  "service",
  "proxy",
]);
const MULTI_PART_SUFFIXES = new Set([
  "com.cn",
  "net.cn",
  "org.cn",
  "gov.cn",
  "ac.cn",
  "edu.cn",
  "co.uk",
  "org.uk",
  "com.hk",
  "com.tw",
  "co.jp",
  "com.au",
  "net.au",
]);

export const RULE_ASSISTANT_DEFAULT_POLICY = "🌐 代理出口";

export const RULE_ASSISTANT_SITE_GROUPS = [
  {
    title: "AI 服务",
    items: [
      { label: "OpenAI", domain: "openai.com", policyKind: "landing" },
      { label: "Claude", domain: "claude.ai", policyKind: "landing" },
      { label: "Perplexity", domain: "perplexity.ai", policyKind: "landing" },
      { label: "Grok", domain: "grok.com", policyKind: "landing" },
      { label: "Gemini", domain: "google.dev", policyKind: "landing" },
    ],
  },
  {
    title: "开发社区",
    items: [
      { label: "GitHub", domain: "github.com", policyKind: "proxy" },
      { label: "Linux.do", domain: "linux.do", policyKind: "proxy" },
      { label: "V2EX", domain: "v2ex.com", policyKind: "proxy" },
      { label: "Stack Overflow", domain: "stackoverflow.com", policyKind: "proxy" },
      { label: "npm", domain: "npmjs.com", policyKind: "proxy" },
    ],
  },
  {
    title: "常见海外工具",
    items: [
      { label: "Notion", domain: "notion.so", policyKind: "proxy" },
      { label: "Linear", domain: "linear.app", policyKind: "proxy" },
      { label: "Vercel", domain: "vercel.com", policyKind: "proxy" },
      { label: "Raycast", domain: "raycast.com", policyKind: "proxy" },
      { label: "Cloudflare", domain: "cloudflare.com", policyKind: "proxy" },
    ],
  },
];

export const buildRulePolicyOptions = ({ mode, landingPolicyName }) => {
  if (mode === "subscription") {
    return [
      { label: "推荐目标", options: [
        { label: "代理出口 (🌐 代理出口)", value: "🌐 代理出口" },
        { label: "直连 (DIRECT)", value: "DIRECT" },
      ] },
      { label: "高级目标", options: [
        { label: "自动选择 (♻️ 自动选择)", value: "♻️ 自动选择" },
        { label: "故障转移 (🛡️ 故障转移)", value: "🛡️ 故障转移" },
        { label: "负载均衡 (⚖️ 负载均衡)", value: "⚖️ 负载均衡" },
      ] },
    ];
  }

  if (mode === "relay") {
    return [
      { label: "推荐目标", options: [
        { label: "代理出口 (🌐 代理出口)", value: "🌐 代理出口" },
        { label: `落地节点 (${landingPolicyName})`, value: landingPolicyName },
        { label: "直连 (DIRECT)", value: "DIRECT" },
      ] },
      { label: "高级目标", options: [
        { label: "自动选择 (♻️ 自动选择)", value: "♻️ 自动选择" },
        { label: "故障转移 (🛡️ 故障转移)", value: "🛡️ 故障转移" },
        { label: "负载均衡 (⚖️ 负载均衡)", value: "⚖️ 负载均衡" },
      ] },
    ];
  }

  return [
    { label: "常用目标", options: [
      { label: `落地节点 (${landingPolicyName})`, value: landingPolicyName },
      { label: "代理出口 (🌐 代理出口)", value: "🌐 代理出口" },
      { label: "直连 (DIRECT)", value: "DIRECT" },
    ] },
  ];
};

export const splitRuleByTopLevelCommas = (line) => {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")" && depth > 0) depth--;
    else if (line[i] === "," && depth === 0) {
      parts.push(line.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(line.slice(start));
  return parts;
};

const normalizeHost = (value) => value.trim().toLowerCase().replace(/\.$/, "");

const isIpHost = (value) =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(value) || value.includes(":");

const normalizeKeyword = (value) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");

  if (!normalized || normalized.length < 3 || GENERIC_KEYWORDS.has(normalized)) {
    return "";
  }

  return normalized;
};

export const deriveRootDomain = (host) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || isIpHost(normalizedHost)) return normalizedHost;

  const labels = normalizedHost.split(".").filter(Boolean);
  if (labels.length <= 2) return normalizedHost;

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }

  return lastTwo;
};

const parseUrlLikeInput = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let urlCandidate = trimmed;
  if (!URL_SCHEME_RE.test(trimmed) && (trimmed.includes(".") || trimmed.includes("/") || trimmed.includes(":"))) {
    urlCandidate = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(urlCandidate);
    return parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
};

const deriveKeywordFromHost = (exactDomain, rootDomain) => {
  if (!exactDomain) return "";

  const rootLabel = normalizeKeyword(rootDomain.split(".")[0] || "");
  if (rootLabel) return rootLabel;

  const labels = exactDomain.split(".").filter(Boolean);
  const hostKeyword = labels.find((label) => !GENERIC_HOST_PREFIXES.has(label));
  return normalizeKeyword(hostKeyword || "");
};

export const buildRuleHelperSuggestions = (input, policy = RULE_ASSISTANT_DEFAULT_POLICY) => {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      summary: { kind: "empty", rawInput: "" },
      candidates: [],
      error: "",
    };
  }

  const parsedUrl = parseUrlLikeInput(trimmed);
  if (!parsedUrl) {
    const keyword = normalizeKeyword(trimmed);
    if (!keyword) {
      return {
        summary: { kind: "invalid", rawInput: trimmed },
        candidates: [],
        error: "没识别出有效的网址、域名或关键词，换个更像样的目标试试。",
      };
    }

    return {
      summary: {
        kind: "keyword",
        rawInput: trimmed,
        keyword,
      },
      candidates: [
        {
          id: `DOMAIN-KEYWORD:${keyword}`,
          type: "DOMAIN-KEYWORD",
          value: keyword,
          policy,
          line: `DOMAIN-KEYWORD,${keyword},${policy}`,
          title: "关键词匹配",
          subtitle: `适合一批相关子域名一起兜住：${keyword}`,
        },
      ],
      error: "",
    };
  }

  const exactDomain = normalizeHost(parsedUrl.hostname);
  const rootDomain = deriveRootDomain(exactDomain);
  const keyword = deriveKeywordFromHost(exactDomain, rootDomain);
  const candidates = [];

  if (keyword) {
    candidates.push({
      id: `DOMAIN-KEYWORD:${keyword}`,
      type: "DOMAIN-KEYWORD",
      value: keyword,
      policy,
      line: `DOMAIN-KEYWORD,${keyword},${policy}`,
      title: "关键词匹配",
      subtitle: `优先拿品牌词起手，命中更快：${keyword}`,
    });
  }

  if (rootDomain) {
    candidates.push({
      id: `DOMAIN-SUFFIX:${rootDomain}`,
      type: "DOMAIN-SUFFIX",
      value: rootDomain,
      policy,
      line: `DOMAIN-SUFFIX,${rootDomain},${policy}`,
      title: "后缀匹配",
      subtitle: `整站兜底最稳，适合主域：${rootDomain}`,
    });
  }

  if (exactDomain) {
    candidates.push({
      id: `DOMAIN:${exactDomain}`,
      type: "DOMAIN",
      value: exactDomain,
      policy,
      line: `DOMAIN,${exactDomain},${policy}`,
      title: "精确域名",
      subtitle: `只打这个域名，误伤最少：${exactDomain}`,
    });
  }

  return {
    summary: {
      kind: "domain",
      rawInput: trimmed,
      exactDomain,
      rootDomain,
      keyword,
    },
    candidates,
    error: "",
  };
};

export const extractRuleDescriptor = (line) => {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  const parts = splitRuleByTopLevelCommas(trimmed).map((part) => part.trim());
  const type = parts[0];
  if (!["DOMAIN-KEYWORD", "DOMAIN-SUFFIX", "DOMAIN"].includes(type)) {
    return null;
  }

  if (parts.length < 3 || !parts[1] || !parts[2]) return null;

  return {
    line: trimmed,
    type,
    value: parts[1].toLowerCase(),
    policy: parts[2],
  };
};

const matchesKeywordAgainstDomain = (domainValue, keyword) => {
  const rootDomain = deriveRootDomain(domainValue);
  const rootLabel = (rootDomain.split(".")[0] || "").toLowerCase();
  return rootLabel === keyword || domainValue.split(".").some((label) => label.toLowerCase() === keyword);
};

export const analyzeRuleCandidate = (candidateLine, existingLines) => {
  const candidate = extractRuleDescriptor(candidateLine);
  if (!candidate) {
    return {
      exactDuplicate: false,
      sameTargetDifferentPolicy: false,
      narrowerMatches: [],
      broaderMatches: [],
    };
  }

  const parsedExisting = existingLines
    .map((line) => extractRuleDescriptor(line))
    .filter(Boolean);

  const exactDuplicate = parsedExisting.some(
    (entry) =>
      entry.type === candidate.type &&
      entry.value === candidate.value &&
      entry.policy === candidate.policy
  );

  const sameTargetDifferentPolicy = parsedExisting.some(
    (entry) =>
      entry.type === candidate.type &&
      entry.value === candidate.value &&
      entry.policy !== candidate.policy
  );

  const narrowerMatches = [];
  const broaderMatches = [];

  parsedExisting.forEach((entry) => {
    if (entry.line === candidate.line) return;

    if (candidate.type === "DOMAIN-SUFFIX") {
      if (
        (entry.type === "DOMAIN" && (entry.value === candidate.value || entry.value.endsWith(`.${candidate.value}`))) ||
        (entry.type === "DOMAIN-SUFFIX" &&
          entry.value !== candidate.value &&
          entry.value.endsWith(`.${candidate.value}`))
      ) {
        narrowerMatches.push(entry.line);
      }
      if (entry.type === "DOMAIN-KEYWORD" && candidate.value.includes(entry.value)) {
        broaderMatches.push(entry.line);
      }
    }

    if (candidate.type === "DOMAIN") {
      if (
        (entry.type === "DOMAIN-SUFFIX" &&
          (candidate.value === entry.value || candidate.value.endsWith(`.${entry.value}`))) ||
        (entry.type === "DOMAIN-KEYWORD" && candidate.value.includes(entry.value))
      ) {
        broaderMatches.push(entry.line);
      }
    }

    if (candidate.type === "DOMAIN-KEYWORD") {
      if (
        (entry.type === "DOMAIN" || entry.type === "DOMAIN-SUFFIX") &&
        matchesKeywordAgainstDomain(entry.value, candidate.value)
      ) {
        narrowerMatches.push(entry.line);
      }
      if (
        entry.type === "DOMAIN-KEYWORD" &&
        entry.value !== candidate.value &&
        candidate.value.includes(entry.value)
      ) {
        broaderMatches.push(entry.line);
      }
    }
  });

  return {
    exactDuplicate,
    sameTargetDifferentPolicy,
    narrowerMatches: [...new Set(narrowerMatches)].slice(0, 2),
    broaderMatches: [...new Set(broaderMatches)].slice(0, 2),
  };
};
