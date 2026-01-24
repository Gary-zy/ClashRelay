Clash 链式代理配置生成器
1. 项目概述 (Project Overview)
本项目旨在开发一个轻量级的 Web 工具（单页应用或简单后端），用于自动化生成支持“中继/链式代理” (Relay/Chain Proxy) 的 Clash 配置文件。

用户输入机场订阅地址和自定义 Socks5 落地节点信息，系统自动解析订阅，允许用户选择“前置跳板节点”，并生成包含 DNS 优化、策略组分流的完整 Clash config.yaml 文件。

2. 用户流程 (User Flow)
输入源信息：用户在界面输入机场订阅链接 (Subscription URL) 和 Socks5 配置信息 (IP, Port, User, Pass)。

获取与解析：点击“获取节点”按钮。系统拉取订阅内容，解析出所有可用节点名称。

选择跳板：系统在一个下拉列表中展示机场的所有节点，用户选择一个（例如：“🇭🇰 香港01”）作为 dialer-proxy（拨号/跳板代理）。

生成配置：点击“生成配置”按钮。系统将机场节点、Socks5 节点（绑定跳板）、策略组、DNS 规则组装成 YAML。

导出/下载：用户可以预览生成的 YAML 代码，点击“复制”或“下载文件”。

3. 功能需求 (Functional Requirements)
3.1 输入模块 (Input Module)
界面需提供以下输入框：

机场订阅地址：URL 输入框。

Socks5 落地节点信息：

Server (IP/Domain)

Port

Username (可选)

Password (可选)

别名 (Alias)：给这个节点起个名字，如“🇺🇸 美国家宽-出口” 。

3.2 解析模块 (Parser Module)
订阅获取：支持通过 HTTP GET 请求获取订阅内容。

注意：如果是纯前端实现，需处理 CORS (跨域) 问题，或允许用户直接粘贴订阅文本。

格式解码：支持 Base64 解码（常见 V2Ray/SS 订阅格式）或直接解析 YAML 格式订阅。

节点提取：从订阅中提取所有 Proxy 节点对象。

3.3 配置组装模块 (Assembler - 核心逻辑)
系统需按照以下模板逻辑组装数据：

基础设置 (Basic)：

Port, Socks-Port, Allow-Lan, Mode, Log-Level 固定为常用推荐值。

DNS 配置 (DNS)：

使用 Fake-IP 模式，配置国内 (223.5.5.5) 和国外 (DoH) 对应的 NameServer，防止 DNS 污染。

代理节点列表 (Proxies)：

列表 A：填入从机场订阅解析出的所有节点。

列表 B：填入用户提供的 Socks5 节点。

关键逻辑：在该 Socks5 节点的配置中，必须自动插入 dialer-proxy: "用户选定的跳板节点名称"。

策略组 (Proxy Groups)：

组 A (AI/Google - 尊享组)：默认选中上述生成的 Socks5 节点。

组 B (其他外网 - 兜底组)：包含 Socks5 节点 + 机场原有节点 + DIRECT。

3.4 输出模块 (Output Module)
代码预览：提供一个文本域显示生成的 YAML。

一键复制：点击按钮复制内容到剪贴板。

下载文件：点击按钮下载 config.yaml 文件。