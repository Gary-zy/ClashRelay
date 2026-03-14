import { computed, ref } from "vue";
import { formatTime } from "../utils/helpers.js";
import { desktopApi, isDesktopApp } from "../utils/desktop.js";

const regionMap = {
  "香港": ["香港", "HK", "Hong Kong", "HongKong", "🇭🇰"],
  "美国": ["美国", "US", "USA", "United States", "🇺🇸"],
  "日本": ["日本", "JP", "Japan", "🇯🇵"],
  "新加坡": ["新加坡", "SG", "Singapore", "🇸🇬"],
  "台湾": ["台湾", "TW", "Taiwan", "🇹🇼"],
  "韩国": ["韩国", "KR", "Korea", "🇰🇷"],
  "德国": ["德国", "DE", "Germany", "🇩🇪"],
  "法国": ["法国", "FR", "France", "🇫🇷"],
  "英国": ["英国", "UK", "GB", "Britain", "🇬🇧"],
  "澳大利亚": ["澳大利亚", "AU", "Australia", "🇦🇺"],
};

export const useNodes = ({ form, status }) => {
  const nodes = ref([]);
  const nodeSearch = ref("");
  const nodeSortBy = ref("default");
  const activeNodeGroup = ref("all");
  const isTesting = ref(false);

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
  };

  const getNodeRegion = (nodeName) => {
    for (const [region, keywords] of Object.entries(regionMap)) {
      if (keywords.some((kw) => nodeName.toLowerCase().includes(kw.toLowerCase()))) {
        return region;
      }
    }
    return "其他";
  };

  const nodeGroups = computed(() => {
    const groups = {};
    nodes.value.forEach((node) => {
      const region = getNodeRegion(node.name);
      if (!groups[region]) {
        groups[region] = { key: region, label: region, count: 0 };
      }
      groups[region].count++;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  });

  const filteredNodes = computed(() => {
    let result = [...nodes.value];

    if (nodeSearch.value) {
      const searchLower = nodeSearch.value.toLowerCase();
      result = result.filter(
        (node) =>
          node.name.toLowerCase().includes(searchLower) ||
          node.server?.toLowerCase().includes(searchLower) ||
          node.type?.toLowerCase().includes(searchLower)
      );
    }

    if (nodeSortBy.value === "latency") {
      result.sort((a, b) => {
        const la = a.latency > 0 ? a.latency : 99999;
        const lb = b.latency > 0 ? b.latency : 99999;
        return la - lb;
      });
    } else if (nodeSortBy.value === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (nodeSortBy.value === "type") {
      result.sort((a, b) => a.type.localeCompare(b.type));
    }

    return result;
  });

  const displayNodes = computed(() => {
    if (activeNodeGroup.value === "all") {
      return filteredNodes.value;
    }
    return filteredNodes.value.filter((node) => getNodeRegion(node.name) === activeNodeGroup.value);
  });

  const handleNodeRowClick = (row) => {
    if (form.isDirect) return;
    const index = form.dialerProxyGroup.indexOf(row.name);
    if (index > -1) {
      form.dialerProxyGroup.splice(index, 1);
    } else {
      form.dialerProxyGroup.push(row.name);
    }
  };

  // 全选当前显示的节点
  const selectAllNodes = () => {
    if (form.isDirect) return;
    const currentNodes = displayNodes.value.map((n) => n.name);
    currentNodes.forEach((name) => {
      if (!form.dialerProxyGroup.includes(name)) {
        form.dialerProxyGroup.push(name);
      }
    });
    setStatus(`已选择 ${currentNodes.length} 个节点`, "success");
  };

  // 反选当前显示的节点
  const invertSelection = () => {
    if (form.isDirect) return;
    const currentNodes = displayNodes.value.map((n) => n.name);
    currentNodes.forEach((name) => {
      const index = form.dialerProxyGroup.indexOf(name);
      if (index > -1) {
        form.dialerProxyGroup.splice(index, 1);
      } else {
        form.dialerProxyGroup.push(name);
      }
    });
    setStatus(`已反选节点`, "success");
  };

  // 清空所有选择
  const clearSelection = () => {
    form.dialerProxyGroup.splice(0, form.dialerProxyGroup.length);
    setStatus(`已清空选择`, "success");
  };

  const getNodeDisplayName = (node) =>
    node.name.replace(/\s*\(\d+ms\)$/, "").replace(/\s*\(超时\)$/, "");

  const getLatencyColor = (latency) => {
    if (latency < 100) return "#67c23a";
    if (latency < 200) return "#e6a23c";
    return "#f56c6c";
  };

  const testNodeLatency = async (node) => {
    if (isDesktopApp()) {
      try {
        const data = await desktopApi.pingNode(node.server, Number(node.port));
        return data.latency;
      } catch (error) {
        return -2;
      }
    }

    const proxyUrl = (form.proxyUrl || "").replace(/\/+$/, "");
    if (!proxyUrl) return -2; // 无代理服务时直接跳过
    const pingUrl = `${proxyUrl}/ping`;

    try {
      const response = await fetch(pingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server: node.server, port: node.port }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.latency;
      }
      return -2;
    } catch (error) {
      return -2;
    }
  };

  const testAllNodesLatency = async () => {
    if (nodes.value.length === 0) {
      setStatus("没有可测试的节点。", "warning");
      return;
    }

    isTesting.value = true;
    setStatus("正在测试节点延迟...", "info");

    nodes.value.forEach((node) => {
      node.latency = null;
    });

    const testPromises = nodes.value.map(async (node) => {
      const latency = await testNodeLatency(node);
      node.latency = latency;
      node.name = node.name.replace(/\s*\(\d+ms\)$/, "").replace(/\s*\(超时\)$/, "");
    });

    await Promise.all(testPromises);

    isTesting.value = false;
    const successCount = nodes.value.filter((n) => n.latency > 0).length;
    setStatus(`测速完成！成功测试 ${successCount}/${nodes.value.length} 个节点。`, "success");
  };

  return {
    nodes,
    nodeSearch,
    nodeSortBy,
    activeNodeGroup,
    isTesting,
    getNodeRegion,
    nodeGroups,
    filteredNodes,
    displayNodes,
    handleNodeRowClick,
    selectAllNodes,
    invertSelection,
    clearSelection,
    getNodeDisplayName,
    getLatencyColor,
    testNodeLatency,
    testAllNodesLatency,
    formatTime,
  };
};
