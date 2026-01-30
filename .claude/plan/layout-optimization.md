# 实施计划：页面布局优化 - 垂直单列布局

## 任务类型
- [x] 前端 (→ Gemini)

---

## 技术方案

### 核心改动：从 2x2 网格改为垂直单列布局

**当前布局问题**：
1. 两列布局在宽屏下内容分散，不符合线性配置流程
2. 节点选择区域拥挤，功能堆叠
3. 已选节点展示不直观
4. 用户同时看到所有面板，认知负担重

**新布局方案**：
```
[Header: 标题 & 帮助按钮]

┌─────────────────────────────────────────────────┐
│  1. 订阅获取                                      │
│  [订阅地址输入] [获取节点按钮]                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  2. 选择跳板节点                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ 已选: [节点A ×] [节点B ×] [节点C ×]  [清空]  ││ ← 选择托盘
│  └─────────────────────────────────────────────┘│
│  [搜索] [分组标签] [排序] [测速]                   │
│  ┌─────────────────────────────────────────────┐│
│  │ 节点列表（全宽表格）                          ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  3. 落地节点配置                                  │
│  [节点链接解析] [Server/Port/User/Pass]           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  4. 规则与生成                                    │
│  [规则模板] [自定义规则] [生成配置]                │
│  ┌─────────────────────────────────────────────┐│
│  │ YAML 预览                                    ││
│  └─────────────────────────────────────────────┘│
│  [复制] [下载]                                    │
└─────────────────────────────────────────────────┘
```

---

## 实施步骤

### Step 1: 修改 App.vue 布局结构

**改动**：
- 移除 `.grid` 两列布局
- 改为 `.layout-stack` 垂直堆叠
- 重新排列组件顺序
- 拆分 ConfigForm 为订阅获取和落地节点两部分

```vue
<!-- 新布局结构 -->
<div class="layout-stack">
  <!-- Step 1: 订阅获取 -->
  <section class="step-section">
    <div class="step-header">
      <span class="step-number">1</span>
      <span class="step-title">获取订阅节点</span>
    </div>
    <SubscriptionForm ... />
  </section>

  <!-- Step 2: 选择跳板节点 -->
  <section class="step-section">
    <div class="step-header">
      <span class="step-number">2</span>
      <span class="step-title">选择跳板节点</span>
    </div>
    <NodeSelector ... />
  </section>

  <!-- Step 3: 落地节点配置 -->
  <section class="step-section">
    <div class="step-header">
      <span class="step-number">3</span>
      <span class="step-title">配置落地节点</span>
    </div>
    <LandingNodeForm ... />
  </section>

  <!-- Step 4: 规则与生成 -->
  <section class="step-section">
    <div class="step-header">
      <span class="step-number">4</span>
      <span class="step-title">生成配置</span>
    </div>
    <ConfigGenerator ... />
  </section>
</div>
```

**预期产物**：修改 `src/App.vue`

---

### Step 2: 新增选择托盘组件

**功能**：
- 显示已选节点为可点击的标签
- 点击标签可取消选择
- 清空全部按钮
- 显示已选数量

```vue
<!-- SelectionTray.vue -->
<template>
  <div class="selection-tray" v-if="selectedNodes.length > 0">
    <div class="tray-label">已选 {{ selectedNodes.length }} 个节点：</div>
    <div class="tray-tags">
      <span
        v-for="node in selectedNodes"
        :key="node.name"
        class="node-tag"
        @click="$emit('remove', node.name)"
      >
        {{ node.name }}
        <span class="tag-close">×</span>
      </span>
    </div>
    <button class="tray-clear" @click="$emit('clear')">清空</button>
  </div>
</template>
```

**预期产物**：新增 `src/components/SelectionTray.vue`

---

### Step 3: 重构 NodeList 为 NodeSelector

**改动**：
- 移除顶部的下拉选择器（改用选择托盘）
- 简化工具栏为单行
- 表格全宽显示
- 点击行即可选择/取消
- 优化已选状态的视觉反馈

```vue
<!-- NodeSelector.vue 结构 -->
<div class="node-selector">
  <!-- 选择托盘 -->
  <SelectionTray
    :selected-nodes="selectedNodes"
    @remove="removeNode"
    @clear="clearSelection"
  />

  <!-- 工具栏 -->
  <div class="selector-toolbar">
    <el-input v-model="search" placeholder="搜索节点..." />
    <el-button-group>
      <el-button @click="selectAll">全选</el-button>
      <el-button @click="invertSelection">反选</el-button>
    </el-button-group>
    <el-button @click="testLatency">测速</el-button>
  </div>

  <!-- 分组标签 -->
  <el-tabs v-model="activeGroup" type="card">
    <el-tab-pane label="全部" name="all" />
    <el-tab-pane v-for="g in groups" :label="g.label" :name="g.key" />
  </el-tabs>

  <!-- 节点表格 -->
  <el-table :data="displayNodes" @row-click="toggleNode">
    <el-table-column type="selection" />
    <el-table-column prop="name" label="节点名称" />
    <el-table-column prop="type" label="类型" width="80" />
    <el-table-column label="延迟" width="100">
      <template #default="{ row }">
        <span :class="getLatencyClass(row.latency)">
          {{ formatLatency(row.latency) }}
        </span>
      </template>
    </el-table-column>
  </el-table>
</div>
```

