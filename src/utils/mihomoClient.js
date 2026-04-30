const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").replace(/\/+$/, "");

export const getMihomoFriendlyErrorMessage = (message) => {
  const raw = String(message || "mihomo 请求失败");
  const lower = raw.toLowerCase();

  if (/unauthorized|401/.test(lower)) {
    return "服务令牌不对，检查页面里填的 RELAYBOX_TOKEN 和服务端环境变量是否一致。";
  }
  if (/mihomo 不可用|mihomo unavailable|mihomo.*not found|enoent|mihomo_bin/i.test(raw)) {
    return "mihomo 不可用，检查 Docker 镜像是否安装 mihomo，或确认 MIHOMO_BIN 指向可执行文件。";
  }
  if (/测速任务繁忙|busy/.test(raw)) {
    return "测速任务繁忙，稍后再试；服务端同一时间最多跑少量 mihomo 实例。";
  }
  if (/controller 启动超时|controller.*timeout|启动超时/i.test(raw)) {
    return "mihomo controller 启动超时，先用 mihomo 校验配置，再检查端口和策略组是否能正常加载。";
  }
  if (/CONNECT|出口 IP|trace|cdn-cgi/i.test(raw)) {
    return "出口 IP 检测失败，但延迟结果可能仍可用；可关闭“查出口 IP”后重试。";
  }

  return raw;
};

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return getMihomoFriendlyErrorMessage(data.error || data.message || `HTTP ${response.status}`);
  } catch {
    return getMihomoFriendlyErrorMessage(`HTTP ${response.status}`);
  }
};

export const createMihomoClient = ({
  baseUrl = "",
  token = "",
  fetchImpl = globalThis.fetch,
} = {}) => {
  const request = async (path, payload) => {
    const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  };

  return {
    checkConfig: (yamlText) => request("/mihomo/check", { yamlText }),
    benchmarkPolicies: (payload) => request("/mihomo/benchmark", payload),
  };
};
