# 开发约定

## 开始工作

先读 [README](README.md)，再沿目标路径读取适用的子 AGENTS 和模块说明。遵守宿主指令优先级，不假定子目录规则会自动加载；不要全仓加载无关资料。范围以用户当前目标为准，建议不等于实施授权。

本仓库是独立的 Home Hub 业务项目，已从 Harness Seed 初始化。普通功能开发不重新初始化，也不向模板仓库推送业务代码。模块与当前范围见[架构说明](docs/architecture.md)，运行入口见[开发说明](docs/development.md)。

## 始终适用

- 核实实现、配置和测试再描述事实；发现实现与约束冲突时报告，不擅自改掉约束。
- 明确当前改动与验收条件；按风险验证真实行为，缺陷优先建立失败复现。通过、失败、未运行分别说明。
- 同一变更维护受影响的长期知识，允许零文档修改。已确认的未完成选择与阻塞要能从仓库入口找回；完成后收敛，不保存聊天流水。
- 不削弱测试、吞掉失败或放宽预算换取通过。局部规则留在局部；新增规则、检查或决策须说明必要性和适用范围，不能用本次新增规则证明自身合理。
- 修改后重新评估验证证据；模板检查不替代业务检查，本地通过不等于远端 CI 通过。
- 提交前检查差异、秘密与无关文件，中文说明目的。推送、发布、历史重写、权限与生产操作按明确授权执行。

## 按任务读取 Skill

先读匹配的主文件，再只加载其要求的参考。宿主不自动发现时，使用下列路径；下列路由不是每次必须全量执行的流水线。

| 任务或风险 | 入口 |
| --- | --- |
| 仅用户明确要求重新派生新项目时 | [初始化](.agents/skills/seek-initialize/SKILL.md) |
| 项目事实、结构或文档生命周期 | [文档维护](.agents/skills/seek-doc/SKILL.md) |
| 文字、注释、提示词的完整性与精简 | [表达标准](.agents/skills/seek-prose/SKILL.md) |
| Notes 取代、保留、删除与归档 | [Agent Notes](.agents/skills/seek-notes/SKILL.md) |
| 实现、接口、测试、规则和文档变更审查 | [代码审查](.agents/skills/seek-code-review/SKILL.md) |
| 提交推送前检查与证据失效判断 | [验证](.agents/skills/seek-verify/SKILL.md) |
| 失败、副作用、重试、取消与降级 | [错误处理](.agents/skills/seek-error-handling/SKILL.md) |
| 并发、时序、资源与不稳定测试 | [测试可靠性](.agents/skills/seek-test-reliability/SKILL.md) |
| 界面、交互与视觉设计和审查 | [界面](.agents/skills/seek-ui/SKILL.md) |
| 设计 Skill、上下文加载、工作流或模型可见工具 | [Agent 体验](.agents/skills/seek-agent-experience/SKILL.md) |
| 不同屏幕、输入方式与响应式适配 | [响应式界面](.agents/skills/seek-responsive-ui/SKILL.md) |
| 有依据地寻找简化与删除机会 | [简化分析](.agents/skills/seek-find-simplifications/SKILL.md) |
| 清理文字中的会话、审查过程残留 | [过程残留清理](.agents/skills/seek-trim-cot-leakage/SKILL.md) |
| 性能定位、基准与优化 | [性能分析](.agents/skills/seek-speed-up-perf/SKILL.md) |
| 编写或更新 PR 说明 | [PR 说明](.agents/skills/seek-pr-description/SKILL.md) |
| 已授权的依赖 PR 链处理 | [依赖 PR](.agents/skills/seek-merging-stacked-prs/SKILL.md) |
| 对外破坏性变化与升级说明 | [升级指南](.agents/skills/seek-create-upgrade-guide/SKILL.md) |
| 录制真实界面演示 | [界面录制](.agents/skills/seek-record-browser-gif/SKILL.md) |

扩展翻译流程只允许用户明确按名称调用 `seek-translate-docs`；其他 Skill 不得自动选择或加载它。普通多语言同步按项目已有文档约定处理，不因此启动扩展流程。

## 本仓库验证

命令与覆盖范围见 [测试说明](docs/testing.md)。基础检查、Skill 格式和真实 Agent 场景分别报告；不得把前两者通过说成模型始终正确。涉及上游改编时同步[来源与许可](THIRD_PARTY_NOTICES.md)及[迁移映射](docs/upstream-mapping.md)。

交付完整业务变更运行 `npm run check`。网页、对话和 MCP 的设备写入必须经过统一控制服务；新增能力同时维护运行时校验、适配器和拒绝路径测试。模拟数据不得表述为真实设备数据，未知控制结果不得标为成功。基础 UI 复用 Mantine 并遵守[样式说明](docs/web-styling.md)。

## 普通开发

确认仓库、分支、已有修改和可观察验收，沿实际接口与消费者实施最小必要变更。先复现缺陷，按风险读取上表方法；长期选择按 [Notes 规范](.agents/notes/README.md) 记录，当前事实原位更新。可机械检查的约束接入实际执行的检查入口，并以无效样本证明会失败；使用窄范围且有依据的例外，不全局关闭规则。交付前检查最终差异，分别报告通过、失败、未运行和剩余责任。文档名称与创建条件以 [文档约定](docs/AGENTS.md) 为准。
