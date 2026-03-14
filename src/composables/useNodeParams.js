import { isDefined } from "../utils/tribool.js";

/**
 * 系统默认值 - 参考 Clash Verge 的默认行为
 * 这些参数会静默应用，用户无需配置
 */
const systemDefaults = {
  udp: true,
  tfo: false,
  skipCertVerify: true,
  vmessCipher: "auto",
  vmessAlterId: 0,
};

/**
 * 参数补全 Composable
 * 仅保留静默的协议默认值补全，不再暴露额外用户配置。
 * client-fingerprint 已通过全局 global-client-fingerprint 配置，不再逐节点注入。
 */
export const useNodeParams = () => {
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

    // 不再逐节点注入 client-fingerprint，依赖全局 global-client-fingerprint

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
      // VLESS flow 仍需显式指纹
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

    anytls: (node) => {
      const result = { ...node };
      if (!isDefined(result["client-fingerprint"])) {
        result["client-fingerprint"] = "chrome";
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
   * 统一补全单个节点（静默运行）
   */
  const completeNode = (rawNode) => {
    let node = { ...rawNode };

    // 1. 通用参数补全
    node = commonConstruct(node);

    // 2. 协议特定补全
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

  return {
    completeNode,
    completeNodes,
  };
};
