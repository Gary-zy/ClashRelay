export const formRules = {
  subscriptionUrl: [{ type: "url", message: "请输入有效的 URL", trigger: "blur" }],
  socksServer: [{ required: true, message: "请输入落地服务器", trigger: "blur" }],
  socksPort: [{ required: true, message: "请输入端口", trigger: "blur" }],
  socksAlias: [{ required: true, message: "请输入节点别名", trigger: "blur" }],
};
