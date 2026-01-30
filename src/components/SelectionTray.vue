<template>
  <div class="selection-tray">
    <template v-if="selectedNodes.length > 0">
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
  background: rgba(253, 251, 247, 0.6); /* 更淡的背景，突出标签 */
  border: 1px dashed var(--line-200);
  border-radius: 10px;
  margin-bottom: 16px;
  height: 52px; /* 稍微增加高度以容纳不规则标签 */
  transition: all 0.3s ease;
}

.selection-tray:hover {
  background: rgba(253, 251, 247, 0.9);
  border-color: var(--line-300);
  box-shadow: 0 4px 12px rgba(31, 42, 68, 0.05); /* 悬浮时的微微浮起感 */
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
  mask-image: linear-gradient(to right, black 90%, transparent 100%); /* 边缘柔和消失 */
  -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
}

.tray-tags {
  display: flex;
  gap: 8px; /* 增加间距 */
  overflow-x: auto;
  padding: 4px 0; /* 给上下阴影留空间 */
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  /* 淡墨晕染背景 */
  background: rgba(31, 42, 68, 0.08); /* 淡墨 */
  color: var(--ink-900); /* 浓墨文字 */
  
  /* 不规则轮廓 - 模拟这一笔画出来的感觉 */
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  border: 1px solid rgba(31, 42, 68, 0.15); /* 极细的焦墨边缘 */
  
  font-family: "Noto Serif SC", serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  flex-shrink: 0;
  max-width: 160px;
  position: relative;
  overflow: visible; /* 允许朱砂印稍微溢出 */

  /* 入场动画 - 墨滴扩散 */
  animation: ink-spread 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
}

/* 悬停效果 - 墨色加深 */
.node-tag:hover {
  background: rgba(31, 42, 68, 0.12);
  border-color: var(--ink-400);
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 8px rgba(31, 42, 68, 0.08);
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
  background: transparent; /* 默认透明 */
  color: var(--ink-400);
  font-size: 14px;
  transition: all 0.2s ease;
  margin-right: -4px;
}

/* 悬停时显示朱砂印 */
.node-tag:hover .tag-close {
  background: #b92b27; /* 朱砂红 */
  color: rgba(255, 255, 255, 0.9);
  transform: rotate(90deg); /* 旋转出现 */
  box-shadow: 0 2px 4px rgba(185, 43, 39, 0.3);
}

.node-tag:active {
  transform: scale(0.96);
}

.tray-clear {
  flex-shrink: 0;
  color: var(--ink-600);
  font-family: "Noto Serif SC", serif;
}

.tray-clear:hover {
  color: #b92b27; /* 清空也用朱砂红提示 */
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
  font-style: italic; /* 斜体增加书卷气 */
}

.placeholder-icon {
  font-size: 16px;
  animation: bounce 2s infinite;
  color: var(--accent-400);
}

@keyframes ink-spread {
  0% { 
    opacity: 0;
    transform: scale(0.3);
    border-radius: 50%; /* 从一个圆点开始 */
  }
  100% { 
    opacity: 1;
    transform: scale(1);
    /* 结束时变成不规则形状，由CSS类定义 */
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-3px);}
  60% {transform: translateY(-1.5px);}
}

</style>
