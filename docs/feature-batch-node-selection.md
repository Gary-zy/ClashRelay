# 批量节点选择功能开发文档

## 功能概述
允许用户选择多个节点作为"前置跳板组"，而非单个固定节点。生成的配置将包含一个 `url-test` 或 `select` 类型的策略组作为 dialer-proxy。

## 技术方案

### 1. 数据结构变更

```javascript
// 当前：单选
form.dialerProxy = "香港01"

// 变更后：多选
form.dialerProxyGroup = ["香港01", "香港02", "日本01"]
form.dialerProxyType = "url-test" // 或 "select"
```

### 2. UI 变更

#### [MODIFY] App.vue - 模板部分
- 将 `<el-select>` 改为支持 `multiple` 属性
- 增加策略组类型选择（url-test / select / fallback）
- 增加测试 URL 和测试间隔配置（仅 url-test 需要）

```vue
<el-select v-model="form.dialerProxyGroup" multiple placeholder="选择跳板节点（多选）" filterable>
  <!-- 节点选项 -->
</el-select>
<el-radio-group v-model="form.dialerProxyType">
  <el-radio value="url-test">自动选择（url-test）</el-radio>
  <el-radio value="select">手动选择（select）</el-radio>
  <el-radio value="fallback">故障转移（fallback）</el-radio>
</el-radio-group>
```

### 3. 配置生成逻辑变更

#### [MODIFY] generateYaml 函数
- 如果 `dialerProxyGroup.length > 1`，生成一个前置跳板策略组
- Socks5 节点的 `dialer-proxy` 指向该策略组名称

```yaml
# 生成的策略组示例
proxy-groups:
  - name: "🔀 前置跳板组"
    type: url-test
    proxies:
      - 香港01
      - 香港02
      - 日本01
    url: "http://www.gstatic.com/generate_204"
    interval: 300
```

### 4. 表单验证
- 至少选择一个跳板节点
- 策略组名称不能与现有节点名称冲突

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | MODIFY | 表单UI、数据结构、生成逻辑 |

## 工作量估算
- 预计开发时间：2-3 小时
- 涉及核心逻辑，需仔细测试

## 测试用例
1. 选择单个节点 → 行为与原来一致
2. 选择多个节点 → 生成策略组
3. 验证 url-test/select/fallback 三种类型
4. 验证生成的 YAML 可被 Clash 正常解析
