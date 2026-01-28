<template>
  <div class="section-card">
    <div class="section-title">预览 config.yaml</div>
    <div class="config-preview" v-html="highlightedYaml || '等待生成...'" />
  </div>
</template>

<script setup>
const props = defineProps({
  highlightedYaml: { type: String, default: "" },
});
</script>
