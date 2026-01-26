# src 目录

> RelayBox 前端应用的源代码目录。

[根目录](../../CLAUDE.md) > **src**

## 模块职责

提供 Clash 配置生成器的完整前端功能，包括：
- 订阅获取与解析
- 节点管理与选择
- 配置生成与导出
- UI 交互与状态管理

## 入口与启动

### 入口文件

| 文件 | 职责 |
|------|------|
| `/src/main.js` | Vue 应用初始化，集成 Element Plus |
| `/src/App.vue` | 主应用组件，包含完整业务逻辑 |

### 启动流程

1. `main.js` 创建 Vue 应用实例
2. 注册 Element Plus 插件
3. 挂载 App 组件到 `#app`

## 对外接口

### 主组件 (App.vue)

#### Props

无 props，通过响应式状态管理数据。

#### 事件

无自定义事件，通过状态变化驱动 UI 更新。

#### 核心方法

| 方法名 | 功能 |
|--------|------|
| `handleFetch()` | 获取并解析订阅 |
| `generateYaml()` | 生成 Clash 配置 |
| `parseProxyLine()` | 解析单行节点链接 |
| `testAllNodesLatency()` | 测试所有节点延迟 |

## 关键依赖与配置

### 依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| vue | latest | MVVM 框架 |
| element-plus | latest | UI 组件库 |
| js-yaml | latest | YAML 解析/生成 |
| qrcode | latest | 二维码生成 |
| diff | latest | 配置差异对比 |

### 配置目录

| 文件 | 用途 |
|------|------|
| `/src/config/defaultConfig.js` | 默认规则、规则类型、策略组定义 |
| `/src/config/ruleTemplates.js` | 预设规则模板 |

### 样式

| 文件 | 用途 |
|------|------|
| `/src/styles.css` | 全局样式、主题变量、组件样式覆盖 |

## 数据模型

### 节点结构

```typescript
interface ProxyNode {
  name: string;       // 节点名称
  type: string;       // 代理类型 (vmess/vless/trojan/ss/ssr/hysteria/hysteria2/tuic)
  server: string;     // 服务器地址
  port: number;       // 端口
  // ... 其他协议特定字段
}
```

### 表单结构

```typescript
interface FormData {
  subscriptionUrl: string;   // 订阅地址
  proxyUrl: string;          // 本地代理地址
  socksServer: string;       // 落地服务器
  socksPort: string;         // 落地端口
  socksUser: string;         // 用户名（可选）
  socksPass: string;         // 密码（可选）
  socksAlias: string;        // 节点别名
  dialerProxyGroup: string[]; // 跳板节点列表
  dnsMode: string;           // DNS 模式
  domesticDns: string;       // 国内 DNS
  foreignDns: string;        // 国外 DNS
  ruleProviders: string[];   // 外部规则集
}
```

## 测试与质量

### 测试覆盖

- 单元测试：无
- 集成测试：无
- E2E 测试：无

### 代码质量

- ESLint 基础配置
- 无专门的质量检查脚本

## FAQ

**Q: 如何添加新的代理协议支持？**

A: 在 `App.vue` 中：
1. 在 `parseProxyLine` 函数添加协议判断
2. 实现对应的解析函数（如 `parseVmess`、`parseVless`）
3. 在 `generateYaml` 的落地节点构建逻辑中处理新协议

**Q: 如何修改默认规则？**

A: 编辑 `/src/config/defaultConfig.js`，修改 `defaultRules` 数组。规则格式为：`TYPE,VALUE,POLICY`

**Q: 配置为什么不生效？**

A: 请检查：
1. 跳板节点是否已选择
2. 落地节点信息是否完整
3. 代理服务器是否启动（`npm run dev`）

## 相关文件清单

```
src/
├── main.js              # 应用入口
├── App.vue              # 主应用组件（2295行）
├── styles.css           # 全局样式（516行）
└── config/
    ├── defaultConfig.js # 默认配置（130行）
    └── ruleTemplates.js # 规则模板（133行）
```

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-01-26 | 文档初始化 | 生成模块级 CLAUDE.md 文档 |
