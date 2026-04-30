<template>
  <el-dialog
    v-model="visible"
    title=""
    width="min(680px, calc(100vw - 24px))"
    :close-on-click-modal="false"
    :show-close="false"
    class="onboarding-dialog"
  >
    <template #header>
        <div class="onboarding-header">
          <div class="onboarding-logo">
            <el-icon class="logo-icon"><Connection /></el-icon>
            <span class="logo-text">Clash 配置生成器</span>
          </div>
        <el-button text @click="skipOnboarding" class="skip-btn">
          跳过引导
        </el-button>
      </div>
    </template>

    <div class="onboarding-content">
        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step title="欢迎" :icon="House" />
          <el-step title="订阅" :icon="Link" />
          <el-step title="节点" :icon="Connection" />
          <el-step title="落地" :icon="List" />
          <el-step title="完成" :icon="Check" />
        </el-steps>

      <div class="step-content">
        <!-- Step 0: 欢迎 -->
        <div v-if="currentStep === 0" class="step-panel welcome-panel">
          <div class="welcome-icon">
            <el-icon><Guide /></el-icon>
          </div>
          <h2>欢迎使用 Clash 配置生成器</h2>
          <p class="welcome-desc">
            这个工具只做一件事：把订阅节点、跳板选择和落地节点整理成
            <strong>一份干净的 Clash 配置</strong>。
          </p>
          <div class="feature-grid">
            <div class="feature-item">
              <el-icon class="feature-icon"><Connection /></el-icon>
              <span class="feature-text">Clash Only</span>
            </div>
            <div class="feature-item">
              <el-icon class="feature-icon"><Switch /></el-icon>
              <span class="feature-text">直连 / 中转</span>
            </div>
            <div class="feature-item">
              <el-icon class="feature-icon"><List /></el-icon>
              <span class="feature-text">默认规则</span>
            </div>
            <div class="feature-item">
              <el-icon class="feature-icon"><Lightning /></el-icon>
              <span class="feature-text">一键导出</span>
            </div>
          </div>
        </div>

        <!-- Step 1: 订阅 -->
        <div v-if="currentStep === 1" class="step-panel">
          <div class="step-icon">
            <el-icon><Link /></el-icon>
          </div>
          <h3>第一步：导入订阅</h3>
          <p>输入机场订阅地址，点击「获取节点」解析可用节点列表。</p>
          <div class="tip-box">
            <el-icon><InfoFilled /></el-icon>
            <div>
              <strong>支持格式：</strong>
              <ul>
                <li>Base64 编码的订阅链接</li>
                <li>纯文本节点列表</li>
                <li>Clash YAML 订阅内容</li>
              </ul>
            </div>
          </div>
          <div class="demo-image">
            <div class="demo-placeholder">
              <el-icon size="32"><Upload /></el-icon>
              <span>订阅地址输入区域</span>
            </div>
          </div>
        </div>

        <!-- Step 2: 节点 -->
        <div v-if="currentStep === 2" class="step-panel">
          <div class="step-icon">
            <el-icon><Connection /></el-icon>
          </div>
          <h3>第二步：决定是否使用跳板</h3>
          <p>中转模式下选择一个或多个跳板；直连模式下，这一步可以直接跳过。</p>
          <div class="tip-box info">
            <el-icon><InfoFilled /></el-icon>
            <div>
              <strong>两种模式有什么区别？</strong>
              <p style="margin: 4px 0 0;">
                中转模式：<code>本机 → 跳板节点 → 落地节点 → 目标网站</code><br>
                直连模式：<code>本机 → 落地节点 → 目标网站</code>
              </p>
            </div>
          </div>
          <div class="demo-image">
            <div class="demo-placeholder">
              <el-icon size="32"><Connection /></el-icon>
              <span>节点选择列表</span>
            </div>
          </div>
        </div>

        <!-- Step 3: 规则 -->
        <div v-if="currentStep === 3" class="step-panel">
          <div class="step-icon">
            <el-icon><List /></el-icon>
          </div>
          <h3>第三步：配置落地节点</h3>
          <p>SOCKS5 / HTTP 可以手填，其他 Clash 协议统一通过链接解析导入。</p>
          <div class="tip-box success">
            <el-icon><SuccessFilled /></el-icon>
            <div>
              <strong>规则策略：</strong>
              <p style="margin: 4px 0 0;">
                系统会自动带上默认规则；你只需要在最后一步补充自定义规则即可。
              </p>
            </div>
          </div>
          <div class="demo-image">
            <div class="demo-placeholder">
              <el-icon size="32"><List /></el-icon>
              <span>规则配置区域</span>
            </div>
          </div>
        </div>

        <!-- Step 4: 完成 -->
        <div v-if="currentStep === 4" class="step-panel complete-panel">
          <el-icon class="complete-icon"><Check /></el-icon>
          <h2>准备就绪！</h2>
          <p class="complete-desc">
            现在流程已经捋顺了。<br>
            点击下方按钮开始生成你的 Clash 配置。
          </p>
          <div class="quick-actions">
            <button type="button" class="action-item" @click="startWithDemo">
              <el-icon size="24"><DocumentCopy /></el-icon>
              <span>使用示例配置</span>
            </button>
            <button type="button" class="action-item" @click="startFresh">
              <el-icon size="24"><Edit /></el-icon>
              <span>从零开始配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="onboarding-footer">
        <el-checkbox v-model="dontShowAgain" label="下次不再显示" />
        <div class="footer-buttons">
          <el-button v-if="currentStep > 0" @click="prevStep">
            上一步
          </el-button>
          <el-button
            v-if="currentStep < 4"
            type="primary"
            @click="nextStep"
          >
            {{ currentStep === 0 ? '开始了解' : '下一步' }}
          </el-button>
          <el-button
            v-else
            type="primary"
            @click="finishOnboarding"
          >
            开始使用
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  House,
  Link,
  Connection,
  List,
  Check,
  InfoFilled,
  SuccessFilled,
  Upload,
  DocumentCopy,
  Edit,
  Switch,
  Lightning,
  Guide,
} from "@element-plus/icons-vue";

