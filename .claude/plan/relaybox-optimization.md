# 📋 实施计划：RelayBox 功能增强与优化

## 任务类型
- [x] 前端 (→ Gemini)
- [x] 后端 (→ Codex)
- [x] 全栈 (→ 并行)

---

## 综合分析摘要

### Codex 后端分析要点
1. **安全风险**：`proxy-server.js` 存在 SSRF/端口扫描风险，开放 CORS 允许任意来源，配置 ID 可预测
2. **性能瓶颈**：解析和 YAML 生成同步执行，大订阅会阻塞 UI；延迟测试并发无限制
3. **数据完整性**：缺少配置 schema 验证，无 Clash Meta/Premium 兼容性检查
4. **架构建议**：优先客户端加固，保持"本地优先"理念

### Gemini 前端分析要点
1. **布局问题**：单栏布局浪费屏幕空间，编辑-预览需频繁滚动
2. **认知负荷**：表单项繁多，缺乏分步引导，新手易困惑
3. **场景缺失**：无暗色模式，移动端适配差
4. **性能优化**：大节点列表需虚拟滚动

---

## 技术方案

### 第一优先级：核心体验优化

#### 1. 双栏响应式布局重构
**问题**：当前单栏布局导致频繁滚动，编辑-预览体验割裂

**方案**：
- 桌面端（≥1200px）：左侧配置区 + 右侧实时预览区（Sticky）
- 平板端（768-1199px）：单栏 + 底部固定预览按钮
- 移动端（<768px）：单栏 + Drawer 预览

**伪代码**：
```vue
<!-- App.vue 布局重构 -->
<template>
  <div class="app-container" :class="{ 'dual-column': isDesktop }">
    <aside class="config-panel">
      <ConfigForm />
      <NodeList />
      <RuleEditor />
    </aside>
    <main class="preview-panel" v-if="isDesktop">
      <YamlPreview :sticky="true" />
    </main>
    <el-drawer v-else v-model="showPreview">
      <YamlPreview />
    </el-drawer>
  </div>
</template>
```

#### 2. 暗色模式支持
**问题**：极客用户群体常在夜间使用，缺乏暗色模式体验差

**方案**：
- 使用 VueUse 的 `useDark` + Element Plus 暗色主题
- 审计并替换硬编码颜色值为 CSS 变量
- 添加主题切换按钮到页面头部

**伪代码**：
```javascript
// composables/useTheme.js
import { useDark, useToggle } from '@vueuse/core'

export const useTheme = () => {
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: ''
  })
  const toggleDark = useToggle(isDark)
  return { isDark, toggleDark }
}
```

### 第二优先级：性能与安全加固

#### 3. 节点列表虚拟滚动
**问题**：大量节点（100+）时渲染卡顿

**方案**：
- 使用 Element Plus 的 `<el-table-v2>` 或 `vue-virtual-scroller`
- 实现懒加载和增量渲染

**伪代码**：
```vue
<!-- NodeList.vue 虚拟滚动 -->
<el-table-v2
  :data="displayNodes"
  :columns="columns"
  :width="tableWidth"
  :height="tableHeight"
  :row-height="48"
  :estimated-row-height="48"
/>
```

#### 4. 延迟测试并发控制
**问题**：同时测试大量节点会造成网络拥塞和 UI 卡顿

**方案**：
- 限制并发数（建议 5-10 个）
- 添加进度指示器
- 防止自动刷新重叠

**伪代码**：
```javascript
// useNodes.js 并发控制
const testAllNodesLatency = async () => {
  const CONCURRENCY = 5
  const queue = [...nodes.value]
  const results = []

  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(node => testNodeLatency(node))
    )
    results.push(...batchResults)
    // 更新进度
    progress.value = (results.length / nodes.value.length) * 100
  }
}
```

#### 5. 代理服务器安全加固
**问题**：当前实现存在 SSRF 风险，配置 ID 可预测

**方案**：
- 绑定到 `127.0.0.1` 而非 `0.0.0.0`
- 使用 crypto.randomUUID() 生成配置 ID
- 添加可选的 token 验证
- 限制 `/fetch` 和 `/ping` 的目标范围

**伪代码**：
```javascript
// proxy-server.js 安全加固
import crypto from 'crypto'

const generateId = () => crypto.randomUUID()

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Listening on http://127.0.0.1:${PORT}`)
})

// 可选：URL 白名单
const ALLOWED_HOSTS = ['example.com', 'subscription.example.com']
const isAllowedUrl = (url) => {
  const { hostname } = new URL(url)
  return ALLOWED_HOSTS.some(h => hostname.endsWith(h))
}
```

### 第三优先级：功能增强

#### 6. 配置版本历史
**问题**：误操作后无法恢复之前的配置

**方案**：
- 每次生成配置时保存快照到 IndexedDB
- 提供历史列表和 diff 对比
- 支持一键回滚

**伪代码**：
```javascript
// composables/useConfigHistory.js
const CONFIG_HISTORY_KEY = 'clashrelay_config_history'
const MAX_HISTORY = 20

