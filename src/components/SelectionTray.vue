<template>
  <div v-if="selectedNodes.length > 0" class="selection-tray">
    <div class="tray-info">
      <span class="tray-count">已选 {{ selectedNodes.length }} 个节点</span>
    </div>
    <div class="tray-tags-wrapper">
      <div class="tray-tags">
        <span
          v-for="node in selectedNodes"
          :key="node.name"
          class="node-tag"
          @click="$emit('remove', node.name)"
          :title="node.name"
        >
          <span class="tag-text">{{ node.name }}</span>
          <span class="tag-close">&times;</span>
        </span>
      </div>
    </div>
    <el-button size="small" text @click="$emit('clear')" class="tray-clear">
      清空
    </el-button>
  </div>
</template>

<script setup>
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
  background: rgba(31, 42, 68, 0.03);
  border: 1px dashed var(--line-200);
  border-radius: 10px;
  margin-bottom: 16px;
  height: 48px; /* 固定高度，防止抖动 */
}

.tray-info {
  flex-shrink: 0;
}

.tray-count {
  font-size: 13px;
  color: var(--ink-700);
  white-space: nowrap;
}

.tray-tags-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

/* 渐变遮罩提示可滚动 */
.tray-tags-wrapper::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(to right, transparent, rgba(253, 251, 247, 0.9));
  pointer-events: none;
}

.tray-tags {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-right: 24px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.tray-tags::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
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
  transition: all 0.15s;
  flex-shrink: 0;
  max-width: 150px;
}

.node-tag:hover {
  background: var(--accent-500);
}

.tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-close {
  opacity: 0.7;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.tray-clear {
  flex-shrink: 0;
  color: var(--ink-700);
}

.tray-clear:hover {
  color: #ef4444;
}
</style>
