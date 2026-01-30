/**
 * Tribool 工具函数
 * 借鉴 subconverter 的 tribool 类型，用于区分"明确设置"与"未设置"
 */

/**
 * 将各种类型的值转换为 tribool (true/false/undefined)
 * @param {*} v - 输入值
 * @returns {boolean|undefined}
 */
export const toTriBool = (v) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return undefined;
};

/**
 * 按优先级选择值：节点自带 > 用户设置 > 系统默认
 * @param {*} nodeVal - 节点自带的值
 * @param {*} userVal - 用户全局设置的值
 * @param {*} systemVal - 系统默认值
 * @returns {*} 最终生效的值
 */
export const pickByPriority = (nodeVal, userVal, systemVal) => {
  for (const v of [nodeVal, userVal, systemVal]) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

/**
 * 判断值是否为"已设置"状态
 * @param {*} v - 输入值
 * @returns {boolean}
 */
export const isDefined = (v) => v !== undefined && v !== null && v !== "";

/**
 * 获取参数的来源类型
 * @param {*} nodeVal - 节点值
 * @param {*} userVal - 用户值
 * @param {*} systemVal - 系统值
 * @returns {'node'|'user'|'system'|'none'}
 */
export const getValueSource = (nodeVal, userVal, systemVal) => {
  if (isDefined(nodeVal)) return "node";
  if (isDefined(userVal)) return "user";
  if (isDefined(systemVal)) return "system";
  return "none";
};
