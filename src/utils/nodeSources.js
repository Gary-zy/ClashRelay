const SOURCE_LABELS = [
  {
    aliases: ["美国", "US", "USA", "United States", "🇺🇸"],
    label: "🇺🇸 美国",
  },
  {
    aliases: ["日本", "JP", "Japan", "🇯🇵"],
    label: "🇯🇵 日本",
  },
];

export const normalizeSourceValue = (value) => String(value || "").trim();

export const getSourceGroupLabel = (sourceName, sourcePrefix = "") => {
  const name = normalizeSourceValue(sourceName);
  const prefix = normalizeSourceValue(sourcePrefix);
  const candidates = [name, prefix].filter(Boolean);

  for (const { aliases, label } of SOURCE_LABELS) {
    if (candidates.some((candidate) =>
      aliases.some((alias) => candidate.toLowerCase() === alias.toLowerCase())
    )) {
      return label;
    }
  }

  return name ? `📦 ${name}` : "";
};

export const getNodeSourceGroup = (node) => {
  const sourceName = normalizeSourceValue(node?.sourceName);
  if (!sourceName) return null;

  return {
    key: `source:${sourceName}`,
    label: getSourceGroupLabel(sourceName, node?.sourcePrefix),
    sourceName,
  };
};

export const applySourceToNodes = (nodes, { sourceName, sourcePrefix }) => {
  const normalizedSourceName = normalizeSourceValue(sourceName);
  if (!normalizedSourceName) {
    return { ok: false, reason: "missing_source", nodes: [] };
  }

  const normalizedPrefix = normalizeSourceValue(sourcePrefix) || normalizedSourceName;
  const prefixMarker = `${normalizedPrefix} - `;

  return {
    ok: true,
    nodes: nodes.map((node) => {
      const originalName = normalizeSourceValue(node.name);
      const name = originalName.startsWith(prefixMarker)
        ? originalName
        : `${prefixMarker}${originalName}`;

      return {
        ...node,
        name,
        sourceName: normalizedSourceName,
        sourcePrefix: normalizedPrefix,
      };
    }),
  };
};

export const buildSourceProxyGroups = (nodes, allowedNames = null) => {
  const allowed = allowedNames ? new Set(allowedNames) : null;
  const groupMap = new Map();

  nodes.forEach((node) => {
    if (allowed && !allowed.has(node.name)) return;
    const sourceGroup = getNodeSourceGroup(node);
    if (!sourceGroup) return;

    if (!groupMap.has(sourceGroup.label)) {
      groupMap.set(sourceGroup.label, {
        name: sourceGroup.label,
        type: "select",
        proxies: [],
      });
    }

    groupMap.get(sourceGroup.label).proxies.push(node.name);
  });

  return [...groupMap.values()].filter((group) => group.proxies.length > 0);
};

export const compressPoliciesByCompleteSourceGroups = (selectedNames, sourceGroups) => {
  const selected = new Set(selectedNames);
  const consumed = new Set();
  const policies = [];

  sourceGroups.forEach((group) => {
    const groupIsFullySelected = group.proxies.every((name) => selected.has(name));
    if (!groupIsFullySelected) return;

    policies.push(group.name);
    group.proxies.forEach((name) => consumed.add(name));
  });

  selectedNames.forEach((name) => {
    if (!consumed.has(name)) {
      policies.push(name);
    }
  });

  return policies;
};
