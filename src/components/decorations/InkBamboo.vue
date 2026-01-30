<template>
  <svg 
    class="ink-bamboo" 
    viewBox="0 0 200 400" 
    xmlns="http://www.w3.org/2000/svg"
    :style="customStyle"
  >
    <defs>
      <linearGradient id="bambooGrad" x1="0%" y1="0%" x2="100%" y2="10%">
        <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:0.9" />
        <stop offset="100%" style="stop-color:#4a6572;stop-opacity:0.7" />
      </linearGradient>
    </defs>
    
    <g transform="translate(100, 400) rotate(-10)" opacity="0.6">
      <!-- 主干 -->
      <path d="M0,0 Q10,-100 -5,-200 T10,-350" fill="none" stroke="url(#bambooGrad)" stroke-width="4" stroke-linecap="round" />
      
      <!-- 节 -->
      <path d="M-2,-100 L8,-102 M-6,-200 L4,-203 M0,-300 L12,-302" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" />
      
      <!-- 叶子组 1 -->
      <g transform="translate(-5, -150) rotate(-45)">
        <path d="M0,0 Q20,5 40,-10 Q20,-5 0,0" fill="url(#bambooGrad)" />
        <path d="M0,0 Q25,8 45,5 Q25,0 0,0" fill="url(#bambooGrad)" transform="rotate(20)" />
      </g>
      
      <!-- 叶子组 2 -->
      <g transform="translate(10, -250) rotate(15)">
        <path d="M0,0 Q25,-5 50,10 Q25,5 0,0" fill="url(#bambooGrad)" />
        <path d="M0,0 Q30,-2 55,-5 Q25,2 0,0" fill="url(#bambooGrad)" transform="rotate(-30)" />
        <path d="M0,0 Q15,5 30,0 Q15,-2 0,0" fill="url(#bambooGrad)" transform="rotate(-50)" />
      </g>
      
      <!-- 叶子组 3 -->
      <g transform="translate(0, -320) rotate(-60)">
         <path d="M0,0 Q20,2 40,-5 Q20,-2 0,0" fill="url(#bambooGrad)" />
      </g>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  position: {
    type: String,
    default: 'fixed' // fixed or absolute
  },
  right: {
    type: [Number, String],
    default: -20
  },
  bottom: {
    type: [Number, String],
    default: 0
  },
  opacity: {
    type: Number,
    default: 0.8
  }
})

const customStyle = computed(() => ({
  position: props.position,
  right: props.right + 'px',
  bottom: props.bottom + 'px',
  opacity: props.opacity,
  pointerEvents: 'none',
  zIndex: 0
}))
</script>

<style scoped>
.ink-bamboo {
  width: 200px;
  height: 400px;
  filter: blur(0.5px);
}
</style>
