# RelayBox Review Findings - Second Pass - 2026-04-28

本文档记录对上一轮 4 个 finding 修复后的二次复查结果。

## 总结

上一轮问题中，以下项目本机验证基本通过：

- `/fetch http://localhost:<port>` 现在返回 `403`。
- `/ping localhost` 与 `/ping 127.0.0.1` 现在返回 `403`。
- 非白名单 `Origin` 请求现在会直接返回 `403`。
- 超过 1MB 的 `/config/upload` 现在正常返回 `413`。
- `package-lock.json` 根依赖中的 `latest` 约束已清除。
- `proxy-server.js` 已为 LF。
- `CLAUDE.md` Node.js 版本说明已更新。

但 SSRF 防护仍有未闭环问题，尤其 `/ping` 仍可通过 IPv4-mapped IPv6 十六进制地址访问本机回环地址。

## Finding 1: /ping 仍可用 IPv4-mapped IPv6 十六进制绕过

- 文件：`proxy-server.js`
- 位置：`36-39`
- 优先级：P0

`localhost` 和 `127.0.0.1` 现在能被拦住，但 `/ping` 仍接受 `::ffff:7f00:1` 这类 IPv4-mapped IPv6 十六进制写法。

实测结果：

```text
/ping ::ffff:7f00:1 { status: 200, body: '{"latency":23,"tcpTime":1,"status":"ok"}' }
/ping ::ffff:127.0.0.1 { status: 403, body: '{"error":"Access to private/reserved IP addresses is not allowed"}' }
```

其中 `::ffff:7f00:1` 对应 IPv4 回环地址 `127.0.0.1`，但当前正则没有识别，导致本地端口可被探测。

建议：

- 不要只靠字符串正则匹配 IP。
- 使用严格 IP 归一化。
- 对 IPv4-mapped IPv6 先转换成对应 IPv4，再按私网、回环、链路本地、保留网段判断。
- `/ping` 的 `socket.connect` 前必须用归一化后的地址校验结果做准入。

## Finding 2: DNS 校验和实际连接仍是两次解析

- 文件：`proxy-server.js`
- 位置：`167-175`
- 优先级：P1

当前代码先执行 `resolveAndCheck(hostname)`，随后 `handler.get(targetUrl)` 又让 Node 自己解析一次目标地址。

这意味着 DNS 校验和实际连接不是同一次解析结果，仍存在 DNS rebinding / TOCTOU 窗口。上一轮建议中的“在 `http` / `https` 请求里使用受控 `lookup`”还没有真正实现。

建议：

- 把校验通过的解析结果用于请求阶段。
- 或者给 `http.get` / `https.get` 传入自定义 `lookup`。
- 自定义 `lookup` 内部复用同一套私网地址校验。
- 不要出现“先查一次确认安全，真正连接时再由运行时查一次”的分离路径。

## 已执行验证

```bash
npm test
npm run build
npm run verify:clash
```

验证结果：

- `npm test`：58/58 通过。
- `npm run build`：成功。
- `npm run verify:clash`：成功，4 个 RelayBox 配置均通过 mihomo 验证。

额外安全验证：

- `/fetch http://localhost:<port>` 返回 `403`。
- `/fetch http://127.0.0.1:<port>` 返回 `403`。
- `/ping localhost` 返回 `403`。
- `/ping 127.0.0.1` 返回 `403`。
- `/ping ::ffff:7f00:1` 返回 `200 ok`，仍可连接本机回环地址。
- 非白名单 `Origin` 请求 `/health` 返回 `403`。
- 白名单 `Origin` 请求 `/health` 返回 `200 ok`。
- 超过 1MB 的 `/config/upload` 返回 `413`。

## 其他注意点

- `git diff --check` 仍报告 `package.json` 与 `package-lock.json` 存在 CRLF / trailing whitespace。
- 该问题不影响功能运行，但提交前建议处理。

## 结论

上一轮 4 个问题里，CORS、超大请求返回 413、lockfile 约束同步等已经基本修复。

但 SSRF 防护还不能算完成：

- `/ping` 仍有 IPv4-mapped IPv6 十六进制绕过。
- `/fetch` / 重定向请求仍有 DNS 校验与实际连接分离的问题。

不建议在这两个问题修复前合并安全加固改动。
