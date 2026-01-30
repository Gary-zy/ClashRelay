<template>
  <div class="ink-loading-overlay">
    <div class="ink-loader">
      <!-- 滤镜定义 -->
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <filter id="gooey-ink">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="gooey" />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
      
      <!-- 墨团容器 -->
      <div class="blobs">
        <div class="blob-center"></div>
        <div class="blob moving-blob"></div>
        <div class="blob moving-blob-2"></div>
        <div class="blob moving-blob-3"></div>
      </div>
      
      <!-- 正在获取文字 -->
      <div class="loading-text">
        <span class="char">正</span>
        <span class="char">在</span>
        <span class="char">获</span>
        <span class="char">取</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ink-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(253, 251, 247, 0.92); /* 背景更实一点，突出墨色 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ink-loader {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.blobs {
  width: 200px;
  height: 200px;
  position: relative;
  /* 关键：应用 Gooey 滤镜 */
  filter: url(#gooey-ink);
}

.blob {
  position: absolute;
  background: #1f2a44; /* 深墨色 */
  border-radius: 50%;
  opacity: 0.9;
}

/* 中心大墨团 */
.blob-center {
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  transform: translate(-50%, -50%);
  /* 模拟呼吸 */
  animation: pulse-ink 2s ease-in-out infinite;
}

/* 环绕游动的墨点 */
.moving-blob {
  top: 50%;
  left: 50%;
  width: 45px;
  height: 45px;
  background: #2d3a5f; /* 稍浅的墨色 */
  animation: orbit-1 3s ease-in-out infinite;
}

.moving-blob-2 {
  top: 50%;
  left: 50%;
  width: 35px;
  height: 35px;
  background: #1f2a44;
  animation: orbit-2 4s ease-in-out infinite reverse;
}

.moving-blob-3 {
  top: 50%;
  left: 50%;
  width: 25px;
  height: 25px;
  background: #53607d;
  animation: orbit-3 2.5s ease-in-out infinite;
}

/* 动画定义 */
@keyframes pulse-ink {
  0%, 100% { width: 80px; height: 80px; }
  50% { width: 90px; height: 85px; } /* 轻微变形 */
}

@keyframes orbit-1 {
  0% { transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); }
}

@keyframes orbit-2 {
  0% { transform: translate(-50%, -50%) rotate(0deg) translateY(55px) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg) translateY(55px) rotate(-360deg); }
}

@keyframes orbit-3 {
  0% { transform: translate(-50%, -50%) rotate(180deg) translateX(40px); }
  50% { transform: translate(-50%, -50%) rotate(360deg) translateX(20px); } /* 不规则轨道 */
  100% { transform: translate(-50%, -50%) rotate(540deg) translateX(40px); }
}

.loading-text {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  letter-spacing: 8px; /* 宽字距 */
  color: #1f2a44;
  font-weight: 500;
  margin-top: -30px; /* 拉近文字与墨团 */
  padding-left: 8px; /* 修正 letter-spacing 造成的偏移 */
  opacity: 0.8;
}

.char {
  display: inline-block;
  animation: fade-in-out 2s linear infinite;
}

.char:nth-child(1) { animation-delay: 0s; }
.char:nth-child(2) { animation-delay: 0.2s; }
.char:nth-child(3) { animation-delay: 0.4s; }
.char:nth-child(4) { animation-delay: 0.6s; }

@keyframes fade-in-out {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}
</style>
