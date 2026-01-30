<template>
  <svg 
    class="ink-seal" 
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg"
    :style="{ width: size + 'px', height: size + 'px', transform: 'rotate(' + rotate + 'deg)' }"
  >
    <defs>
      <!-- 印泥纹理滤镜：创建腐蚀/斑驳效果 -->
      <filter id="seal-texture">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 -1" in="noise" result="coloredNoise" />
        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
        <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
      </filter>
      
      <!-- 边缘粗糙滤镜 -->
      <filter id="rough-edges">
        <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
      </filter>
    </defs>
    
    <g filter="url(#rough-edges)" opacity="0.9">
      <!-- 边框：外圆角矩形，模拟刻刀痕迹 -->
      <path 
        d="M10,12 L88,10 L90,88 L12,90 Z M14,14 L14,86 L86,86 L86,14 Z" 
        fill="#b92b27" 
        fill-rule="evenodd"
        class="seal-border"
      />
      
      <!-- 文字：张扬出品 -->
      <g fill="#b92b27" font-family="'Noto Serif SC', 'STSong', 'SimSun', serif" font-weight="900" font-size="28" style="pointer-events: none;">
        <!-- 右列：张扬 -->
        <text x="70" y="44" text-anchor="middle">张</text>
        <text x="70" y="78" text-anchor="middle">扬</text>
        
        <!-- 左列：出品 -->
        <text x="30" y="44" text-anchor="middle">出</text>
        <text x="30" y="78" text-anchor="middle">品</text>
      </g>
      
      <!-- 随机噪点/印泥残渣 -->
      <circle cx="20" cy="20" r="1.5" fill="#b92b27" opacity="0.6" />
      <circle cx="80" cy="80" r="2" fill="#b92b27" opacity="0.5" />
      <circle cx="25" cy="75" r="1.2" fill="#b92b27" opacity="0.7" />
      <circle cx="75" cy="25" r="1.5" fill="#b92b27" opacity="0.6" />
      <path d="M50,50 L52,52 L50,54 L48,52 Z" fill="#b92b27" opacity="0.4" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 64
  },
  rotate: {
    type: [Number, String],
    default: -8
  }
})
</script>

<style scoped>
.ink-seal {
  display: inline-block;
  mix-blend-mode: multiply; /* 正片叠底，模拟真实印在纸上的效果 */
  filter: contrast(1.1) brightness(0.95) drop-shadow(1px 1px 1px rgba(185, 43, 39, 0.2));
}

.seal-border {
  opacity: 0.95;
}
</style>
