# App.vue 重构计划

## 当前状态

| 指标 | 数值 |
|------|------|
| 总行数 | 2644 行 |
| 模板部分 | ~650 行 |
| 脚本部分 | ~2000 行 |
| 协议解析函数 | 8 个 (~700 行) |
| YAML 生成函数 | 1 个 (~380 行) |

## 拆分方案

### 目录结构

```
src/
├── App.vue                    # 主组件，保留 UI 布局和整合逻辑
├── composables/
│   ├── useNodes.js           # 节点管理（解析、测速、健康监控）
│   ├── useSubscription.js    # 订阅获取与解析
│   ├── useConfig.js          # YAML 配置生成
│   ├── useRules.js           # 规则管理
│   └── useImportExport.js    # 导入导出功能
├── utils/
│   ├── parsers.js            # 各协议解析器集合
│   ├── validators.js         # 表单验证
│   └── helpers.js            # 工具函数
├── components/
│   ├── NodeList.vue          # 节点列表组件
│   ├── NodeTable.vue         # 节点表格组件
│   ├── RuleEditor.vue        # 规则编辑器
│   ├── YamlPreview.vue       # YAML 预览组件
│   └── ConfigForm.vue        # 配置表单组件
└── styles/
    └── components.css        # 组件样式
```

## 详细拆分

### 1. utils/parsers.js (~700 行 → 移除)

```
extract:
- parseVmess (line 1511-1627)
- parseVless (line 1628-1752)
- parseTrojan (line 1753-1858)
- parseSS (line 1859-1939)
- parseSSR (line 1940-1991)
- parseHysteria (line 1992-2046)
- parseHysteria2 (line 2047-2101)
- parseTUIC (line 2102-2156)
- parseProxyLine (line 1499-1508)
- tryDecodeBase64 (line 1482-1495)
- parseRules (line 2157-2161)
```

### 2. composables/useNodes.js (~400 行)

```
保留:
- nodes ref
- filteredNodes computed
- displayNodes computed
- nodeGroups computed
- nodeSearch, nodeSortBy, activeNodeGroup
- getNodeRegion, getNodeDisplayName, getLatencyColor
- toggleFavorite, isFavorite
- testNodeLatency, testAllNodesLatency
- checkNodeHealth, runHealthCheck
- healthCheckConfig, nodeHealthStatus
- getNodeHealthStatus, formatTime

extract to parsers.js:
- parseVmess, parseVless, parseTrojan, parseSS
- parseSSR, parseHysteria, parseHysteria2, parseTUIC
```

### 3. composables/useSubscription.js (~150 行)

```
保留:
- handleFetch
- parseSubscription
- form.subscriptionUrl, form.proxyUrl
- isFetching
- subscriptionHistory

移除重复逻辑:
- 提取 parseSubscription 中的解析逻辑到 useNodes
```

### 4. composables/useConfig.js (~400 行)

```
保留:
- generateYaml (line 2163-2539)
- policyGroups computed
- selectedNodes computed
- defaultRulesDisplay computed
- form.dialerProxyGroup, form.dialerProxy
- landingProxyName, landingGroupName
```

### 5. composables/useRules.js (~100 行)

```
保留:
- customRules
- ruleBuilder
- addCustomRule, removeCustomRule
- applyRuleTemplate
- rules 对象
- defaultRules, showDefaultRules
```

### 6. composables/useImportExport.js (~150 行)

```
保留:
- handleConfigImport
- parseClashConfig
- saveTemplate, loadTemplate
- copyYaml, downloadYaml
- openClashImportUrl, copyClashImportUrl
- generateClashImportUrl
- showConfigDiff, diffResult
```

### 7. components/NodeList.vue (~200 行模板)

```
从 App.vue template 提取:
- 节点列表相关 UI (搜索、筛选、排序、收藏)
- 节点表格显示
- 测速按钮
```

### 8. components/ConfigForm.vue (~300 行模板)

```
从 App.vue template 提取:
- 配置表单 (订阅、落地节点、DNS 等)
- 规则集选择
- 规则编辑器
```

## 实施步骤

### Step 1: 创建目录结构和入口文件
```bash
mkdir -p src/composables src/components src/utils
```

### Step 2: 创建 utils/parsers.js
- 提取所有协议解析函数
- 保持 API 不变

### Step 3: 创建 composables/useNodes.js
- 移动节点相关状态和计算属性
- 导入 parsers.js

### Step 4: 创建 composables/useConfig.js
- 移动配置生成相关逻辑

### Step 5: 创建 composables/useRules.js
- 移动规则管理逻辑

### Step 6: 创建 composables/useSubscription.js
- 移动订阅获取逻辑

### Step 7: 创建 composables/useImportExport.js
- 移动导入导出逻辑

### Step 8: 拆分模板到组件
- 创建 NodeList.vue
- 创建 ConfigForm.vue
- 更新 App.vue 使用新组件

### Step 9: 清理和验证
- 删除 App.vue 中已提取的代码
- 验证功能完整性

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| API 变更导致错误 | 保持函数签名一致，使用 IDE 重构功能 |
| 循环依赖 | parsers.js 不依赖其他 composables |
| 样式丢失 | 提取组件时保留相关 CSS |
| 功能回归 | 每步完成后测试核心功能 |

## 预期收益

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| App.vue 行数 | 2644 | ~500 |
| 单文件最大行数 | 2644 | ~700 |
| 可复用模块 | 0 | 5+ |
| 可测试单元 | 0 | 10+ |

## 启动命令

执行重构：
```bash
/ccg:execute .claude/plan/appvue-refactor.md
```
