# 栖居 · Home Hub

本地运行的智能家居管理平台。用同一套设备模型连接手动控制、生活场景与 AI Agent，让不同品牌的设备可以在一个界面中操作。

本项目从 [Harness Seed](https://github.com/ponylabs/harness-seed) 的 `1cb7fc55636c587b7c1070b7424f4abec166b2f1` 独立派生，保留 Agent 开发规范、按需 Skill 和文档检查。模板远程地址已移除，不向模板推送业务改动。Harness 是开发协作基础，家居控制与运行时 Agent 由本项目实现。

## 立即运行

需要 Node.js 22.13+ 和 npm，无需硬件、账号或模型密钥：

```sh
npm ci
npm run dev
```

打开[本地控制台](http://127.0.0.1:5173/)。试试手动关灯、点击户型中的房间，或发送“观影模式”“关闭客厅主灯”“客厅空调调到26度”。默认设备明确标注为模拟，状态保存到本地 SQLite。

## 当前能力

- 深色三栏控制面板：环境与导航、示例户型、设备速控与对话；基础控件复用 Mantine。
- 灯光、空调、窗帘、插座和温湿度模拟设备；可添加设备、修改房间、搜索与筛选。
- 预置场景及保存当前状态的自定义场景；操作记录区分来源和成功、失败、待确认结果。
- 本地有限指令解析；配置支持工具调用的 Chat Completions 兼容模型后启用自然语言对话。
- Home Assistant 桥接适配器、MCP 工具入口；网页与 Agent 共用能力校验和控制服务。

首版完成无硬件运行链路。真实 Home Assistant、真实模型服务尚未联调；模拟品牌与协议名不代表已实现原生 Zigbee/Matter/蓝牙配对。示例户型不对应用户真实住宅。

## 项目入口

- [开发说明](docs/development.md)：生产运行、模型/中枢配置、MCP 接入与备份。
- [架构与后续阶段](docs/architecture.md)：模块边界、控制保证和当前限制。
- [测试说明](docs/testing.md)：检查命令与验证边界。
- [样式约定](docs/web-styling.md)、[形状规范](docs/ui-radius.md)、[Agent 约定](AGENTS.md)与[来源许可](THIRD_PARTY_NOTICES.md)。

完整本地检查为 `npm run check`，Harness 检查另需 Python 3.10+。[项目仓库](https://github.com/ponylabs/home-hub)的 GitHub Actions 已配置业务测试、构建与文档检查，运行结果见 [Actions](https://github.com/ponylabs/home-hub/actions)。
