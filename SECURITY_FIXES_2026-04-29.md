# RelayBox 安全与 Bug 修复报告

> 日期: 2026-04-29
> 范围: 全项目安全审计、逻辑 Bug 修复、复核回归测试

---

## 已修复的问题

### 1. `parseServerPort` 空端口校验 (Critical)

**文件:** `src/utils/parsers.js:78-105`

**问题:** 输入 `"example.com:"` 时 port 为空字符串，若直接数值化会变成 `0`，可能生成无效节点。

**修复:** 端口必须是非空纯数字字符串，且范围为 1-65535，否则返回空解析结果。

---

### 2. `parseVmess` 必填字段校验 (High)

**文件:** `src/utils/parsers.js:122-138`

**问题:** VMess JSON 缺少 `add`、`id` 或合法 `port` 时，会构造出字段不完整的节点。

**修复:** 构造后立即校验 `server`、`uuid`、`port`，任一无效则返回 `null`。

---

### 3. `dedupeProxyNames` 名称冲突 (High)

**文件:** `src/utils/proxySanitizer.js:47-62`

**问题:** 订阅中若已有节点叫 `"A (1)"`，同时又有多个 `"A"`，去重后可能再次撞名。

**修复:** 使用 `Set` 追踪已用名称，生成新名时持续递增后缀直到唯一。

---

### 4. `replaceProxyGroupNames` 正则越界替换 (High)

**文件:** `src/composables/useConfig.js:189-208`

**问题:** 原先按正则替换策略名，可能误匹配规则 value 字段中的文本，导致规则内容被破坏。

**修复:** 使用 `splitRuleByTopLevelCommas` 定位最后一个 policy 字段，只替换策略位。

---

### 5. `testAllNodesLatency` 竞态条件 (High)

**文件:** `src/composables/useNodes.js:150-220`

**问题:** 单个测速 promise 异常时可能导致 `isTesting` 状态卡住。

**修复:** 测速入口先校验 server/port，单项 promise 增加 `.catch()`，避免队列中断。

---

### 6. 代理解析端口范围校验 (Medium)

**文件:** `src/utils/parsers.js:67-75`, `247-266`, `367-389`, `480-498`, `656-658`, `677-801`

**问题:** 多个协议解析路径缺少 1-65535 范围校验。Hysteria、Hysteria2、TUIC 还会把显式非法端口 `:0` 误当成缺省端口并落成 443。

**修复:** URL 类协议、AnyTLS、SSR 等解析路径复用 `validatePort`；VMess 与 SS 保留各自校验；Hysteria、Hysteria2、TUIC 使用 `validatePortOrDefault`，只有端口缺省时默认 443，显式非法端口返回 `null`。

---

### 7. `sanitizeImportedProxy` 端口校验 (Medium)

**文件:** `src/utils/proxySanitizer.js:27-33`

**问题:** 导入 Clash 配置时，超范围端口和非整数端口可能被保留。

**修复:** 校验 `Number.isInteger(port) && port >= 1 && port <= 65535`。

---

### 8. Ping 端点端口校验 (Medium)

**文件:** `proxy-server.js:377-389`

**问题:** `/ping` 直接把请求端口传给 `socket.connect`，缺少范围校验。

**修复:** 加入整数和 1-65535 范围校验，无效端口返回 400。

---

### 9. `Object.assign(form, savedConfig)` 原型污染 (Medium)

**文件:** `src/App.vue:959-966`, `1814`, `1827`

**问题:** 从 localStorage 或桌面状态加载的数据直接合并进 form，可能引入 `__proto__` 等非预期键。

**修复:** 使用 `assignFormSafely` 只拷贝 `formDefaults` 白名单内的字段。

---

### 10. `watch(form)` 同步写入过频与卸载丢尾写 (Medium)

**文件:** `src/App.vue:1015-1032`, `1845-1855`

**问题:** 每次表单变更都同步写 localStorage 会造成频繁 I/O；加入 debounce 后，组件卸载前若只清 timer 又会丢失最后一次 pending payload。

**修复:** 写入改为 300ms debounce，并抽出 `persistConfigNow()`；卸载前若存在 pending timer，先清 timer 再立即 flush 一次。

---

### 11. `isInformationalNode` 匹配过于激进 (Medium)

**文件:** `src/utils/nodeMetadata.js:1-8`

**问题:** 信息节点识别规则匹配范围过宽，可能误杀合法节点。

