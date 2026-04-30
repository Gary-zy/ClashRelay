import { ref } from "vue";
import yaml from "js-yaml";
import { parseProxyLine, tryDecodeBase64 } from "../utils/parsers.js";
import { getFetchErrorMessage } from "./useConfig.js";
import { desktopApi, isDesktopApp } from "../utils/desktop.js";
import { dedupeProxyNames, sanitizeImportedProxy } from "../utils/proxySanitizer.js";
import { applySourceToNodes } from "../utils/nodeSources.js";

const HISTORY_KEY = "clashrelay_history";

export const parseClashConfigNodes = (text, { preserveDialerProxy = false } = {}) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  let data;
  try {
    data = yaml.load(trimmed);
  } catch {
    return { ok: false, reason: "invalid_yaml" };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "missing_proxies" };
  }

  if (!("proxies" in data) || !Array.isArray(data.proxies)) {
    return { ok: false, reason: "missing_proxies" };
  }

  const nodes = data.proxies
    .map((node) => sanitizeImportedProxy(node, { preserveDialerProxy }))
    .filter(Boolean);
  if (nodes.length === 0) {
    return { ok: false, reason: "empty_proxies" };
  }

  return { ok: true, nodes };
};

export const useSubscription = ({ form, nodes, status, saveConfig }) => {
  const isFetching = ref(false);
  const subscriptionHistory = ref([]);

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
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
      history = history.filter((h) => h !== url);
      history.unshift(url);
      history = history.slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      subscriptionHistory.value = history;
    } catch {}
  };

  subscriptionHistory.value = loadSubscriptionHistory();

  const querySubscriptionHistory = (query, cb) => {
    const results = query
      ? subscriptionHistory.value.filter((url) => url.toLowerCase().includes(query.toLowerCase()))
      : subscriptionHistory.value;
    cb(results.map((url) => ({ value: url })));
  };

  const removeHistoryItem = (url) => {
    subscriptionHistory.value = subscriptionHistory.value.filter((h) => h !== url);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(subscriptionHistory.value));
    } catch {}
  };

  const clearSubscriptionHistory = () => {
    subscriptionHistory.value = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  };

  const applyImportedNodes = (importedNodes, successFormatter) => {
    const finalNodes = dedupeProxyNames(importedNodes).map((node) => ({
      ...node,
      latency: -1,
    }));

    nodes.value = finalNodes;

    const newNodeNames = new Set(finalNodes.map((node) => node.name));
    const before = form.dialerProxyGroup.length;
    form.dialerProxyGroup = form.dialerProxyGroup.filter((name) => newNodeNames.has(name));
    const pruned = before - form.dialerProxyGroup.length;

    if (saveConfig) saveConfig();
    const prunedNote = pruned > 0 ? `（已自动移除 ${pruned} 个失效跳板选择）` : "";
    setStatus(successFormatter(finalNodes.length, prunedNote), "success");

    return { ok: true, nodes: finalNodes, pruned };
  };

  const parseSubscription = (text) => {
    const trimmed = text.trim();
    const decoded = tryDecodeBase64(trimmed);
    const content = decoded || trimmed;

    if (content.includes("proxies:")) {
      const clashConfigResult = parseClashConfigNodes(content);
      if (clashConfigResult.ok) {
        return clashConfigResult.nodes;
      }
    }

    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.map((line, index) => parseProxyLine(line, index)).filter(Boolean);
  };

  const handleFetch = async () => {
    setStatus("", "info");

    if (!form.subscriptionUrl.trim()) {
      setStatus("请输入订阅地址。", "warning");
      return;
    }

    isFetching.value = true;
    setStatus("正在获取订阅...", "info");

    let text = "";
    let responseStatus = 0;
    try {
      const subscriptionUrl = form.subscriptionUrl.trim();
      const proxyUrl = form.proxyUrl.trim();
      const base = proxyUrl ? proxyUrl.replace(/\/+$/, "") : "";

      if (isDesktopApp()) {
        const response = await desktopApi.fetchSubscription(subscriptionUrl);
        responseStatus = response.status;
        if (!response.ok) {
          isFetching.value = false;
          setStatus(
            getFetchErrorMessage({
              responseStatus,
              usedProxy: false,
              errorKind: response.errorKind,
            }),
            response.status >= 500 ? "warning" : "error"
          );
          return;
        }
        text = response.text;
      } else {
        const fetchUrl = base ? `${base}/fetch?url=${encodeURIComponent(subscriptionUrl)}` : subscriptionUrl;
        const response = await fetch(fetchUrl);
        responseStatus = response.status;
        if (!response.ok) {
          isFetching.value = false;
          setStatus(
            getFetchErrorMessage({
              responseStatus,
              usedProxy: Boolean(base),
            }),
            response.status >= 500 ? "warning" : "error"
          );
          return;
        }
        text = await response.text();
      }
    } catch (error) {
      isFetching.value = false;
      setStatus(
        getFetchErrorMessage({
          error,
          responseStatus,
          usedProxy: !isDesktopApp() && Boolean(form.proxyUrl.trim()),
          errorKind: isDesktopApp() ? "network" : undefined,
        }),
        "warning"
      );
      return;
    }

    if (!text) {
      isFetching.value = false;
      setStatus("订阅内容为空。", "warning");
      return;
    }

    const parsed = parseSubscription(text);
    if (!parsed.length) {
      isFetching.value = false;
      setStatus("订阅内容拿到了，但没解析出节点。大概率是订阅格式不对，或者返回的不是节点列表。", "error");
      return;
    }

    saveSubscriptionHistory(form.subscriptionUrl.trim());
    isFetching.value = false;
    applyImportedNodes(parsed, (count, prunedNote) => `成功解析 ${count} 个节点。${prunedNote}`);
  };

  const importClashConfigText = (text) => {
    setStatus("", "info");

    const trimmed = text.trim();
    if (!trimmed) {
      setStatus("请先粘贴 Clash 配置内容。", "warning");
      return { ok: false, reason: "empty" };
    }

    const parsed = parseClashConfigNodes(trimmed);
    if (!parsed.ok) {
      const messageMap = {
        invalid_yaml: "这段文本不是合法的 Clash YAML，先确认你复制的是完整配置。",
        missing_proxies: "配置内容拿到了，但没看到 proxies 段，没法提取节点。",
        empty_proxies: "配置里有 proxies，但没有可导入的有效节点。",
        empty: "请先粘贴 Clash 配置内容。",
      };
      setStatus(messageMap[parsed.reason] || "Clash 配置解析失败。", "error");
      return parsed;
    }

    return applyImportedNodes(
      parsed.nodes,
      (count, prunedNote) => `已从 Clash 配置中导入 ${count} 个节点。${prunedNote}`
    );
  };

  const importMergedClashConfigText = ({ text, sourceName, sourcePrefix }) => {
    setStatus("", "info");

    const sourced = applySourceToNodes([], { sourceName, sourcePrefix });
    if (!sourced.ok) {
      setStatus("请先填写来源名称，比如 美国 或 日本。", "warning");
      return sourced;
    }

    const trimmed = String(text || "").trim();
    if (!trimmed) {
      setStatus("请先粘贴要融合的 Clash 配置内容。", "warning");
      return { ok: false, reason: "empty" };
    }

    const parsed = parseClashConfigNodes(trimmed);
    if (!parsed.ok) {
      const messageMap = {
        invalid_yaml: "这段文本不是合法的 Clash YAML，先确认你复制的是完整配置。",
        missing_proxies: "配置内容拿到了，但没看到 proxies 段，没法提取节点。",
        empty_proxies: "配置里有 proxies，但没有可导入的有效节点。",
        empty: "请先粘贴要融合的 Clash 配置内容。",
      };
      setStatus(messageMap[parsed.reason] || "Clash 配置解析失败。", "error");
      return parsed;
    }

    const sourceResult = applySourceToNodes(parsed.nodes, { sourceName, sourcePrefix });
    if (!sourceResult.ok) {
      setStatus("请先填写来源名称，比如 美国 或 日本。", "warning");
      return sourceResult;
    }

    const existingCount = nodes.value.length;
    const finalNodes = dedupeProxyNames([
      ...nodes.value,
      ...sourceResult.nodes.map((node) => ({
        ...node,
        latency: -1,
      })),
    ]);
    const importedNodes = finalNodes.slice(existingCount);

    nodes.value = finalNodes;
    importedNodes.forEach((node) => {
      if (!form.dialerProxyGroup.includes(node.name)) {
        form.dialerProxyGroup.push(node.name);
      }
    });

    if (saveConfig) saveConfig();
    setStatus(`已融合导入 ${importedNodes.length} 个${sourceResult.nodes[0]?.sourceName || ""}节点，并自动选为前置跳板。`, "success");

    return { ok: true, nodes: importedNodes };
  };

  return {
    isFetching,
    subscriptionHistory,
    querySubscriptionHistory,
    removeHistoryItem,
    clearSubscriptionHistory,
    handleFetch,
    parseSubscription,
    importClashConfigText,
    importMergedClashConfigText,
  };
};
