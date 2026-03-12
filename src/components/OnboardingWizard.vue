<template>
  <el-dialog
    v-model="visible"
    title=""
    width="680px"
    :close-on-click-modal="false"
    :show-close="false"
    class="onboarding-dialog"
  >
    <template #header>
        <div class="onboarding-header">
          <div class="onboarding-logo">
            <span class="logo-icon">🔗</span>
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
          <div class="complete-icon">🎉</div>
          <h2>准备就绪！</h2>
          <p class="complete-desc">
            现在流程已经捋顺了。<br>
            点击下方按钮开始生成你的 Clash 配置。
          </p>
          <div class="quick-actions">
            <div class="action-item" @click="startWithDemo">
              <el-icon size="24"><DocumentCopy /></el-icon>
              <span>使用示例配置</span>
            </div>
            <div class="action-item" @click="startFresh">
              <el-icon size="24"><Edit /></el-icon>
              <span>从零开始配置</span>
            </div>
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
  border-bottom: 1px solid #e5e7eb;
  margin-right: 0;
}

.onboarding-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.onboarding-dialog :deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
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
  color: #1f2a44;
}

.skip-btn {
  color: #6b7280;
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
  animation: fadeIn 0.3s ease;
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
  color: #1f2a44;
  margin: 0 0 12px;
}

.welcome-desc {
  color: #4b5563;
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
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.feature-icon {
  font-size: 28px;
}

.feature-text {
  font-size: 13px;
  color: #374151;
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
  color: #1f2a44;
  margin: 0 0 12px;
  text-align: center;
}

.step-panel > p {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 20px;
}

.tip-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #eff6ff;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  margin-bottom: 20px;
}

.tip-box.info {
  background: #f0f9ff;
  border-color: #7dd3fc;
}

.tip-box.success {
  background: #f0fdf4;
  border-color: #86efac;
}

.tip-box :deep(.el-icon) {
  color: #3b82f6;
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.tip-box.success :deep(.el-icon) {
  color: #22c55e;
}

.tip-box strong {
  display: block;
  color: #1e40af;
  margin-bottom: 4px;
}

.tip-box.success strong {
  color: #166534;
}

.tip-box ul {
  margin: 4px 0 0;
  padding-left: 18px;
  color: #374151;
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
  background: #f8fafc;
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  color: #9ca3af;
  font-size: 13px;
}

.complete-panel {
  text-align: center;
  padding-top: 20px;
}

.complete-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.complete-panel h2 {
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
  color: #1f2a44;
  margin: 0 0 12px;
}

.complete-desc {
  color: #4b5563;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 247, 242, 0.94));
  border: 1px solid rgba(31, 42, 68, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    background 0.24s ease,
    box-shadow 0.24s ease;
}

.action-item:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 241, 234, 0.98));
  border-color: rgba(185, 43, 39, 0.24);
  transform: translateY(-3px);
  box-shadow:
    0 16px 26px rgba(31, 42, 68, 0.08),
    0 6px 12px rgba(185, 43, 39, 0.08);
}

.action-item :deep(.el-icon) {
  color: var(--accent-600);
  transition:
    transform 0.24s ease,
    color 0.24s ease;
}

.action-item:hover :deep(.el-icon) {
  transform: translateY(-1px) scale(1.06);
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