**修复:** 将多个模式收紧为开头锚定或完全匹配。

---

### 12. `/fetch` 上游响应无大小限制 (Medium)

**文件:** `proxy-server.js:269-282`

**问题:** `upstream.pipe(res)` 是流式转发，不会把完整响应攒进内存，但恶意上游可无限制占用带宽和连接资源。

**修复:** 监听 `data` 累计字节数，超过 10MB 时 destroy 上游流。若响应头尚未发出则返回 502；若头已经发出则结束响应体进行截断。

---

### 13. IPv6 Zone ID SSRF 清理 (Medium)

**文件:** `proxy-server.js:59-62`

**问题:** IPv6 zone ID 如 `fe80::1%eth0` 若未剥离，会影响后续 IP 解析和 SSRF 判断。

**修复:** 在 `net.isIP` 校验前剥离 `%...` zone ID。

---

### 14. IPv6 link-local SSRF 范围判断 (Medium)

**文件:** `proxy-server.js:96-99`

**问题:** IPv6 link-local 是 `fe80::/10`，不只是 `fe80` 字面前缀；`fe90::1`、`febf::1` 也应被拦截。

**修复:** 解析首个 hextet，按位判断 `fc00::/7` 与 `fe80::/10`，`/fetch` 和 `/ping` 在连接前统一拒绝。

---

### 15. `highlightYaml` HTML 结构与注释识别 (Low)

**文件:** `src/utils/helpers.js:14-134`

**问题:** 旧实现先插入 span 再继续跑 string/comment 正则，可能把 span 属性值再次高亮并破坏 HTML；带空格井号的 quoted string 也可能被误判成注释。

**修复:** 改为逐行处理：先按引号状态找到真实注释位置，再分别转义 key/value/comment 并注入 span，不再对已生成的 HTML 重新跑正则。

---

### 16. 日志信息泄露 (Low)

**文件:** `proxy-server.js:304-305`

**问题:** 代理请求失败时不应输出用户请求 URL。

**修复:** 日志只保留错误消息，不打印目标 URL。

---

### 17. Clash 规则策略字段空格回归 (Medium)

**文件:** `src/utils/clashConfigValidator.js:27-31`

**问题:** 规则拆分改用 `splitRuleByTopLevelCommas` 后丢失 trim，`MATCH, G` 会把策略识别为 `" G"`。

**修复:** `getRulePolicy` 对拆分结果统一 trim，兼容手写规则中的常见空格。

---

## 已缓解（有残余讨论点）

| # | 问题 | 现状 | 残余讨论点 |
|---|------|------|------------|
| 18 | Ping SSRF TOCTOU | DNS lookup 后用 `addresses[0].address` 直连 socket（`proxy-server.js:411-428`），传入的是已解析 IP 字符串，不触发域名重解析 | 初次 DNS 结果可信度与多地址选择策略；当前取第一个已校验地址 |

---

## 不需要修复（确认安全或当前可接受）

| # | 问题 | 原因 |
|---|------|------|
| 19 | `v-html` XSS | `highlightYaml` 对原始 YAML 内容先做 HTML 转义，再注入固定 span 标签 |
| 20 | SNI 冗余字段 | Clash Meta 兼容设计，`servername` 与 `sni` 双字段并存是可接受做法 |
| 21 | `splitRuleByTopLevelCommas` 引号 | 当前 Clash 规则输入不依赖带逗号的 quoted policy；规则策略字段 trim 已补回 |
| 22 | Config Store 速率限制 | 本地工具场景；请求 body 限制 1MB，存储上限 1000 条，配置 10 分钟自动过期 |

---

## 新增复核覆盖

- `tests/parsers.test.js`: Hysteria/Hysteria2/TUIC 显式非法端口拒绝，缺省端口默认 443。
- `tests/clash-config-validator.test.js`: `MATCH, G`、`DOMAIN, example.com, G` 策略 trim。
- `tests/proxy-server.test.js`: `/fetch` 与 `/ping` 拦截 `fe80::/10`。
- `tests/helpers.test.js`: `highlightYaml` 不破坏 span 属性，不误判 quoted `#`。
- `tests/app-persistence.test.js`: 卸载前 flush pending localStorage 写入。
- `scripts/review-heartbeat.mjs`: 自动复核安全报告、YAML 高亮、非法端口、规则 trim、IPv6 link-local 拦截，并可串联 `npm test`。
