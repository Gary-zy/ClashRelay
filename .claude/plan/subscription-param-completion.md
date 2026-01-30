# 实施计划：机场订阅参数补全功能

## 任务类型
- [x] 前端 (→ Gemini)
- [x] 后端 (→ Codex)
- [x] 全栈 (→ 并行)

---

## 技术方案

### 核心架构：统一参数补全层

借鉴 subconverter 的设计理念，在"订阅解析"与"YAML 生成"之间插入统一的参数补全层：

```
订阅获取 → 协议解析(parsers.js) → 参数补全层(新增) → YAML 生成
                                      ↑
                              全局设置 + 用户覆盖 + 系统默认
```

### 参数优先级策略

```
节点自带参数 > 用户全局设置 > 系统默认值
```

使用 tribool 类型（true/false/undefined）区分"明确设置"与"未设置"。

### 客户端兼容性

默认以 clash-verge-rev 为目标客户端，维护字段支持矩阵，对不支持的字段进行降级或告警。

---

## 实施步骤

### Phase 1: 核心逻辑层 (src/composables/useNodeParams.js)

**目标**：创建参数补全的核心逻辑

**1.1 创建 tribool 工具函数**

```javascript
// src/utils/tribool.js
export const toTriBool = (v) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return undefined;
};

export const pickByPriority = (nodeVal, userVal, systemVal) => {
  for (const v of [nodeVal, userVal, systemVal]) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};
```

**1.2 创建参数补全 Composable**

```javascript
// src/composables/useNodeParams.js
import { ref, reactive, computed } from "vue";
import { pickByPriority, toTriBool } from "../utils/tribool.js";

const PARAMS_KEY = "clashrelay_global_params";

// 系统默认值
const systemDefaults = {
  udp: true,
  tfo: false,
  skipCertVerify: true,
  tls13: undefined,
  clientFingerprint: "chrome",
};

export const useNodeParams = () => {
  // 用户全局设置
  const globalParams = reactive({
    udp: undefined,
    tfo: undefined,
    skipCertVerify: undefined,
    tls13: undefined,
    clientFingerprint: undefined,
    // 协议特定
    vmessCipher: undefined,
    vmessAlterId: undefined,
  });

  // 单节点覆盖 Map<nodeId, overrides>
  const nodeOverrides = ref(new Map());

  // 加载/保存持久化
  const loadParams = () => { /* localStorage */ };
  const saveParams = () => { /* localStorage */ };

  // 通用参数补全
  const commonConstruct = (node, ctx) => {
    return {
      ...node,
      udp: pickByPriority(node.udp, ctx.user.udp, ctx.system.udp),
      tfo: pickByPriority(node.tfo, ctx.user.tfo, ctx.system.tfo),
      "skip-cert-verify": pickByPriority(
        node["skip-cert-verify"],
        ctx.user.skipCertVerify,
        ctx.system.skipCertVerify
      ),
    };
  };

  // 协议特定补全
  const protocolConstruct = {
    vmess: (node, ctx) => ({
      ...node,
      cipher: pickByPriority(node.cipher, ctx.user.vmessCipher, "auto"),
      alterId: pickByPriority(node.alterId, ctx.user.vmessAlterId, 0),
    }),
    vless: (node, ctx) => node,
    trojan: (node, ctx) => node,
    ss: (node, ctx) => node,
    ssr: (node, ctx) => node,
    hysteria: (node, ctx) => node,
    hysteria2: (node, ctx) => node,
    tuic: (node, ctx) => node,
  };

  // 统一补全入口
  const completeNode = (rawNode) => {
    const ctx = {
      user: globalParams,
      system: systemDefaults,
    };
    let node = commonConstruct(rawNode, ctx);
    const construct = protocolConstruct[node.type];
    if (construct) {
      node = construct(node, ctx);
    }
    // 应用单节点覆盖
    const override = nodeOverrides.value.get(node.name);
    if (override) {
      node = { ...node, ...override };
    }
    return node;
  };

  const completeNodes = (nodes) => nodes.map(completeNode);

  return {
    globalParams,
    nodeOverrides,
    completeNode,
    completeNodes,
    loadParams,
    saveParams,
  };
};
```

**预期产物**：
- `src/utils/tribool.js` - tribool 工具函数
- `src/composables/useNodeParams.js` - 参数补全核心逻辑

---

### Phase 2: 全局参数面板组件 (src/components/GlobalParamPanel.vue)

**目标**：开发用户设置默认参数的 UI

**2.1 组件结构**

```vue
<template>
  <el-card class="global-param-panel" shadow="hover">
    <template #header>
      <div class="panel-header">
        <span>🛠️ 订阅参数补全</span>
        <el-switch v-model="enabled" active-text="启用" />
      </div>
    </template>

    <el-tabs v-if="enabled" v-model="activeTab">
      <!-- 网络参数 -->
      <el-tab-pane label="网络参数" name="network">
        <el-form :inline="true" label-position="left">
          <el-form-item label="UDP 转发">
            <el-switch v-model="params.udp" />
          </el-form-item>
          <el-form-item label="TCP Fast Open">
            <el-switch v-model="params.tfo" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 安全设置 -->
      <el-tab-pane label="安全设置" name="security">
        <el-form label-position="left">
          <el-form-item label="跳过证书验证">
            <el-switch v-model="params.skipCertVerify" />
          </el-form-item>
          <el-form-item label="客户端指纹">
            <el-select v-model="params.clientFingerprint" placeholder="选择指纹">
              <el-option label="Chrome" value="chrome" />
              <el-option label="Firefox" value="firefox" />
              <el-option label="Safari" value="safari" />
              <el-option label="Edge" value="edge" />
              <el-option label="随机" value="random" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 节点清洗 -->
      <el-tab-pane label="节点清洗" name="rename">
        <el-form label-position="top">
          <el-form-item label="正则匹配">
            <el-input v-model="renamePattern" placeholder="例: \s*\[.*?\]" />
          </el-form-item>
          <el-form-item label="替换为">
            <el-input v-model="renameReplace" placeholder="留空则删除匹配内容" />
          </el-form-item>
          <el-button type="primary" size="small" @click="previewRename">
            预览清洗结果
          </el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div class="panel-actions" v-if="enabled">
      <el-button size="small" @click="resetParams">重置</el-button>
      <el-button type="primary" size="small" @click="applyToAll">
        应用到所有节点
      </el-button>
    </div>
  </el-card>
</template>
```

