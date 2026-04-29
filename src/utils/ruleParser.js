/**
 * 按顶层逗号拆分规则字符串
 * 正确处理括号内的嵌套逗号（如 OR/NOT 逻辑规则）
 * @param {string} rule - 规则字符串
 * @returns {string[]} 拆分后的部分
 */
export const splitRuleByTopLevelCommas = (rule) => {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < rule.length; i++) {
    if (rule[i] === "(") depth++;
    else if (rule[i] === ")" && depth > 0) depth--;
    else if (rule[i] === "," && depth === 0) {
      parts.push(rule.substring(start, i));
      start = i + 1;
    }
  }

  parts.push(rule.substring(start));
  return parts;
};
