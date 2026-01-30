<template>
  <div class="section-card">
    <div class="section-title">3. 生成配置</div>
    <el-form label-position="top" style="margin-bottom: 12px;">
      <el-form-item label="规则策略">
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-switch v-model="form.includeDefaultRules" active-text="包含默认规则" />
          <el-button size="small" @click="showDefaultRulesModel = true">查看默认规则</el-button>
        </div>
      </el-form-item>
      <el-form-item label="规则模板预设（一键应用）">
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <el-button v-for="(template, key) in ruleTemplates" :key="key" size="small" @click="applyRuleTemplate(key)">
            {{ template.icon }} {{ template.name }}
          </el-button>
        </div>
        <div class="helper-text">点击模板会将对应规则添加到自定义规则列表中</div>
      </el-form-item>
      <el-form-item label="快速添加规则">
        <div class="rule-builder" style="width: 100%;">
          <el-row :gutter="12" style="width: 100%;" type="flex">
            <el-col :span="6">
              <el-select v-model="ruleBuilder.type" placeholder="规则类型" style="width: 100%;">
                <el-option v-for="rt in ruleTypes" :key="rt.value" :label="rt.label" :value="rt.value" />
              </el-select>
            </el-col>
            <el-col :span="10">
              <el-input v-model="ruleBuilder.value" placeholder="域名/地址 (如 example.com)" />
            </el-col>
            <el-col :span="5">
              <el-select v-model="ruleBuilder.policy" placeholder="策略组" style="width: 100%;">
                <el-option v-for="pg in policyGroups" :key="pg.value" :label="pg.label" :value="pg.value" />
                <el-option-group v-if="nodesValue.length > 0" label="机场节点">
                  <el-option
                    v-for="node in nodesValue"
                    :key="node.name"
                    :label="getNodeDisplayName(node)"
                    :value="node.name"
                  />
                </el-option-group>
              </el-select>
            </el-col>
            <el-col :span="3">
              <el-button type="primary" @click="addCustomRule" style="width: 100%;">添加</el-button>
            </el-col>
          </el-row>
        </div>
      </el-form-item>
      <el-form-item label="自定义规则列表" v-if="customRulesValue.length > 0">
        <div class="rule-list">
          <el-tag
            v-for="(rule, index) in customRulesValue"
            :key="index"
            closable
            @close="removeCustomRule(index)"
            style="margin: 4px;"
          >
            {{ rule }}
          </el-tag>
        </div>
      </el-form-item>
      <el-form-item label="高级：直接输入规则（每行一条）">
        <el-input
          v-model="form.customRulesText"
          type="textarea"
          :rows="3"
          placeholder="例如：DOMAIN-SUFFIX,example.com,🌐 代理出口"
        />
        <div class="helper-text">支持 Clash 规则格式；空行与以 #/\/\/ 开头的注释会被忽略。</div>
      </el-form-item>
    </el-form>
  <el-space wrap>
    <el-button type="primary" @click="generateYaml">生成配置</el-button>
    <el-button @click="copyYaml" :disabled="!yamlTextValue">复制配置</el-button>
    <el-button @click="downloadYaml" :disabled="!yamlTextValue">下载 config.yaml</el-button>
    <el-button @click="showConfigDiff" :disabled="!yamlTextValue || !previousYamlValue">对比变更</el-button>
      <el-divider direction="vertical" />
      <el-button @click="saveTemplate" size="small">保存模板</el-button>
      <el-button @click="loadTemplate" size="small">加载模板</el-button>
    <el-button type="danger" link @click="clearAllConfig" class="clear-config-btn">清除配置</el-button>
  </el-space>

    <el-divider content-position="left">生成说明</el-divider>
    <ul style="padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.7;">
      <li>默认使用 Fake-IP DNS、国内外分流解析。</li>
      <li>AI/Google 组优先走 Socks5 落地节点。</li>
      <li>代理出口组包含落地节点 + 机场节点 + DIRECT。</li>
      <li>Socks5 节点自动注入 dialer-proxy。</li>
    </ul>

    <el-dialog v-model="showDefaultRulesModel" title="默认规则列表" width="700px">
      <div style="max-height: 500px; overflow-y: auto;">
        <el-table :data="defaultRulesDisplay" size="small" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="rule" label="规则" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showDefaultRulesModel = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDiffDialogModel" title="配置变更对比" width="80%" top="5vh">
      <div class="diff-container">
        <div
          v-for="(part, index) in diffResultValue"
          :key="index"
          :class="{
            'diff-added': part.added,
            'diff-removed': part.removed,
            'diff-unchanged': !part.added && !part.removed,
          }"
        >
          {{ part.value }}
        </div>
      </div>
      <template #footer>
        <el-button @click="showDiffDialogModel = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  form: { type: Object, required: true },
  ruleTemplates: { type: Object, required: true },
  ruleTypes: { type: Array, required: true },
  ruleBuilder: { type: Object, required: true },
  customRules: { type: [Array, Object], required: true },
  policyGroups: { type: Array, required: true },
  nodes: { type: [Array, Object], required: true },
  getNodeDisplayName: { type: Function, required: true },
  addCustomRule: { type: Function, required: true },
  removeCustomRule: { type: Function, required: true },
  applyRuleTemplate: { type: Function, required: true },
  generateYaml: { type: Function, required: true },
  copyYaml: { type: Function, required: true },
  downloadYaml: { type: Function, required: true },
  showConfigDiff: { type: Function, required: true },
  saveTemplate: { type: Function, required: true },
  loadTemplate: { type: Function, required: true },
  clearAllConfig: { type: Function, required: true },
  yamlText: { type: [String, Object], required: true },
  previousYaml: { type: [String, Object], required: true },
  defaultRulesDisplay: { type: Array, required: true },
  showDiffDialog: { type: [Boolean, Object], required: true },
  diffResult: { type: [Array, Object], required: true },
});

const unwrapRef = (value) =>
  value && typeof value === "object" && "value" in value ? value.value : value;

const bindRef = (refLike) =>
  computed({
    get: () => unwrapRef(refLike),
    set: (val) => {
      if (refLike && typeof refLike === "object" && "value" in refLike) {
        refLike.value = val;
      }
    },
  });

// 使用本地 ref 控制默认规则弹窗，解决 props 响应式更新问题
const showDefaultRulesModel = ref(false);
const showDiffDialogModel = bindRef(props.showDiffDialog);
const yamlTextValue = computed(() => unwrapRef(props.yamlText));
const previousYamlValue = computed(() => unwrapRef(props.previousYaml));
const customRulesValue = computed(() => unwrapRef(props.customRules) || []);
const nodesValue = computed(() => unwrapRef(props.nodes) || []);
const diffResultValue = computed(() => unwrapRef(props.diffResult) || []);
</script>
