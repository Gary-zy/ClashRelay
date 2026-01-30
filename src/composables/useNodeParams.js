import { ref, reactive, watch } from "vue";
import { pickByPriority, isDefined } from "../utils/tribool.js";

const PARAMS_KEY = "clashrelay_rename_config";

/**
 * 系统默认值 - 参考 Clash Verge 的默认行为
 * 这些参数会静默应用，用户无需配置
 */
const systemDefaults = {
  udp: true,
  tfo: false,
  skipCertVerify: true,
  clientFingerprint: "chrome",
  vmessCipher: "auto",
  vmessAlterId: 0,
};

/**
 * 参数补全 Composable
 * 静默运行，自动为节点补全缺失的参数
 */
export const useNodeParams = () => {
  // 节点名称清洗配置（这是唯一暴露给用户的功能）
  const globalParams = reactive({
    renameEnabled: false,
    renamePattern: "",
    renameReplace: "",
  });

  // 从 localStorage 加载清洗配置
  const loadParams = () => {
    try {
      const saved = localStorage.getItem(PARAMS_KEY);
      if (saved) {
        Object.assign(globalParams, JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  };

  // 保存清洗配置
  const saveParams = () => {
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify({
        renameEnabled: globalParams.renameEnabled,
        renamePattern: globalParams.renamePattern,
        renameReplace: globalParams.renameReplace,
      }));
    } catch (e) {
      // ignore
    }
  };

  /**
   * 通用参数补全 - 静默应用
   */
  const commonConstruct = (node) => {
    const result = { ...node };

    // UDP - 默认开启
    if (!isDefined(result.udp)) {
      result.udp = systemDefaults.udp;
    }

    // Skip Cert Verify - 默认开启（与 Clash Verge 一致）
    if (!isDefined(result["skip-cert-verify"])) {
      result["skip-cert-verify"] = systemDefaults.skipCertVerify;
    }

    // Client Fingerprint - 为 TLS 节点添加
    if (result.tls && !isDefined(result["client-fingerprint"])) {
      result["client-fingerprint"] = systemDefaults.clientFingerprint;
    }

    return result;
  };

  /**
   * 协议特定参数补全
   */
  const protocolConstruct = {
    vmess: (node) => {
      const result = { ...node };
      if (!isDefined(result.cipher)) {
        result.cipher = systemDefaults.vmessCipher;
      }
      if (!isDefined(result.alterId)) {
        result.alterId = systemDefaults.vmessAlterId;
      }
      return result;
    },

    vless: (node) => {
      const result = { ...node };
      if (result.flow && !result["client-fingerprint"]) {
        result["client-fingerprint"] = "chrome";
      }
      return result;
    },

    trojan: (node) => {
      const result = { ...node };
      if (result.tls === undefined) {
        result.tls = true;
      }
      return result;
    },

    ss: (node) => node,
    ssr: (node) => node,

    hysteria: (node) => {
      const result = { ...node };
      if (!result.up) result.up = "100";
      if (!result.down) result.down = "100";
      return result;
    },

    hysteria2: (node) => node,

    tuic: (node) => {
      const result = { ...node };
      if (!result["congestion-controller"]) {
        result["congestion-controller"] = "bbr";
      }
      return result;
    },
  };

  /**
   * 节点名称清洗
   */
  const cleanNodeName = (name) => {
    if (!globalParams.renameEnabled || !globalParams.renamePattern) {
      return name;
    }
    try {
      const regex = new RegExp(globalParams.renamePattern, "g");
      return name.replace(regex, globalParams.renameReplace || "").trim();
    } catch (e) {
      return name;
    }
  };

  /**
   * 统一补全单个节点（静默运行）
   */
  const completeNode = (rawNode) => {
    let node = { ...rawNode };

    // 1. 名称清洗
    node.name = cleanNodeName(node.name);

    // 2. 通用参数补全
    node = commonConstruct(node);

    // 3. 协议特定补全
    const construct = protocolConstruct[node.type];
    if (construct) {
      node = construct(node);
    }

    return node;
  };

  /**
   * 批量补全节点
   */
  const completeNodes = (nodes) => nodes.map(completeNode);

  /**
   * 预览节点清洗结果
   */
  const previewRename = (nodes) => {
    if (!globalParams.renameEnabled || !globalParams.renamePattern) {
      return nodes.map((n) => ({ original: n.name, cleaned: n.name }));
    }
    return nodes.map((n) => ({
      original: n.name,
      cleaned: cleanNodeName(n.name),
    }));
  };

  // 自动保存清洗配置
  watch(
    () => ({
      renameEnabled: globalParams.renameEnabled,
      renamePattern: globalParams.renamePattern,
      renameReplace: globalParams.renameReplace,
    }),
    () => saveParams(),
    { deep: true }
  );

  // 初始化
  loadParams();

  return {
    globalParams,
    completeNode,
    completeNodes,
    previewRename,
  };
};
