# 测试与验证

## 本地入口

安装依赖后在仓库根目录运行：

```sh
npm run check
git diff --check
```

check 依次运行业务测试、类型检查与生产构建、Harness 检查和 Python 回归测试。Harness 解释器自动选择 Python 3.10+，也可设置 PYTHON 指定绝对路径。精确命令由 [package.json](../package.json)拥有。

| 入口 | 覆盖 |
| --- | --- |
| npm test | 实际 Fastify 路由与 SQLite 的控制、拒绝路径、场景、重启、认证、HA 映射、模型工具和 MCP stdio 集成 |
| npm run typecheck | 浏览器、共享类型和服务端 TypeScript |
| npm run build | 类型检查、Vite 静态资源和 Node 服务端产物 |
| npm run check:harness | 固定入口、Skill、Notes 和本地 Markdown 文件链接，不证明业务或模型语义正确 |

业务用例见 [server/app.test.ts](../server/app.test.ts)。每项使用独立内存库或临时目录；MCP 用例绑定系统分配的 loopback 端口，启动真实 SDK 客户端和 stdio 进程并清理资源。并发用例通过屏障控制交错，不使用 sleep。HA 与模型远端响应为测试替身，不连接真实设备或收费服务。

编码路由认证和工具失败后停止执行的回归用例，在修复前曾由真实 npm test 入口报告失败，修复后通过。不能只以结构检查替代这类行为证据。

## 浏览器与构建产物

启动实际服务并观察操作状态及记录：

1. 切换电源、调整滑块，刷新后核对持久化状态。
2. 点击户型房间，核对速控与导航筛选。
3. 添加设备、搜索、修改房间，核对列表变化。
4. 保存当前状态为场景，改变设备后执行并核对恢复。
5. 对话执行“观影模式”，核对回执；否定句不产生操作。
6. 检查桌面、平板和 360px 窄屏、弹层焦点与 Escape、长文本和空结果。
7. 单独启动构建产物，检查页面、资源与 API；不存在的 API 不返回 HTML。

浏览器验收为人工/Agent 驱动，没有提交自动浏览器回归脚本；截图不能证明未查看的视口与辅助技术。

## CI 与边界

[GitHub Actions](../.github/workflows/check.yml)运行同样的 Node 测试、构建与 Harness 检查，并检查跟踪文件的空白错误。远端结果以[项目 Actions](https://github.com/ponylabs/home-hub/actions)中对应提交的运行结果为准，本地通过不代表远端通过。

真实 HA、真实模型、原生无线协议、多实例、跨家庭权限、长期故障恢复、全部浏览器和跨会话 Agent 行为未验证。模板检查不证明 Agent 必然读取或遵循规则。

小米接入回归见 [server/xiaomi.test.ts](../server/xiaomi.test.ts)：通过真实 HTTP 路由与 SQLite 验证来源筛选、选择变更、导入事务、元数据保留、统一控制、离线恢复及认证失败。HA 的模板与设备响应为测试替身；这些用例不证明米家账号授权、官方集成安装或真实设备控制已经联调。

Harness 归档冻结仍使用可信基准：本地默认 HEAD，CI 使用 PR base 或 push before SHA。相关覆盖见 [Notes 规范](../.agents/notes/README.md)和[上游映射](upstream-mapping.md)。
