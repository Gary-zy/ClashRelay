import { ref } from "vue";
import yaml from "js-yaml";
import { parseProxyLine, tryDecodeBase64 } from "../utils/parsers.js";
import { getFetchErrorMessage } from "./useConfig.js";
import { desktopApi, isDesktopApp } from "../utils/desktop.js";

const HISTORY_KEY = "clashrelay_history";

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

    const nameCounts = new Map();
    const finalNodes = [];

    parsed.forEach((node) => {
      let uniqueName = node.name;
      if (nameCounts.has(uniqueName)) {
        const count = nameCounts.get(uniqueName) + 1;
        nameCounts.set(uniqueName, count);
        uniqueName = `${uniqueName} (${count - 1})`;
        node.name = uniqueName;
      } else {
        nameCounts.set(uniqueName, 1);
      }
      finalNodes.push(node);
    });

    nodes.value = finalNodes;
    nodes.value.forEach((node) => {
      node.latency = -1;
    });

    // 裁剪 dialerProxyGroup：移除新订阅中已不存在的悬空节点名
    const newNodeNames = new Set(finalNodes.map((n) => n.name));
    const before = form.dialerProxyGroup.length;
    form.dialerProxyGroup = form.dialerProxyGroup.filter((name) => newNodeNames.has(name));
    const pruned = before - form.dialerProxyGroup.length;

    saveSubscriptionHistory(form.subscriptionUrl.trim());
    if (saveConfig) saveConfig();
    isFetching.value = false;
    const prunedNote = pruned > 0 ? `（已自动移除 ${pruned} 个失效跳板选择）` : "";
    setStatus(`成功解析 ${parsed.length} 个节点。${prunedNote}`, "success");
  };

  return {
    isFetching,
    subscriptionHistory,
    querySubscriptionHistory,
    removeHistoryItem,
    clearSubscriptionHistory,
    handleFetch,
    parseSubscription,
  };
};
