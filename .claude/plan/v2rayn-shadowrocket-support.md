# 实施计划：V2rayN 和 Shadowrocket 支持

## 任务类型
- [x] 前端功能扩展

---

## 背景分析

### 当前状态
- RelayBox 目前只生成 Clash YAML 格式配置
- 用户希望支持 V2rayN 和 Shadowrocket

### 目标客户端

| 客户端 | 平台 | 配置格式 | 链式代理支持 |
|--------|------|----------|--------------|
| V2rayN | Windows | V2Ray JSON | ✅ 通过 proxySettings.tag |
| Shadowrocket | iOS | Clash YAML / URI | ✅ 原生支持 Clash 格式 |

---

## 技术方案

### 1. Shadowrocket 支持

**结论**：Shadowrocket 原生支持 Clash YAML 格式，无需额外开发。

只需在 UI 上明确告知用户：
- 当前生成的 Clash 配置可直接导入 Shadowrocket
- 通过配置托管 URL 或复制 YAML 内容导入

### 2. V2rayN 支持

**核心挑战**：
1. V2Ray 使用 JSON 格式，结构与 Clash YAML 完全不同
2. 链式代理通过 `outbound.proxySettings.tag` 实现
3. 部分协议不支持（Hysteria、Hysteria2、TUIC、SSR）

**V2Ray JSON 结构**：
```json
{
  "inbounds": [...],
  "outbounds": [
    {
      "tag": "proxy-node-1",
      "protocol": "vmess",
      "settings": {...},
      "streamSettings": {...}
    },
    {
      "tag": "landing-node",
      "protocol": "socks",
      "settings": {...},
      "proxySettings": {
        "tag": "proxy-node-1"  // 链式代理关键
      }
    }
  ],
  "routing": {...}
}
```

**协议支持映射**：

| Clash 协议 | V2Ray 支持 | V2Ray protocol |
|------------|------------|----------------|
| vmess | ✅ | vmess |
| vless | ✅ | vless |
| trojan | ✅ | trojan |
| ss | ✅ | shadowsocks |
| socks5 | ✅ | socks |
| http | ✅ | http |
| ssr | ❌ | - |
| hysteria | ❌ | - |
| hysteria2 | ❌ | - |
| tuic | ❌ | - |

---

## 实施步骤

### Step 1: 创建 V2Ray 配置生成器

新建 `src/utils/v2rayGenerator.js`：

```javascript
/**
 * 将 Clash 节点转换为 V2Ray outbound
 */
export const toV2rayOutbound = (node, tag) => {
  const base = { tag, protocol: '', settings: {}, streamSettings: {} };

  switch (node.type) {
    case 'vmess':
      return buildVmessOutbound(node, tag);
    case 'vless':
      return buildVlessOutbound(node, tag);
    case 'trojan':
      return buildTrojanOutbound(node, tag);
    case 'ss':
      return buildShadowsocksOutbound(node, tag);
    case 'socks5':
      return buildSocksOutbound(node, tag);
    case 'http':
      return buildHttpOutbound(node, tag);
    default:
      return null; // 不支持的协议
  }
};

/**
 * 生成完整的 V2Ray JSON 配置
 */
export const generateV2rayConfig = (nodes, landingNode, dialerProxyName) => {
  // 构建 outbounds
  // 构建 routing rules
  // 返回完整配置
};
```

### Step 2: 实现各协议转换函数

```javascript
const buildVmessOutbound = (node, tag) => ({
  tag,
  protocol: 'vmess',
  settings: {
    vnext: [{
      address: node.server,
      port: node.port,
      users: [{
        id: node.uuid,
        alterId: node.alterId || 0,
        security: node.cipher || 'auto'
      }]
    }]
  },
  streamSettings: buildStreamSettings(node)
});

const buildStreamSettings = (node) => {
  const settings = {
    network: node.network || 'tcp',
    security: node.tls ? 'tls' : 'none'
  };

  // 处理 ws, grpc, h2 等传输方式
  if (node.network === 'ws') {
    settings.wsSettings = {
      path: node['ws-opts']?.path || '/',
      headers: node['ws-opts']?.headers || {}
    };
  }
  // ... 其他传输方式

  return settings;
};
```

### Step 3: 修改 useConfig.js

添加 V2Ray 配置生成函数：

```javascript
const generateV2rayJson = () => {
  // 检查协议兼容性
  const unsupportedNodes = selectedNodes.value.filter(
    n => ['ssr', 'hysteria', 'hysteria2', 'tuic'].includes(n.type)
  );

  if (unsupportedNodes.length > 0) {
    setStatus(`V2rayN 不支持以下协议: ${unsupportedNodes.map(n => n.type).join(', ')}`, 'warning');
    return;
  }

  // 生成配置
  const config = generateV2rayConfig(selectedNodes.value, landingNode.value, ...);
  v2rayJsonText.value = JSON.stringify(config, null, 2);
};
```

### Step 4: 更新 UI

在配置生成区域添加格式选择：

```vue
<el-radio-group v-model="outputFormat">
  <el-radio value="clash">Clash (Verge/CFW/OpenClash)</el-radio>
  <el-radio value="v2ray">V2rayN</el-radio>
</el-radio-group>

<!-- 提示 Shadowrocket 用户 -->
<div class="format-hint">
  <el-icon><InfoFilled /></el-icon>
  <span>Shadowrocket 用户可直接使用 Clash 格式</span>
</div>
```

### Step 5: 添加导出功能

```javascript
const downloadV2rayConfig = () => {
  const blob = new Blob([v2rayJsonText.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/utils/v2rayGenerator.js` | 新增 | V2Ray JSON 配置生成器 |
| `src/composables/useConfig.js` | 修改 | 添加 V2Ray 生成逻辑 |
| `src/App.vue` | 修改 | 添加格式选择 UI |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 部分协议不支持 | 在 UI 上明确提示，选择不支持协议时给出警告 |
| V2Ray 配置复杂 | 只实现常用配置项，高级选项使用默认值 |
| 传输方式多样 | 优先支持 tcp, ws, grpc，其他按需添加 |

---

## 验收标准

1. 用户可选择输出格式（Clash / V2rayN）
2. V2rayN 格式正确生成链式代理配置
3. 不支持的协议给出明确提示
4. Shadowrocket 用户知道可直接使用 Clash 格式
5. 保持水墨风格 UI 一致性

---

## 简化方案（推荐）

考虑到 V2Ray JSON 配置的复杂性，建议采用简化方案：

1. **Shadowrocket**：在 UI 上添加提示，说明可直接使用 Clash 格式
2. **V2rayN**：
   - 只支持 vmess、vless、trojan、ss、socks5、http 协议
   - 只支持 tcp、ws 传输方式
   - 其他高级配置使用默认值

这样可以覆盖 80% 的使用场景，同时保持代码简洁。
