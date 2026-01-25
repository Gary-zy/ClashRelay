# 订阅定时刷新功能开发文档

## 功能概述
可设置定时自动拉取订阅更新节点列表，保持节点信息最新。

## 技术方案

### 1. 数据结构

```javascript
// 新增配置项
form.autoRefresh = false          // 是否启用自动刷新
form.refreshInterval = 30         // 刷新间隔（分钟）
form.lastRefreshTime = null       // 上次刷新时间

// 运行时状态
const refreshTimer = ref(null)    // 定时器引用
```

### 2. UI 变更

#### [MODIFY] App.vue - 高级选项区域
```vue
<el-divider content-position="left">订阅自动刷新</el-divider>
<el-form-item>
  <el-switch v-model="form.autoRefresh" active-text="启用自动刷新" />
</el-form-item>
<el-form-item v-if="form.autoRefresh" label="刷新间隔（分钟）">
  <el-input-number v-model="form.refreshInterval" :min="5" :max="1440" />
</el-form-item>
<div v-if="form.lastRefreshTime" class="helper-text">
  上次刷新：{{ formatTime(form.lastRefreshTime) }}
</div>
```

### 3. 核心逻辑

#### [MODIFY] App.vue - Script 部分
```javascript
// 启动/停止刷新定时器
watch(
  () => form.autoRefresh,
  (enabled) => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value);
      refreshTimer.value = null;
    }
    if (enabled && form.subscriptionUrl) {
      refreshTimer.value = setInterval(() => {
        handleFetch();
        form.lastRefreshTime = new Date().toISOString();
      }, form.refreshInterval * 60 * 1000);
    }
  }
);

// 页面卸载时清除定时器
onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }
});
```

### 4. 持久化
- `autoRefresh`、`refreshInterval` 需要保存到 localStorage
- `lastRefreshTime` 可选保存

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | MODIFY | 配置项、UI、定时器逻辑 |

## 工作量估算
- 预计开发时间：1-2 小时
- 复杂度中等

## 注意事项
- 刷新间隔最小 5 分钟，避免请求过于频繁
- 页面关闭后定时器失效（纯前端无法后台运行）
- 刷新失败需要有错误提示
