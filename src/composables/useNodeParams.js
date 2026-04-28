import { isDefined } from "../utils/tribool.js";
import { cleanProxyForExport } from "../utils/proxySanitizer.js";

/**
 * RelayBox 自建落地节点的默认值。
 * 订阅节点不走这套补全，避免和 Clash Verge 解析出的节点参数不一致。
 */
const systemDefaults = {
  udp: true,
  vmessCipher: "auto",
  vmessAlterId: 0,
};

/**
 * 参数处理 Composable
 * 订阅节点 preserve-first，仅清理 UI 运行态字段。
 * 只有 RelayBox 自建落地节点才做必要默认值补全。
 */
export const useNodeParams = () => {
  const normalizeSubscriptionNodeForExport = (node) =>
    cleanProxyForExport(node, { preserveDialerProxy: false });

  /**
   * 落地节点通用参数补全 - 只用于 RelayBox 自建落地节点。
   */
  const commonConstruct = (node) => {
    const result = { ...node };

    // UDP - 默认开启
    if (!isDefined(result.udp)) {
      result.udp = systemDefaults.udp;
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
   * 统一补全 RelayBox 自建落地节点（静默运行）
   */
  const buildLandingNodeForExport = (rawNode) => {
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
   * 兼容旧调用：订阅节点批量导出只清理运行态字段，不补默认参数。
   */
  const completeNode = buildLandingNodeForExport;
  const completeNodes = (nodes) => nodes.map(normalizeSubscriptionNodeForExport);

  return {
    completeNode,
    completeNodes,
    normalizeSubscriptionNodeForExport,
    buildLandingNodeForExport,
  };
};