const ONBOARDING_KEY = "clashrelay_onboarding_completed";

const emit = defineEmits(["complete", "load-demo"]);

const visible = ref(false);
const currentStep = ref(0);
const dontShowAgain = ref(false);

const checkShouldShow = () => {
  try {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    return completed !== "true";
  } catch {
    return true;
  }
};

const saveOnboardingState = () => {
  if (dontShowAgain.value) {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
  }
};

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const skipOnboarding = () => {
  saveOnboardingState();
  visible.value = false;
  emit("complete");
};

const finishOnboarding = () => {
  saveOnboardingState();
  visible.value = false;
  emit("complete");
};

const startWithDemo = () => {
  saveOnboardingState();
  visible.value = false;
  emit("load-demo");
};

const startFresh = () => {
  saveOnboardingState();
  visible.value = false;
  emit("complete");
};

// 暴露方法供外部调用
const show = () => {
  currentStep.value = 0;
  visible.value = true;
};

const resetOnboarding = () => {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {}
};

defineExpose({ show, resetOnboarding });

onMounted(() => {
  if (checkShouldShow()) {
    visible.value = true;
  }
});
</script>

<style scoped>
.onboarding-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-200);
  margin-right: 0;
}

.onboarding-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.onboarding-dialog :deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid var(--line-200);
}

.onboarding-dialog :deep(.el-dialog) {
  background: rgba(253, 251, 247, 0.98);
  border: 1px solid var(--line-200);
  border-radius: 12px;
  box-shadow: var(--shadow-ink);
  max-height: calc(100dvh - 24px);
  display: flex;
  flex-direction: column;
}

.onboarding-dialog :deep(.el-dialog__body) {
  overflow: auto;
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.onboarding-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: var(--accent-600);
}

.logo-text {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-600);
}