**预期产物**：
- 新增 `src/components/NodeSelector.vue`
- 新增 `src/components/SelectionTray.vue`

---

### Step 4: 拆分 ConfigForm

将当前的 ConfigForm 拆分为两个独立组件：

1. **SubscriptionForm** - 订阅获取
   - 订阅地址输入
   - 获取节点按钮
   - 高级选项（折叠）

2. **LandingNodeForm** - 落地节点配置
   - 节点链接解析
   - Server/Port/User/Pass 输入
   - 节点类型选择

**预期产物**：
- 新增 `src/components/SubscriptionForm.vue`
- 新增 `src/components/LandingNodeForm.vue`

---

### Step 5: 合并 RuleEditor 和 YamlPreview

将规则编辑和配置预览合并为一个组件：

```vue
<!-- ConfigGenerator.vue -->
<div class="config-generator">
  <!-- 策略组配置（仅多选时显示） -->
  <div v-if="selectedNodes.length > 1" class="strategy-config">
    <el-radio-group v-model="strategyType">
      <el-radio value="url-test">自动选择</el-radio>
      <el-radio value="select">手动选择</el-radio>
      <el-radio value="fallback">故障转移</el-radio>
    </el-radio-group>
  </div>

  <!-- 规则模板 -->
  <div class="rule-templates">
    <span v-for="t in templates" class="template-tag" @click="applyTemplate(t)">
      {{ t.name }}
    </span>
  </div>

  <!-- 生成按钮 -->
  <el-button type="primary" size="large" @click="generate">
    生成配置
  </el-button>

  <!-- YAML 预览 -->
  <div v-if="yamlText" class="yaml-preview">
    <pre>{{ yamlText }}</pre>
    <div class="preview-actions">
      <el-button @click="copy">复制</el-button>
      <el-button @click="download">下载</el-button>
    </div>
  </div>
</div>
```

**预期产物**：新增 `src/components/ConfigGenerator.vue`

---

### Step 6: 更新样式

```css
/* styles.css 新增 */

/* 垂直布局容器 */
.layout-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

/* 步骤区块 */
.step-section {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--line-200);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(26, 26, 26, 0.06);
}

/* 步骤标题 */
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-200);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-600);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.step-title {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  color: var(--accent-600);
}

/* 选择托盘 */
.selection-tray {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(31, 42, 68, 0.04);
  border: 1px dashed var(--line-200);
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tray-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.node-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--accent-600);
  color: white;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-tag:hover {
  background: var(--accent-500);
}

.tag-close {
  opacity: 0.7;
  margin-left: 2px;
}

/* 移除旧的 .grid 样式或保留用于其他用途 */
```

**预期产物**：修改 `src/styles.css`

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/App.vue` | 修改 | 改为垂直布局，重新排列组件 |
| `src/components/SelectionTray.vue` | 新增 | 已选节点托盘组件 |
| `src/components/NodeSelector.vue` | 新增 | 重构后的节点选择器 |
| `src/components/SubscriptionForm.vue` | 新增 | 订阅获取表单 |
| `src/components/LandingNodeForm.vue` | 新增 | 落地节点配置表单 |
| `src/components/ConfigGenerator.vue` | 新增 | 规则与生成合并组件 |
| `src/styles.css` | 修改 | 新增垂直布局样式 |
| `src/components/NodeList.vue` | 删除 | 被 NodeSelector 替代 |
| `src/components/ConfigForm.vue` | 删除 | 被拆分为两个组件 |
| `src/components/RuleEditor.vue` | 删除 | 合并到 ConfigGenerator |
| `src/components/YamlPreview.vue` | 删除 | 合并到 ConfigGenerator |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 组件拆分导致状态管理复杂 | 保持 App.vue 作为状态中心，子组件通过 props/emit 通信 |
| 页面过长影响体验 | 节点表格固定高度 500px，内部滚动 |
| 移动端适配问题 | 使用 flex-wrap 和媒体查询确保响应式 |

---

## SESSION_ID（供 /ccg:execute 使用）

- GEMINI_SESSION: `d8ee035e-6092-4212-938a-c562f9efbb6f`

---

## 验收标准

1. 页面呈现垂直单列布局，步骤 1-2-3-4 清晰可见
2. 已选节点以标签形式展示在托盘中，可点击取消
3. 节点表格全宽显示，信息不再拥挤
4. 保持水墨风格视觉一致性
5. 移动端正常显示
