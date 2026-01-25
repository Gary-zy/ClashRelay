# 节点健康监控功能开发文档

## 功能概述
后台定期检测节点可用性，标记失效节点，帮助用户快速识别可用节点。

## 技术方案

### 1. 架构设计
由于是纯前端应用，采用以下方案：
- 使用 Web Worker 进行后台检测（避免阻塞 UI）
- 通过 proxy-server 代理测速请求
- 结果存储在 localStorage 缓存

### 2. 数据结构

```javascript
// 节点健康状态
const nodeHealthStatus = ref({
  // "节点名称": { status: "healthy|unhealthy|unknown", lastCheck: timestamp, latency: number }
});

const healthCheckConfig = reactive({
  enabled: false,
  interval: 5,        // 检测间隔（分钟）
  timeout: 5000,      // 超时时间（毫秒）
  testUrl: "http://www.gstatic.com/generate_204",
});
```

### 3. UI 变更

#### [MODIFY] App.vue - 节点列表
```vue
<!-- 在节点名称列添加健康状态指示 -->
<template #default="{ row }">
  <span :class="getHealthStatusClass(row.name)">
    {{ getHealthStatusIcon(row.name) }}
  </span>
  {{ row.name }}
</template>
```

#### [MODIFY] App.vue - 工具栏
```vue
<el-switch v-model="healthCheckConfig.enabled" active-text="健康监控" />
<el-tooltip v-if="healthCheckConfig.enabled" content="正在后台监控节点健康状态">
  <el-icon class="is-loading"><Loading /></el-icon>
</el-tooltip>
```

### 4. 核心逻辑

#### 健康检测函数
```javascript
const checkNodeHealth = async (node) => {
  const startTime = Date.now();
  try {
    const response = await fetch(`${form.proxyUrl}/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server: node.server, port: node.port }),
      signal: AbortSignal.timeout(healthCheckConfig.timeout),
    });
    const data = await response.json();
    return {
      status: data.latency > 0 ? "healthy" : "unhealthy",
      latency: data.latency,
      lastCheck: Date.now(),
    };
  } catch {
    return { status: "unhealthy", latency: -1, lastCheck: Date.now() };
  }
};

// 定时检测
const startHealthCheck = () => {
  if (healthCheckTimer.value) clearInterval(healthCheckTimer.value);
  
  healthCheckTimer.value = setInterval(async () => {
    for (const node of nodes.value) {
      const health = await checkNodeHealth(node);
      nodeHealthStatus.value[node.name] = health;
    }
    // 持久化
    localStorage.setItem("clashrelay_health", JSON.stringify(nodeHealthStatus.value));
  }, healthCheckConfig.interval * 60 * 1000);
};
```

### 5. 样式

```css
.health-healthy { color: #67c23a; }
.health-unhealthy { color: #f56c6c; }
.health-unknown { color: #909399; }
```

### 6. 优化考虑
- 限制并发检测数量，避免请求过多
- 使用指数退避策略处理频繁失败的节点
- 提供手动触发检测按钮

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | MODIFY | UI、逻辑、样式 |
| `proxy-server.js` | MODIFY | 可能需要优化 /ping 并发处理 |

## 工作量估算
- 预计开发时间：4-5 小时
- 复杂度高，涉及定时任务、状态管理、UI 更新

## 测试用例
1. 启用健康监控后节点状态更新
2. 禁用后停止检测
3. 刷新页面后状态恢复
4. 验证失效节点正确标记
