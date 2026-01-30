<template>
  <svg 
    class="ink-brush-line" 
    viewBox="0 0 300 20" 
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="inkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#333;stop-opacity:0.8" />
        <stop offset="50%" style="stop-color:#000;stop-opacity:0.9" />
        <stop offset="90%" style="stop-color:#444;stop-opacity:0.6" />
        <stop offset="100%" style="stop-color:#fff;stop-opacity:0" />
      </linearGradient>
      <filter id="displacement">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
      </filter>
    </defs>
    
    <path 
      d="M5,10 Q150,15 290,8 C260,12 100,14 10,12 Z" 
      fill="url(#inkGradient)" 
      filter="url(#displacement)"
      opacity="0.8"
    />
  </svg>
</template>

<style scoped>
.ink-brush-line {
  width: 100%;
  height: 20px;
  overflow: visible;
  pointer-events: none;
}
</style>