.skip-btn {
  color: var(--ink-500);
}

.onboarding-content {
  padding: 24px;
}

.onboarding-content :deep(.el-steps) {
  margin-bottom: 24px;
}

.step-content {
  min-height: 320px;
}

.step-panel {
  animation: fadeIn 0.24s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-panel {
  text-align: center;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-panel h2 {
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
  color: var(--accent-600);
  margin: 0 0 12px;
}

.welcome-desc {
  color: var(--ink-700);
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(253, 251, 247, 0.82);
  border-radius: 10px;
  border: 1px solid var(--line-200);
}

.feature-icon {
  font-size: 28px;
}

.feature-text {
  font-size: 13px;
  color: var(--ink-700);
  font-weight: 500;
}

.step-icon {
  font-size: 40px;
  text-align: center;
  margin-bottom: 12px;
}

.step-panel h3 {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  color: var(--accent-600);
  margin: 0 0 12px;
  text-align: center;
}

.step-panel > p {
  color: var(--ink-700);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 20px;
}

.tip-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(31, 42, 68, 0.06);
  border-radius: 10px;
  border: 1px dashed rgba(31, 42, 68, 0.18);
  margin-bottom: 20px;
}

.tip-box.info {
  background: rgba(31, 42, 68, 0.05);
  border-color: rgba(31, 42, 68, 0.18);
}

.tip-box.success {
  background: rgba(88, 112, 103, 0.08);
  border-color: rgba(88, 112, 103, 0.22);
}

.tip-box :deep(.el-icon) {
  color: var(--accent-600);
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.tip-box.success :deep(.el-icon) {
  color: var(--status-ok);
}

.tip-box strong {
  display: block;
  color: var(--accent-600);
  margin-bottom: 4px;
}

.tip-box.success strong {
  color: var(--status-ok);
}

.tip-box ul {
  margin: 4px 0 0;
  padding-left: 18px;
  color: var(--ink-700);
  font-size: 13px;
  line-height: 1.6;
}

.tip-box code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.demo-image {
  margin-top: 16px;
}

.demo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100px;
  background: rgba(253, 251, 247, 0.76);
  border: 2px dashed var(--line-200);
  border-radius: 10px;
  color: var(--ink-400);
  font-size: 13px;
}

.complete-panel {
  text-align: center;
  padding-top: 20px;
}

.complete-icon {
  font-size: 56px;
  color: var(--vermillion-500);
  margin-bottom: 16px;
}

.complete-panel h2 {
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
  color: var(--accent-600);
  margin: 0 0 12px;
}

.complete-desc {
  color: var(--ink-700);
  font-size: 15px;
  line-height: 1.8;
  margin-bottom: 28px;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.action-item {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 247, 242, 0.94));
  border: 1px solid rgba(31, 42, 68, 0.1);
  border-radius: 16px;
  cursor: pointer;
  font: inherit;
  transition:
    border-color 0.24s ease,
    background 0.24s ease,
    box-shadow 0.24s ease;
}

.action-item:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 241, 234, 0.98));
  border-color: rgba(185, 43, 39, 0.24);
  box-shadow:
    inset 0 0 0 1px rgba(185, 43, 39, 0.06),
    0 8px 16px rgba(31, 42, 68, 0.05);
}

.action-item:focus-visible {
  outline: 2px solid rgba(185, 43, 39, 0.45);
  outline-offset: 2px;
}

.action-item :deep(.el-icon) {
  color: var(--accent-600);
  transition: color 0.24s ease;
}

.action-item:hover :deep(.el-icon) {
  color: var(--vermillion-500);
}

.action-item span {
  font-size: 14px;
  color: var(--ink-700);
  font-weight: 500;
  transition: color 0.24s ease;
}

.action-item:hover span {
  color: var(--ink-900);
}

.onboarding-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 680px) {
  .onboarding-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 10px auto;
  }

  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions {
    flex-direction: column;
    gap: 12px;
  }

  .action-item {
    padding: 16px 24px;
  }
}
</style>