**预期产物**：
- `src/components/GlobalParamPanel.vue` - 全局参数设置面板

---

### Phase 3: 节点列表参数状态展示

**目标**：在节点列表中展示参数继承状态

**3.1 参数状态标签组件**

```vue
<!-- src/components/ParamTag.vue -->
<template>
  <el-tag
    :type="tagType"
    :effect="isOverridden ? 'dark' : 'plain'"
    size="small"
    @click="toggleValue"
  >
    {{ label }}: {{ displayValue }}
  </el-tag>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: String,
  nodeValue: [Boolean, String],
  globalValue: [Boolean, String],
  systemValue: [Boolean, String],
});

const emit = defineEmits(["update"]);

const isOverridden = computed(() => props.nodeValue !== undefined);
const effectiveValue = computed(() =>
  props.nodeValue ?? props.globalValue ?? props.systemValue
);
const displayValue = computed(() =>
  effectiveValue.value ? "On" : "Off"
);
const tagType = computed(() =>
  isOverridden.value ? "warning" : "info"
);
</script>
```

**3.2 修改 NodeList.vue**

在节点卡片中增加参数预览区：

```vue
<div class="node-params">
  <ParamTag label="UDP" :node-value="node.udp" :global-value="globalParams.udp" />
  <ParamTag label="TFO" :node-value="node.tfo" :global-value="globalParams.tfo" />
  <ParamTag label="SCV" :node-value="node['skip-cert-verify']" />
</div>
```

**预期产物**：
- `src/components/ParamTag.vue` - 参数状态标签组件
- 修改 `src/components/NodeList.vue` - 增加参数预览区

---

### Phase 4: 配置生成适配

**目标**：在生成 YAML 前应用参数补全

**4.1 修改 useConfig.js**

```javascript
// 在 generateYaml 函数中
import { useNodeParams } from "./useNodeParams.js";

const { completeNodes } = useNodeParams();

const generateYaml = () => {
  // 应用参数补全
  const completedNodes = completeNodes(nodes.value);

  // 使用补全后的节点生成配置
  // ...
};
```

**预期产物**：
- 修改 `src/composables/useConfig.js` - 集成参数补全

---

### Phase 5: 持久化与模板

**目标**：保存用户设置，支持多套预设

**5.1 localStorage 持久化**

```javascript
const PARAMS_KEY = "clashrelay_global_params";
const PRESETS_KEY = "clashrelay_param_presets";

const loadParams = () => {
  const saved = localStorage.getItem(PARAMS_KEY);
  if (saved) Object.assign(globalParams, JSON.parse(saved));
};

const saveParams = () => {
  localStorage.setItem(PARAMS_KEY, JSON.stringify(globalParams));
};

// 预设管理
const presets = ref([
  { name: "移动端优化", params: { udp: true, tfo: true } },
  { name: "低延迟优先", params: { udp: true, tfo: true, skipCertVerify: true } },
]);
```

**预期产物**：
- 完善 `useNodeParams.js` 的持久化逻辑
- 可选：预设管理 UI

---

### Phase 6 (可选): Subconverter API 集成

**目标**：支持高级用户使用 subconverter 进行增强解析

```javascript
const useSubconverterAPI = async (subscriptionUrl, endpoint) => {
  const params = new URLSearchParams({
    target: "clash",
    url: subscriptionUrl,
    udp: "true",
    tfo: "true",
    scv: "true",
  });
  const response = await fetch(`${endpoint}/sub?${params}`);
  return yaml.load(await response.text());
};
```

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/utils/tribool.js` | 新增 | tribool 工具函数 |
| `src/composables/useNodeParams.js` | 新增 | 参数补全核心逻辑 |
| `src/components/GlobalParamPanel.vue` | 新增 | 全局参数设置面板 |
| `src/components/ParamTag.vue` | 新增 | 参数状态标签组件 |
| `src/components/NodeList.vue` | 修改 | 增加参数预览区 |
| `src/composables/useConfig.js` | 修改 | 集成参数补全到生成流程 |
| `src/App.vue` | 修改 | 引入 GlobalParamPanel 组件 |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 参数补全逻辑与现有解析冲突 | 补全层独立于解析，不修改原始解析函数 |
| 不同 Clash 客户端字段兼容性 | 引入客户端能力矩阵，对不支持字段告警 |
| 用户设置丢失 | localStorage 持久化 + 导出/导入功能 |
| 性能影响（大量节点） | 使用 computed 缓存，避免重复计算 |

---

## SESSION_ID（供 /ccg:execute 使用）

- CODEX_SESSION: `019c0cc7-26a3-73c0-86aa-c47f902f21b2`
- GEMINI_SESSION: `90f4a00d-2faa-4e71-9a63-b40f1396ef57`

---

## 验收标准

1. 用户可在全局面板设置 UDP/TFO/SCV 等参数
2. 节点列表显示参数继承状态（继承/覆盖）
3. 生成的 YAML 包含补全后的参数
4. 设置可持久化，刷新页面不丢失
5. 支持单节点参数覆盖
