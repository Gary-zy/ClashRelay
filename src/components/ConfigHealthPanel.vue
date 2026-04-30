<template>
  <section class="config-health-panel" :class="`is-${report.summary.status}`">
    <div class="health-header">
      <div>
        <span class="health-kicker">配置体检</span>
        <strong>{{ statusLabel }}</strong>
      </div>
      <span class="health-mode">{{ modeLabel }}</span>
    </div>

    <div class="health-stats">
      <span><b>{{ report.summary.proxyCount }}</b> 代理</span>
      <span><b>{{ report.summary.proxyGroupCount }}</b> 策略组</span>
      <span><b>{{ report.summary.ruleCount }}</b> 规则</span>
    </div>

    <div v-if="report.routeChain.length" class="health-chain">
      <span class="health-section-title">链路摘要</span>
      <div class="health-chain-line">
        <template v-for="(item, index) in report.routeChain" :key="`${item}-${index}`">
          <span>{{ item }}</span>
          <i v-if="index < report.routeChain.length - 1">→</i>
        </template>
      </div>
    </div>

    <div v-if="report.issues.length || report.warnings.length" class="health-issues">
      <div
        v-for="issue in report.issues"
        :key="`issue-${issue.message}`"
        class="health-issue is-error"
      >
        {{ issue.message }}
      </div>
      <div
        v-for="warning in report.warnings"
        :key="`warning-${warning.message}`"
        class="health-issue is-warning"
      >
        {{ warning.message }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
});

const statusLabel = computed(() => {
  const labels = {
    ok: "体检通过",
    warning: "可用，但有提醒",
    blocked: "需要先处理",
  };
  return labels[props.report.summary.status] || "等待生成";
});

const modeLabel = computed(() => {
  const labels = {
    relay: "中转链路",
    direct: "直连落地",
    subscription: "订阅整理",
    unknown: "未识别",
  };
  return labels[props.report.summary.mode] || "未识别";
});
</script>

<style scoped>
.config-health-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid rgba(31, 42, 68, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 12px 26px rgba(26, 26, 26, 0.05);
}

.config-health-panel.is-ok {
  border-color: rgba(88, 112, 103, 0.2);
}

.config-health-panel.is-warning {
  border-color: rgba(178, 121, 39, 0.24);
}

.config-health-panel.is-blocked {
  border-color: rgba(185, 43, 39, 0.24);
}

.health-header,
.health-stats,
.health-chain-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.health-header {
  justify-content: space-between;
}

.health-kicker,
.health-section-title,
.health-mode {
  color: var(--ink-500);
  font-size: 12px;
}

.health-header strong {
  display: block;
  margin-top: 2px;
  color: var(--ink-800);
}

.health-mode {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(88, 112, 103, 0.1);
}

.health-stats {
  flex-wrap: wrap;
  color: var(--ink-600);
  font-size: 13px;
}

.health-stats b {
  color: var(--ink-800);
}

.health-chain {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.health-chain-line {
  flex-wrap: wrap;
  color: var(--ink-700);
  font-size: 13px;
}

.health-chain-line span {
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(31, 42, 68, 0.06);
}

.health-chain-line i {
  color: var(--ink-400);
  font-style: normal;
}

.health-issues {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.health-issue {
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
}

.health-issue.is-error {
  color: #8f2420;
  background: rgba(185, 43, 39, 0.08);
}

.health-issue.is-warning {
  color: #7a5118;
  background: rgba(178, 121, 39, 0.1);
}

@media (max-width: 720px) {
  .health-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
