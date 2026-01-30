<template>
  <div v-if="globalParams.renameEnabled" class="section-card rename-panel">
    <div class="panel-header">
      <div class="section-title" style="margin: 0;">
        节点名称清洗
      </div>
      <el-switch
        v-model="globalParams.renameEnabled"
        style="--el-switch-on-color: var(--accent-600);"
      />
    </div>
    <div class="rename-form">
      <div class="rename-item">
        <span class="param-label">正则匹配</span>
        <el-input
          v-model="globalParams.renamePattern"
          placeholder="例: \s*\[.*?\]|\s*官网.*"
          clearable
          size="small"
        />
      </div>
      <div class="rename-item">
        <span class="param-label">替换为</span>
        <el-input
          v-model="globalParams.renameReplace"
          placeholder="留空则删除匹配内容"
          clearable
          size="small"
        />
      </div>
      <el-button size="small" @click="$emit('preview-rename')">
        预览
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { useNodeParams } from "../composables/useNodeParams.js";

defineEmits(["preview-rename"]);

const { globalParams } = useNodeParams();
</script>

<style scoped>
.rename-panel {
  margin-bottom: 18px;
  padding: 14px 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rename-form {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rename-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-label {
  font-size: 13px;
  color: var(--ink-700);
  white-space: nowrap;
}

.rename-item .el-input {
  width: 200px;
}

@media (max-width: 768px) {
  .rename-form {
    flex-direction: column;
    align-items: stretch;
  }

  .rename-item {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .rename-item .el-input {
    width: 100%;
  }
}
</style>
