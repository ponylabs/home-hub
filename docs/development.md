# 开发与运行

## 环境与启动

需要 Node.js 22.13+、npm、Git。Node 内置 SQLite 在部分版本会输出实验性提示。Harness 检查需要 Python 3.10+，业务服务不依赖 Python。依赖版本以 package-lock.json 为准。

仓库根目录运行 `npm ci`，然后 `npm run dev` 同时启动 Vite（127.0.0.1:5173）与 API（127.0.0.1:3001）。若修改 API 端口，同步修改 vite.config.ts 的代理。开发服务只绑定本机。

生产运行先停止开发服务，再执行：

```sh
npm run build
npm start
```

打开[生产服务](http://127.0.0.1:3001/)。单个 Node 进程提供静态页面与 API，无需 Vite；不要让多个实例共同写入同一数据库。

## 配置

用 `cp .env.example .env` 创建本地配置并编辑，修改后重启。密钥不提交到 Git。[示例文件](../.env.example)拥有变量名称与默认值。

- 模型：同时设置 AI_API_KEY 与 AI_MODEL，按服务商设置 AI_BASE_URL（到 /v1，不包含 /chat/completions）。模型须支持 tools/function calling。未配置时为本地有限语法；配置后服务失败明确报告，不自动降级。模型会收到设备状态与最近对话。
- 中枢：同时设置 HA_URL 和长期访问令牌 HA_TOKEN，在“接入与模型”同步。设备初始房间为“未分配”，可在详情修改。硬件须已接入中枢；本平台不执行无线配对。实现依照 [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)，调用 service 并回读，不通过写 states 假装控制硬件。
- 模拟：DEMO_MODE=false 禁止首次演示初始化与新增模拟设备，不删除已有数据。要切换到纯真实设备，使用新的 DATABASE_PATH。
- 局域网：生产服务设置 HOST=0.0.0.0 和高强度 HUB_API_TOKEN；网页输入相同令牌，仅保存在浏览器会话。默认没有公网部署、权限分级和 TLS 终止；跨不可信网络前需要 HTTPS 与网络访问控制。

## 外部 Agent 与 MCP

先启动 API，然后构建。在支持 MCP 的客户端加入配置，替换绝对路径：

```json
{
  "mcpServers": {
    "home-hub": {
      "command": "node",
      "args": [
        "--env-file-if-exists=/absolute/path/home-hub/.env",
        "/absolute/path/home-hub/dist/server/mcp.js"
      ],
      "env": { "HUB_URL": "http://127.0.0.1:3001" }
    }
  }
}
```

如启用 HUB_API_TOKEN，MCP 进程必须读取同一令牌。源码调试可在项目目录执行 `npm run --silent mcp`；silent 防止 npm 输出污染 stdio 协议。

HTTP 客户端可通过 GET /api/agent/tools 发现工具，通过 POST /api/agent/execute 发送 `{ "name": "工具名", "arguments": {} }`。先 get_home，再用返回的设备/场景 ID 调用；精确 schema 由[工具定义](../server/agent.ts)拥有。结果未知时先检查状态，不自动重发。

## 数据与恢复

默认数据库为 data/home-hub.sqlite；data 和 .env 均已忽略。备份前停止服务，复制整个数据目录，包括可能存在的 WAL；不要在运行时只复制主数据库。重启保留状态、房间、场景和对话。

真实命令超时不代表没有副作用。先同步设备并查看记录，再决定后续动作。场景部分完成时，已完成步骤不会自动回滚。端口占用时先确认是否已有本项目服务，不终止未知进程。中枢连接失败时检查地址、令牌和网络；模型错误不会展示原始响应或密钥。

## 修改与交付

读取 [AGENTS](../AGENTS.md) 与实际目标规则；新增能力同时维护共享类型、运行时校验、适配器、控件及拒绝路径测试。基础控件复用 Mantine，见[样式约定](web-styling.md)。检查入口见[测试说明](testing.md)。

业务代码维护在 [ponylabs/home-hub](https://github.com/ponylabs/home-hub)，不能把业务改动推送到 harness-seed。尚未对外发布。
