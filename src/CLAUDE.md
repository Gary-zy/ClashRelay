# src 目录说明

`src/` 是 RelayBox 的前端源代码目录，当前产品范围已经收敛为 `Clash only`。

## 当前模块职责

- `main.js`
  - 初始化 Vue 应用
  - 注册 Element Plus
- `App.vue`
  - 主页面
  - 组织四步主流程
  - 管理本地持久化与导出
- `composables/useSubscription.js`
  - 订阅抓取
  - 历史记录
  - 订阅错误分类提示
- `composables/useNodes.js`
  - 节点搜索、排序、分组、选择、测速
- `composables/useConfig.js`
  - 落地节点校验
  - Clash 配置构建
  - 可测试的纯函数导出
- `composables/useNodeParams.js`
  - 对节点做静默默认值补全
- `config/defaultConfig.js`
  - 默认规则
  - Fake-IP 过滤列表
- `utils/parsers.js`
  - 各类节点链接解析
- `styles.css`
  - 全局主题与通用样式

## 已移除的旧能力

这些不再属于当前代码结构：

- `V2Ray` 导出
- 规则模板
- 外部 `rule-providers`
- 配置导入导出面板
- 节点健康监控
- 自动刷新订阅

## 当前表单结构

```ts
interface FormData {
  subscriptionUrl: string;
  proxyUrl: string;
  landingNodeUrl: string;
  landingNodeType: string;
  socksServer: string;
  socksPort: string;
  socksUser: string;
  socksPass: string;
  socksAlias: string;
  dialerProxyGroup: string[];
  dialerProxyType: "url-test" | "select" | "fallback";
  urlTestInterval: number;
  urlTestTolerance: number;
  urlTestLazy: boolean;
  customRulesText: string;
  isDirect: boolean;
}
```

## 测试

仓库当前使用 Node 自带测试：

```bash
npm test
```

覆盖重点：

- 中转单跳板
- 中转多跳板
- 直连无跳板
- 复杂协议必须走链接解析
- 自定义规则优先级与去重
- 订阅错误提示分类
