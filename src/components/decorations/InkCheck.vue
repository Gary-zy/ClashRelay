<template>
  <svg 
    viewBox="0 0 24 24" 
    width="1em" 
    height="1em" 
    class="ink-check"
    :style="{ color: color }"
  >
    <defs>
      <filter id="brush-check">
        <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.5" />
      </filter>
    </defs>
    <!-- 毛笔风格的对勾 -->
    <path 
      d="M5,12 C5,12 8,14 9,17 C9,17 14,8 19,4" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2.5" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      filter="url(#brush-check)"
      class="check-path"
    />
  </svg>
</template>

<script setup>
defineProps({
  color: {
    type: String,
    default: "#b92b27" // 默认朱砂红
  }
});
</script>

<style scoped>
.check-path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: draw-check 0.4s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

@keyframes draw-check {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
