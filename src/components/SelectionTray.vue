<template>
  <div class="selection-tray">
    <template v-if="selectedNodes.length > 0">
      <div class="tray-info">
        <span class="tray-count">已选 {{ selectedNodes.length }} 个节点</span>
      </div>
      <div class="tray-tags-wrapper">
        <div class="tray-tags">
          <button
            v-for="node in selectedNodes"
            :key="node.name"
            type="button"
            class="node-tag"
            @click="$emit('remove', node.name)"
            :title="node.name"
            :aria-label="`移除跳板节点 ${node.name}`"
          >
            <span class="tag-text">{{ node.name }}</span>
            <span class="tag-close" aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
      <el-button size="small" text @click="$emit('clear')" class="tray-clear">
        清空
      </el-button>
    </template>
    <div v-else class="tray-placeholder">
      <el-icon class="placeholder-icon"><Bottom /></el-icon>
      <span class="placeholder-text">请从下方列表选择节点作为跳板</span>
    </div>
  </div>
</template>

<script setup>
import { Bottom } from "@element-plus/icons-vue";

defineProps({
  selectedNodes: {
    type: Array,
    required: true,
  },
});

defineEmits(["remove", "clear"]);
</script>

<style scoped>
.selection-tray {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(253, 251, 247, 0.68);
  border: 1px dashed var(--line-200);
  border-radius: 10px;
  margin-bottom: 16px;
  min-height: 52px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.selection-tray:hover {
  background: rgba(253, 251, 247, 0.9);
  border-color: var(--line-300);
  box-shadow: inset 0 0 0 1px rgba(31, 42, 68, 0.04);
}

.tray-info {
  flex-shrink: 0;
}

.tray-count {
  font-family: "Noto Serif SC", serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-800);
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.tray-tags-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to right, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
}

.tray-tags {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  padding-right: 24px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  align-items: center;
}

.tray-tags::-webkit-scrollbar {
  display: none;
}

/* 核心：不规则墨块标签 */
.node-tag {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(31, 42, 68, 0.08);
  color: var(--ink-900);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  border: 1px solid rgba(31, 42, 68, 0.15);
  font-family: "Noto Serif SC", serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
  max-width: 160px;
  position: relative;
  overflow: visible;
  animation: ink-settle 0.2s ease-out backwards;
}

.node-tag:hover {
  background: rgba(31, 42, 68, 0.12);
  border-color: var(--ink-400);
  box-shadow: inset 0 0 0 1px rgba(31, 42, 68, 0.05);
}

.node-tag:focus-visible {
  outline: 2px solid rgba(185, 43, 39, 0.45);
  outline-offset: 2px;
}

.tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  top: 1px; /* 视觉修正衬线体垂直对齐 */
}

/* 朱砂红删除印 */
.tag-close {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-400);
  font-size: 14px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
  margin-right: -4px;
}

.node-tag:hover .tag-close {
  background: var(--vermillion-500);
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(185, 43, 39, 0.3);
}

.node-tag:active {
  background: rgba(185, 43, 39, 0.08);
}

.tray-clear {
  flex-shrink: 0;
  color: var(--ink-600);
  font-family: "Noto Serif SC", serif;
}

.tray-clear:hover {
  color: var(--vermillion-500);
  background: rgba(185, 43, 39, 0.08);
}

.tray-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-400);
  font-size: 13px;
  width: 100%;
  font-family: "Noto Serif SC", serif;
  font-style: italic;
}

.placeholder-icon {
  font-size: 16px;
  color: var(--accent-400);
}

@keyframes ink-settle {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

</style>
