# 配置对比功能开发文档

## 功能概述
新旧配置 diff 对比，方便用户查看变更内容。

## 技术方案

### 1. 依赖引入
```bash
npm install diff
```

### 2. 数据结构

```javascript
const previousYaml = ref("")      // 上一次生成的配置
const showDiffDialog = ref(false) // 对比对话框显示状态
const diffResult = ref([])        // diff 结果
```

### 3. UI 变更

#### [MODIFY] App.vue - 按钮区域
```vue
<el-button @click="showConfigDiff" :disabled="!yamlText || !previousYaml">
  对比变更
</el-button>

<!-- 对比对话框 -->
<el-dialog v-model="showDiffDialog" title="配置变更对比" width="80%">
  <div class="diff-container">
    <div v-for="(part, index) in diffResult" :key="index"
         :class="{ 'diff-added': part.added, 'diff-removed': part.removed }">
      {{ part.value }}
    </div>
  </div>
</el-dialog>
```

### 4. 核心逻辑

#### [MODIFY] App.vue - Script 部分
```javascript
import { diffLines } from 'diff';

// 生成配置时保存上一版本
const generateYaml = () => {
  previousYaml.value = yamlText.value; // 保存当前版本
  // ... 原有生成逻辑
};

// 显示 diff 对比
const showConfigDiff = () => {
  if (!previousYaml.value || !yamlText.value) return;
  diffResult.value = diffLines(previousYaml.value, yamlText.value);
  showDiffDialog.value = true;
};
```

### 5. 样式

```css
.diff-container {
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 500px;
  overflow-y: auto;
}
.diff-added {
  background-color: #e6ffec;
  color: #1a7f37;
}
.diff-removed {
  background-color: #ffebe9;
  color: #cf222e;
  text-decoration: line-through;
}
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | MODIFY | 添加 diff 依赖 |
| `src/App.vue` | MODIFY | UI、逻辑、样式 |

## 工作量估算
- 预计开发时间：1-2 小时
- 主要工作在 UI 展示

## 测试用例
1. 首次生成配置 → 对比按钮禁用
2. 第二次生成配置 → 可对比
3. 验证新增/删除/修改行正确高亮
