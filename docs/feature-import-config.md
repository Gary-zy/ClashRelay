# 导入已有配置功能开发文档

## 功能概述
支持导入现有 Clash 配置文件进行修改，方便用户基于现有配置进行调整。

## 技术方案

### 1. 功能范围
- 支持拖拽上传或文件选择
- 解析 YAML 结构
- 提取关键信息填充表单

### 2. 数据提取逻辑

```javascript
const parseClashConfig = (yamlText) => {
  const config = yaml.load(yamlText);
  
  return {
    // 基础设置
    port: config.port,
    socksPort: config['socks-port'],
    allowLan: config['allow-lan'],
    mode: config.mode,
    
    // DNS 设置
    dnsMode: config.dns?.['enhanced-mode'],
    domesticDns: config.dns?.nameserver?.join(', '),
    foreignDns: config.dns?.fallback?.join(', '),
    
    // 节点列表
    proxies: config.proxies || [],
    
    // 策略组
    proxyGroups: config['proxy-groups'] || [],
    
    // 规则
    rules: config.rules || [],
  };
};
```

### 3. UI 变更

#### [MODIFY] App.vue
```vue
<!-- 文件上传区域 -->
<el-upload
  drag
  accept=".yaml,.yml"
  :auto-upload="false"
  :on-change="handleConfigImport"
>
  <el-icon><Upload /></el-icon>
  <div>拖拽配置文件到此处，或点击上传</div>
</el-upload>
```

### 4. 核心逻辑

```javascript
const handleConfigImport = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = parseClashConfig(e.target.result);
      
      // 填充节点列表
      nodes.value = parsed.proxies;
      
      // 填充规则
      customRules.value = parsed.rules.filter(r => !r.startsWith('MATCH'));
      
      // 尝试识别 Socks5 落地节点
      const socks5Node = parsed.proxies.find(p => p.type === 'socks5');
      if (socks5Node) {
        form.socksServer = socks5Node.server;
        form.socksPort = socks5Node.port;
        form.socksUser = socks5Node.username || '';
        form.socksPass = socks5Node.password || '';
        form.socksAlias = socks5Node.name;
      }
      
      status.message = `成功导入配置：${parsed.proxies.length} 个节点，${parsed.rules.length} 条规则`;
      status.type = "success";
    } catch (error) {
      status.message = "配置解析失败：" + error.message;
      status.type = "error";
    }
  };
  reader.readAsText(file.raw);
};
```

### 5. 边界处理
- 不完整的配置文件
- 格式错误的 YAML
- 不支持的节点类型
- 重复的节点名称

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/App.vue` | MODIFY | UI、解析逻辑 |

## 工作量估算
- 预计开发时间：3-4 小时
- 复杂度高，需要处理各种配置格式

## 测试用例
1. 导入标准 Clash 配置
2. 导入只有节点的配置
3. 导入格式错误的文件
4. 验证节点、规则正确提取
