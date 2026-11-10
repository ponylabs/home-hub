# 第三方来源与许可

Home Hub 从 [ponylabs/harness-seed](https://github.com/ponylabs/harness-seed) 的 `1cb7fc55636c587b7c1070b7424f4abec166b2f1` 派生，保留其适用 Skill、Notes 规范、文档契约及检查器，并调整继承测试的环境隔离。业务代码、运行说明和 CI 在独立项目中维护；未修改或推送模板仓库。

界面依赖 Mantine、React 和 Lucide；服务端及工具依赖 Fastify、Zod、MCP TypeScript SDK 等。具体包和版本以 `package-lock.json` 为准，各依赖许可随 npm 包保留。示例户型 SVG 为本项目创建，未复制用户参考图中的影视、人物或住宅素材。

本仓库的部分 Skill、参考材料和示例由 DeepSeek Harness 内容翻译、改写并去项目专属化而来，不是全部独立原创，也不是 DeepSeek 官方模板。

- 上游：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。
- 固定版本：[fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159](https://github.com/deepseek-ai/deepseek-harness/tree/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159)。
- 上游版权：Copyright (c) 2026 DeepSeek。
- 上游许可：MIT；[完整原文](LICENSES/DeepSeek-Harness-MIT.txt)随改编内容保留，不以中文摘要替代。
- 改编范围和排除理由见[迁移映射](docs/upstream-mapping.md)。

改编保留通用决策、失败分支、证据要求与示例；去除产品 API、固定包路径和技术栈命令，部分专题改为条件使用。适配后不承诺与上游完全等价。未复制上游签名或媒体编码脚本、产品图像及历史归档资料。Notes 检查与封存方法按上游单语言适配为 Python，具体覆盖见迁移映射。

复用或继续分发上游原文及实质改编内容时，应保留相应版权及许可。派生项目精简模板资料时，也不能删除仍适用于保留内容的第三方声明。Harness Seed 自行新增部分的统一开源许可尚待仓库所有者选择；本声明不替所有者授予额外权利。
