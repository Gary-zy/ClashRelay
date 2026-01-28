import { ref, watch, onUnmounted } from "vue";
import yaml from "js-yaml";
import { parseProxyLine, tryDecodeBase64 } from "../utils/parsers.js";

const HISTORY_KEY = "clashrelay_history";

export const useSubscription = ({ form, nodes, status, saveConfig }) => {
  const isFetching = ref(false);
  const subscriptionHistory = ref([]);
  const refreshTimer = ref(null);

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
    try {
      const subscriptionUrl = form.subscriptionUrl.trim();
      const proxyUrl = form.proxyUrl.trim();
      const base = proxyUrl ? proxyUrl.replace(/\/+$/, "") : "";
      const fetchUrl = base ? `${base}/fetch?url=${encodeURIComponent(subscriptionUrl)}` : subscriptionUrl;
      const response = await fetch(fetchUrl);
      text = await response.text();
    } catch (error) {
      isFetching.value = false;
      setStatus("订阅拉取失败，可能存在 CORS 限制。请展开高级选项配置本地代理后再试。", "warning");
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
      setStatus("未解析到节点，请确认订阅内容格式是否正确。", "error");
      return;
    }

    nodes.value = parsed;
    nodes.value.forEach((node) => {
      node.latency = -1;
    });

    if (!form.dialerProxy && parsed[0]) {
      form.dialerProxy = parsed[0].name;
    }

    saveSubscriptionHistory(form.subscriptionUrl.trim());
    isFetching.value = false;
    setStatus(`成功解析 ${parsed.length} 个节点。`, "success");
  };

  watch(
    () => form.autoRefresh,
    (enabled) => {
      if (refreshTimer.value) {
        clearInterval(refreshTimer.value);
        refreshTimer.value = null;
      }
      if (enabled && form.subscriptionUrl) {
        refreshTimer.value = setInterval(() => {
          handleFetch();
          form.lastRefreshTime = new Date().toISOString();
          if (saveConfig) saveConfig();
        }, form.refreshInterval * 60 * 1000);
        setStatus(`已启用自动刷新，间隔 ${form.refreshInterval} 分钟`, "success");
      }
    }
  );

  watch(
    () => form.refreshInterval,
    () => {
      if (form.autoRefresh && form.subscriptionUrl) {
        if (refreshTimer.value) {
          clearInterval(refreshTimer.value);
        }
        refreshTimer.value = setInterval(() => {
          handleFetch();
          form.lastRefreshTime = new Date().toISOString();
          if (saveConfig) saveConfig();
        }, form.refreshInterval * 60 * 1000);
      }
    }
  );

  onUnmounted(() => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value);
      refreshTimer.value = null;
    }
  });

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
