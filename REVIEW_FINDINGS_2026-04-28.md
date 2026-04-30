# RelayBox Review Findings - 2026-04-28

本文档记录对 `/Users/zhangyang/.claude/plans/bug-declarative-locket.md` 及当前工作区改动的复核结果。

## 总结

- `npm test` 本机验证通过：58/58。
- `npm run build` 本机验证通过。
- `npm run verify:clash` 本机验证通过。
- 但当前安全修复仍存在关键问题，尤其是 `/fetch` 与 `/ping` 的 SSRF 防护仍可被 `localhost` 和 DNS 解析绕过。

## Finding 1: SSRF 仍可用 localhost / DNS 解析绕过

- 文件：`proxy-server.js`
- 位置：`27-30`
- 优先级：P0

当前只用正则检查传入的 `hostname` 字符串，没有拦截 `localhost`，也没有解析域名后检查真实 IP。

实测结果：

- `/fetch?url=http://localhost:<内网端口>` 返回 `200 internal-ok`
- `/ping` 使用 `server: "localhost"` 也返回 `ok`

外部域名如果解析到 `127.0.0.1`、`10.x`、`169.254.x` 等私网地址，同样有风险。

建议：

- 对 hostname 使用 `dns.lookup({ all: true })`。
- 校验所有解析结果是否为私网、回环、链路本地、保留地址。
- 在 `http` / `https` 请求里使用受控 `lookup`，避免 DNS rebinding / TOCTOU。
- `/ping` 在 `socket.connect` 前也应先做同样的 DNS 解析与地址校验。

## Finding 2: CORS 白名单没有阻止请求本身

- 文件：`proxy-server.js`
- 位置：`41-48`
- 优先级：P1

`setCors` 只是不给非白名单 `Origin` 写 `Access-Control-Allow-Origin`，但请求仍会继续执行。

这意味着跨站页面虽然读不到响应，仍可触发本地 `/fetch` 或 `/config/upload` 这类有副作用的请求，造成 blind SSRF 或填满 `configStore`。

建议：

- 在路由入口对存在且不在白名单内的 `Origin` 直接返回 `403`。
- 不要只依赖浏览器 CORS 响应头来阻止请求执行。

## Finding 3: 超大请求并不会按计划返回 413

- 文件：`proxy-server.js`
- 位置：`62-64`
- 优先级：P2

`readBody` 超限后直接 `req.destroy()`，后续 `catch` 虽然尝试 `sendSafe(413)`，但连接已经断开。

实测结果：

- POST 超过 1MB 到 `/config/upload`
- 客户端得到 `TypeError fetch failed`
- 并没有收到计划中描述的 `413`

建议：

- 保留内存保护，但不要在需要返回 413 时直接销毁连接。
- 可以停止继续累积 body，并 drain / ignore 后续数据，再正常返回 `413`。
- 或者在计划文档中明确接受连接重置行为，不再声称会返回 `413`。

## Finding 4: package-lock 仍保留 latest 约束

- 文件：`package-lock.json`
- 位置：`10-23`
- 优先级：P2

`package.json` 已把依赖从 `latest` 固定为 `^x.y.z`，但 `package-lock.json` 根 package 里的依赖约束仍是 `latest`。

这会导致计划里“依赖版本全部为 latest 已修复”的描述不完整，也容易让后续审计和锁文件状态对不上。

建议：

- 运行会更新 lockfile 的 npm 操作，例如 `npm install --package-lock-only`。
- 提交前确认 `package-lock.json` 根 package 中不再出现这些 `latest` 约束。

## 其他注意点

- `proxy-server.js` 当前被转成 CRLF，`git diff --check` 报了大量 trailing whitespace。
- `.claude/settings.local.json` 是本地 Claude 权限配置，通常不建议提交。
- `CLAUDE.md` 仍写 Node.js `>= 18`，但本地 Vite 7 的 engines 是 `^20.19.0 || >=22.12.0`，文档建议同步更新。

## 已执行验证

```bash
npm test
npm run build
npm run verify:clash
```

额外安全验证：

- 本地启动内网 HTTP 服务。
- 通过 `/fetch?url=http://localhost:<port>/secret` 成功访问。
- 通过 `/ping` 请求 `localhost:<port>` 成功 TCP 连接。

结论：当前改动可以通过常规测试和构建，但 SSRF 防护仍不完整，不建议直接合并。