export const useConfigHistory = () => {
  const history = ref([])

  const saveSnapshot = (config, name) => {
    const snapshot = {
      id: Date.now(),
      name,
      config,
      timestamp: new Date().toISOString()
    }
    history.value.unshift(snapshot)
    if (history.value.length > MAX_HISTORY) {
      history.value.pop()
    }
    persistHistory()
  }

  const restoreSnapshot = (id) => {
    const snapshot = history.value.find(s => s.id === id)
    if (snapshot) return snapshot.config
  }

  return { history, saveSnapshot, restoreSnapshot }
}
```

#### 7. 配置 Schema 验证
**问题**：生成的配置可能不兼容特定 Clash 版本

**方案**：
- 添加 Clash Meta / Premium 版本选择
- 实现规则语法校验
- 检测重复规则和冲突

**伪代码**：
```javascript
// utils/validators.js
export const validateClashConfig = (config, version = 'meta') => {
  const errors = []
  const warnings = []

  // 检查必需字段
  if (!config.proxies?.length) {
    errors.push('配置中没有代理节点')
  }

  // 检查规则语法
  config.rules?.forEach((rule, index) => {
    if (!isValidRule(rule, version)) {
      errors.push(`规则 #${index + 1} 语法错误: ${rule}`)
    }
  })

  // 检查重复规则
  const duplicates = findDuplicateRules(config.rules)
  if (duplicates.length) {
    warnings.push(`发现 ${duplicates.length} 条重复规则`)
  }

  return { valid: errors.length === 0, errors, warnings }
}
```

#### 8. 批量节点操作
**问题**：大量节点时逐个选择效率低

**方案**：
- 按地区/类型批量选择
- 自定义标签分组
- 批量导出子集

**伪代码**：
```javascript
// useNodes.js 批量操作
const selectByRegion = (region) => {
  const regionNodes = nodes.value.filter(n => getNodeRegion(n.name) === region)
  regionNodes.forEach(n => {
    if (!form.dialerProxyGroup.includes(n.name)) {
      form.dialerProxyGroup.push(n.name)
    }
  })
}

const selectByType = (type) => {
  const typeNodes = nodes.value.filter(n => n.type === type)
  // ...
}

const addTag = (nodeName, tag) => {
  // 自定义标签存储到 localStorage
}
```

#### 9. 新手引导向导
**问题**：功能复杂，新用户不知从何开始

**方案**：
- 首次使用时显示分步向导
- 高亮关键操作区域
- 提供示例配置快速开始

**伪代码**：
```vue
<!-- components/OnboardingWizard.vue -->
<template>
  <el-dialog v-model="showWizard" title="欢迎使用 RelayBox">
    <el-steps :active="step" finish-status="success">
      <el-step title="导入订阅" />
      <el-step title="选择节点" />
      <el-step title="配置规则" />
      <el-step title="生成配置" />
    </el-steps>

    <div class="step-content">
      <template v-if="step === 0">
        <p>首先，输入您的机场订阅地址...</p>
      </template>
      <!-- ... -->
    </div>
  </el-dialog>
</template>
```

#### 10. 键盘快捷键
**问题**：高级用户缺乏快捷操作方式

**方案**：
- `Ctrl/Cmd + G`：生成配置
- `Ctrl/Cmd + S`：保存模板
- `Ctrl/Cmd + D`：下载配置
- `Ctrl/Cmd + K`：快速搜索节点

**伪代码**：
```javascript
// composables/useKeyboardShortcuts.js
import { onKeyStroke } from '@vueuse/core'

export const useKeyboardShortcuts = ({ generateYaml, downloadYaml, saveTemplate }) => {
  onKeyStroke(['g'], (e) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      generateYaml()
    }
  })
  // ...
}
```

---

## 实施步骤

| 步骤 | 任务 | 预期产物 |
|------|------|----------|
| 1 | 双栏响应式布局重构 | 重构后的 App.vue + 新增 useResponsive.js |
| 2 | 暗色模式支持 | useTheme.js + 更新 styles.css |
| 3 | 节点列表虚拟滚动 | 更新 NodeList.vue |
| 4 | 延迟测试并发控制 | 更新 useNodes.js |
| 5 | 代理服务器安全加固 | 更新 proxy-server.js |
| 6 | 配置版本历史 | 新增 useConfigHistory.js |
| 7 | 配置 Schema 验证 | 更新 validators.js |
| 8 | 批量节点操作 | 更新 useNodes.js + NodeList.vue |
| 9 | 新手引导向导 | 新增 OnboardingWizard.vue |
| 10 | 键盘快捷键 | 新增 useKeyboardShortcuts.js |

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/App.vue | 修改 | 重构为双栏响应式布局 |
| src/styles.css | 修改 | 添加暗色模式 CSS 变量 |
| src/components/NodeList.vue | 修改 | 实现虚拟滚动 |
| src/composables/useNodes.js | 修改 | 添加并发控制和批量操作 |
| src/composables/useTheme.js | 新增 | 主题切换逻辑 |
| src/composables/useConfigHistory.js | 新增 | 配置版本历史 |
| src/composables/useKeyboardShortcuts.js | 新增 | 键盘快捷键 |
| src/components/OnboardingWizard.vue | 新增 | 新手引导组件 |
| src/utils/validators.js | 修改 | 添加配置 schema 验证 |
| proxy-server.js | 修改 | 安全加固 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 布局重构影响现有功能 | 分阶段实施，先完成布局框架再迁移组件 |
| 虚拟滚动兼容性问题 | 使用成熟的 Element Plus TableV2 组件 |
| 暗色模式遗漏样式 | 全面审计 CSS，使用 CSS 变量替换硬编码颜色 |
| 安全加固影响现有用户 | 提供配置选项，默认安全但可放宽 |
| IndexedDB 存储限制 | 限制历史记录数量，提供清理功能 |

---

## SESSION_ID（供 /ccg:execute 使用）
- CODEX_SESSION: 019c0c93-2bcb-74d0-830c-1e07883b83a5
- GEMINI_SESSION: 813118b8-c874-4416-9eb2-9cb7f59092e1
