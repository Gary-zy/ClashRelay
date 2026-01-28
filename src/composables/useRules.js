import { ref, reactive, watch, onMounted } from "vue";
import { ruleTemplates } from "../config/ruleTemplates.js";
import { defaultRules, ruleTypes } from "../config/defaultConfig.js";
import { formRules } from "../utils/validators.js";

const RULES_KEY = "clashrelay_rules";

export const useRules = ({ status }) => {
  const customRules = ref([]);
  const showDefaultRules = ref(false);
  const ruleBuilder = reactive({
    type: "DOMAIN-SUFFIX",
    value: "",
    policy: "",
  });

  const setStatus = (message, type) => {
    if (!status) return;
    status.message = message;
    status.type = type;
  };

  onMounted(() => {
    try {
      const savedRules = localStorage.getItem(RULES_KEY);
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        customRules.value = rules.map((rule) =>
          rule.replace(/,([^,]+)专线$/g, ",{{LANDING}}")
        );
      }
    } catch {}
  });

  watch(
    customRules,
    (newRules) => {
      try {
        localStorage.setItem(RULES_KEY, JSON.stringify(newRules));
      } catch {}
    },
    { deep: true }
  );

  const addCustomRule = () => {
    if (!ruleBuilder.type || !ruleBuilder.value || !ruleBuilder.policy) {
      setStatus("请填写完整的规则信息。", "warning");
      return;
    }

    const rule = `${ruleBuilder.type},${ruleBuilder.value},${ruleBuilder.policy}`;
    customRules.value.push(rule);
    ruleBuilder.value = "";

    setStatus(`规则已添加：${rule}`, "success");
  };

  const removeCustomRule = (index) => {
    customRules.value.splice(index, 1);
    setStatus("规则已删除。", "info");
  };

  const applyRuleTemplate = (templateKey) => {
    const template = ruleTemplates[templateKey];
    if (!template) return;

    let addedCount = 0;
    template.rules.forEach((rule) => {
      if (!customRules.value.includes(rule)) {
        customRules.value.push(rule);
        addedCount++;
      }
    });

    setStatus(`已应用「${template.name}」模板，新增 ${addedCount} 条规则。`, "success");
  };

  return {
    customRules,
    showDefaultRules,
    ruleBuilder,
    addCustomRule,
    removeCustomRule,
    applyRuleTemplate,
    rules: formRules,
    defaultRules,
    ruleTypes,
    ruleTemplates,
  };
};
