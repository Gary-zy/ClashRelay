import { ref } from "vue";
import { ElMessage } from "element-plus";
import yaml from "js-yaml";
import { diffLines } from "diff";

const TEMPLATE_KEY = "clashrelay_template";

export const useImportExport = ({
  form,
  nodes,
  customRules,
  status,
  yamlText,
  previousYaml,
}) => {
  const diffResult = ref([]);
  const showDiffDialog = ref(false);

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
  };

  const parseClashConfig = (yamlSource) => {
    const config = yaml.load(yamlSource);

    return {
      dnsMode: config.dns?.["enhanced-mode"],
      domesticDns: config.dns?.nameserver?.join(", "),
      foreignDns: config.dns?.fallback?.join(", "),
      proxies: config.proxies || [],
      proxyGroups: config["proxy-groups"] || [],
      rules: config.rules || [],
    };
  };

  const handleConfigImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseClashConfig(e.target.result);

        const nonSocks5Nodes = parsed.proxies.filter((p) => p.type !== "socks5");
        nodes.value = nonSocks5Nodes;

        const importedRules = parsed.rules.filter((r) => !r.startsWith("MATCH"));
        customRules.value = importedRules.slice(0, 50);

        const socks5Node = parsed.proxies.find((p) => p.type === "socks5");
        if (socks5Node) {
          form.socksServer = socks5Node.server || "";
          form.socksPort = String(socks5Node.port || "");
          form.socksUser = socks5Node.username || "";
          form.socksPass = socks5Node.password || "";
          form.socksAlias = socks5Node.name || "落地节点";
        }

        if (parsed.dnsMode) {
          form.dnsMode = parsed.dnsMode;
        }
        if (parsed.domesticDns) {
          form.domesticDns = parsed.domesticDns;
        }
        if (parsed.foreignDns) {
          form.foreignDns = parsed.foreignDns;
        }

        setStatus(`成功导入配置：${nonSocks5Nodes.length} 个节点，${importedRules.length} 条规则`, "success");
      } catch (error) {
        setStatus(`配置解析失败：${error.message}`, "error");
      }
    };
    reader.readAsText(file.raw);
  };

  const saveTemplate = () => {
    try {
      const template = {
        includeDefaultRules: form.includeDefaultRules,
        dnsMode: form.dnsMode,
        domesticDns: form.domesticDns,
        foreignDns: form.foreignDns,
        ruleProviders: form.ruleProviders,
        customRulesText: form.customRulesText,
        customRules: customRules.value,
      };
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
      ElMessage({
        message: "✅ 配置模板已保存！",
        type: "success",
        duration: 2000,
      });
    } catch {
      ElMessage.error("保存模板失败");
    }
  };

  const loadTemplate = () => {
    try {
      const saved = localStorage.getItem(TEMPLATE_KEY);
      if (saved) {
        const template = JSON.parse(saved);
        form.includeDefaultRules = template.includeDefaultRules ?? true;
        form.dnsMode = template.dnsMode ?? "fake-ip";
        form.domesticDns = template.domesticDns ?? "";
        form.foreignDns = template.foreignDns ?? "";
        form.ruleProviders = template.ruleProviders ?? [];
        form.customRulesText = template.customRulesText ?? "";
        if (template.customRules) {
          // 迁移旧的硬编码策略组名称为占位符
          customRules.value = template.customRules.map((rule) =>
            rule.replace(/,([^,]+)专线$/g, ",{{LANDING}}")
          );
        }
        ElMessage({
          message: "✅ 配置模板已加载！",
          type: "success",
          duration: 2000,
        });
      } else {
        ElMessage.warning("没有找到已保存的模板");
      }
    } catch {
      ElMessage.error("加载模板失败");
    }
  };

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlText.value);
      ElMessage({
        message: "✅ 已复制到剪贴板",
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      ElMessage.error("复制失败，请手动复制");
    }
  };

  const downloadYaml = () => {
    const blob = new Blob([yamlText.value], { type: "text/yaml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "config.yaml";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const showConfigDiff = () => {
    if (!previousYaml.value || !yamlText.value) {
      setStatus("需要至少生成两次配置才能对比", "warning");
      return;
    }
    diffResult.value = diffLines(previousYaml.value, yamlText.value);
    showDiffDialog.value = true;
  };

  return {
    diffResult,
    showDiffDialog,
    parseClashConfig,
    handleConfigImport,
    saveTemplate,
    loadTemplate,
    copyYaml,
    downloadYaml,
    showConfigDiff,
  };
};
