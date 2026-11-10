# 上游迁移映射

本页保留 Harness Seed 的开发方法来源映射。Home Hub 基于 Harness Seed `1cb7fc55636c587b7c1070b7424f4abec166b2f1`，沿用下列 Skill；六个文档入口与 CI 已转为实际业务用途，运行时 Agent 不属于上游模板提供的实现。

当前对照版本为 DeepSeek Harness `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`；最初迁移基线为 `8bd073392eef6f54e921a093b95076248eb08cbb`。这是中文通用适配，不保证与上游完全等价；[来源和完整许可](../THIRD_PARTY_NOTICES.md)必须随改编内容保留。

优先保留上游职责和触发方式，去掉产品专属事实而不去掉关键判断。当前 UI 分级审查等方法来自上游后续版本，不视为原迁移时已有的全部内容。以下记录方法去向与适配边界，不表示全部已通过真实 Agent 场景验收。

## 独立入口与条件方法

通用专项方法保持独立 Skill 入口，不以十项为上限；任务路由见 [AGENTS](../AGENTS.md)。产品专属方法只在合适位置保留明确标记的通用参考，不把它们当作所有项目的强制架构。翻译扩展流程仅允许用户明确按名称调用，不能由其他 Skill 自动加载。

## 全部 Skill

### agent-experience

- 本轮去向：[seek-agent-experience](../.agents/skills/seek-agent-experience/SKILL.md)。
- 保留或提炼：最小初始上下文、显式可发现性、关键约束先出现、输出有界、相邻上下文和总工作量、参数规则归参数、信息单一归属；测量上下文成本。
- 剔除、替换与边界：无产品API；测量方法按宿主能力选择，不假造token结果。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/agent-experience/SKILL.md)

### cordis-styling-nitpicking

- 本轮去向：[seek-code-review 的资源生命周期参考](../.agents/skills/seek-code-review/references/resource-lifecycle.md)。
- 保留或提炼：从实际入口追踪资源所有者、注册、异步工作和清理依赖；用可达失败交错与终态证据支持发现。停止接收→等待已接收工作完成→释放依赖。
- 剔除、替换与边界：剔除Cordis API/当前disposer实现workaround、单例一律禁止、全部问题一律P0。按项目生命周期与实际影响分级；保留必要 durable mutation 与临时资源的区别。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/cordis-styling-nitpicking/SKILL.md)

### dsh-archive-agent-notes

- 本轮去向：[seek-notes](../.agents/skills/seek-notes/SKILL.md)。
- 保留或提炼：新增记录时检查取代关系；按未来决策价值保留/合并/归档，拒绝记录只有仍能防止真实误区才保留；历史事实不现代化；修复活动入链。
- 剔除、替换与边界：Notes 规范由 .agents/notes/README.md 与局部 AGENTS 拥有；归档 Skill 执行操作。沿用固定 Notes 树、状态、六类别和命名；保留单语言 Notes 规范与 Python 格式/封存检查，不迁移双语三件套和产品案例；不要求每个任务建notes。删除历史须有授权，记录价值不能仅按年龄或字数决定。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-archive-agent-notes/SKILL.md)

### dsh-ci-test-reliability

- 本轮去向：[seek-test-reliability](../.agents/skills/seek-test-reliability/SKILL.md)。
- 保留或提炼：执行拓扑、资源原子分配、全局状态隔离、平台语义、时间预算、状态同步、清理至静止、回归证明、禁止掩盖flaky、诊断证据。
- 剔除、替换与边界：替换Vitest、固定测试tier、DSH snapshot路径为项目实际runner/CI；保留真实并发和平台差异检查。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-ci-test-reliability/SKILL.md)

### dsh-client-ui-ux

- 本轮去向：[seek-ui](../.agents/skills/seek-ui/SKILL.md)。
- 保留或提炼：复用现有组件、视觉语义、toast/就地提示/空状态选择、加载状态、弹层与菜单安全、布局与平台适配。
- 剔除、替换与边界：剔除Cordis client层级、固定组件/设计token值/DSH页面路径；以项目设计系统为事实所有者。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-client-ui-ux/SKILL.md)

### dsh-code-review

- 本轮去向：[seek-code-review](../.agents/skills/seek-code-review/SKILL.md)。
- 保留或提炼：确认base/head与完整变更、要求来源、生产者/消费者、错误/并发/生命周期、拒绝路径绕过、测试断言证明力、发现证据与优先级。
- 剔除、替换与边界：替换产品规则/路径/命令；专项规则按风险加载；不把无证据猜测列阻塞，代码审查也审查规则、检查、Notes 和文档的必要性，不另设统一治理审查层。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-code-review/SKILL.md)

### dsh-create-upgrade-guide

- 本轮去向：[seek-create-upgrade-guide](../.agents/skills/seek-create-upgrade-guide/SKILL.md)。
- 保留或提炼：对外可感知break识别、修改未发布指南、明确影响/旧新行为/用户迁移步骤、版本与发布边界核对。
- 剔除、替换与边界：剔除DSH固定版本目录、500词硬指标、配置专名；保留可操作且已验证的迁移说明。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-create-upgrade-guide/SKILL.md)

### dsh-cua-macos-signing

- 本轮去向：不迁移产品工作流或附带脚本。
- 保留或提炼：只提炼生成/使用身份凭据和修改安全设置必须明确授权、不得暴露秘密的边界。
- 剔除、替换与边界：macOS DSH CUA helper签名身份创建/解锁/移除及两个脚本是产品流程；普通新项目无此职责，不迁移脚本。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-cua-macos-signing/SKILL.md)

### dsh-doc

- 本轮去向：[seek-doc](../.agents/skills/seek-doc/SKILL.md)。
- 保留或提炼：读者任务分类、最近事实归属、文档类型结构、精确操作事实验证、失败与缺口、语料审查、内容移动入链、预算用于发现而非削词KPI。
- 剔除、替换与边界：去产品kind、固定metadata键、双语行对齐、站点投影/脚本/固定预算；把可选类型与条件站点/语言流程分离。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-doc/SKILL.md)

### dsh-error-handling

- 本轮去向：[seek-error-handling](../.agents/skills/seek-error-handling/SKILL.md)。
- 保留或提炼：结构化错误、稳定机器标识、cause、处理与报告owner、缺失/部分/已提交/未知副作用、捕获非回滚、安全重试、取消预算、后台任务、可见降级、报告失败fallback、观察终态。
- 剔除、替换与边界：语言/框架类型表达按项目；用户可见信息遵循实际本地化机制，非默认双语。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-error-handling/SKILL.md)

### dsh-find-simplifications

- 本轮去向：[seek-find-simplifications](../.agents/skills/seek-find-simplifications/SKILL.md)。
- 保留或提炼：先限定范围、寻找不必要维护义务、证明可达性和实际消费者、评估行为取舍、保留ownership/failure语义、衡量替代基础设施净收益、合并重复提案、复测。
- 剔除、替换与边界：剔除DSH历史包与notes路径；将历史案例改为通用正反例并保留改编来源。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-find-simplifications/SKILL.md)

### dsh-merging-stacked-prs

- 本轮去向：[seek-merging-stacked-prs](../.agents/skills/seek-merging-stacked-prs/SKILL.md)。
- 保留或提炼：依赖链、精确head、更新后重验、授权合并范围、保持外来提交、逐项验证落地状态。
- 剔除、替换与边界：上游要求原生 GitHub stack；模板不强制所有项目采用该平台，但项目规定原生栈时不得用手工逐 PR 操作绕过。需要核实平台能力、成员和实际结果，不带自动合并授权。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-merging-stacked-prs/SKILL.md)

### dsh-official-plugin-artwork

- 本轮去向：不迁移产品工作流或附带脚本。
- 保留或提炼：图像语义、透明度/尺寸/字体、真实导出与视觉校验、源资产归属可按需提炼。
- 剔除、替换与边界：DeepSeek官方插件图标规范、PluginArtwork、包metadata和品牌比例不是模板要求；不复制产品图标。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-official-plugin-artwork/SKILL.md)

### dsh-pr-description

- 本轮去向：[seek-pr-description](../.agents/skills/seek-pr-description/SKILL.md)。
- 保留或提炼：动机、行为变化、测试设计与实际证据、风险、兼容性/迁移/外部调用/GUI等按变更披露、处理审查后更新描述。
- 剔除、替换与边界：保留上游 Motivation、Changes、Testing、AI Usage 四节及调用元数据；不强加固定 AI-DECLARATION 徽章、参与度百分比或同仓 Issue 政策，项目采用时遵循完整政策。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-pr-description/SKILL.md)

### dsh-pre-push-checks

- 本轮去向：[seek-verify](../.agents/skills/seek-verify/SKILL.md)。
- 保留或提炼：checkout/base/head、committed/staged/unstaged/untracked、变更到证据映射、确认test选择非零、证据失效与重跑、失败阻塞、环境原因证据、远端ref和精确CI核实。
- 剔除、替换与边界：去pnpm/Vitest命令、100%覆盖率和产品snapshot/gate；本地命令来自实际配置；历史重写与推送始终遵循明确授权。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-pre-push-checks/SKILL.md)

### dsh-prose-standard

- 本轮去向：[seek-prose](../.agents/skills/seek-prose/SKILL.md)。
- 保留或提炼：范围与排除、完整命题、按位置必需信息、owner先于派生物、keep/add/trim/restore/restructure/defer、自动/交互模式不扩权、边界取舍校准。
- 剔除、替换与边界：替换固定vendor/notes路径为项目实际边界；不用DSH locale和snapshot命令；保留模型/UI文案属于行为变更的验证原则。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-prose-standard/SKILL.md)

### dsh-responsive-ui

- 本轮去向：[seek-responsive-ui](../.agents/skills/seek-responsive-ui/SKILL.md)。
- 保留或提炼：真实viewport与输入能力、布局决策顺序、截断/换行、图标无障碍、hover/tooltips、触屏与软键盘、焦点行为。
- 剔除、替换与边界：剔除固定最小宽度和DSH组件约定，采用项目支持设备范围；不把手机判断硬编码为宽度。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-responsive-ui/SKILL.md)

### dsh-session-projection

- 本轮去向：[seek-code-review 的状态投影参考](../.agents/skills/seek-code-review/references/state-projection.md)。
- 保留或提炼：确定性无副作用重放、持久事实不含运行时handle、checkpoint+suffix等价完整重放、缓存可重建、版本和消费方兼容、readiness与recovery区别。
- 剔除、替换与边界：剔除Projection服务、Session、readerFor/registry等产品API和固定恢复路径禁令；只供已有日志派生 projection/reducer 的项目参考；同步和引用稳定取决于实际消费者契约，普通快照或异步恢复不自动套用，不引入框架。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-session-projection/SKILL.md)

### dsh-speed-up-perf

- 本轮去向：[seek-speed-up-perf](../.agents/skills/seek-speed-up-perf/SKILL.md)。
- 保留或提炼：明确用户路径和瓶颈、先测量排序、真实合成基准、证明回归后减工作、保行为和资源所有权、可复现边界、收益成本报告。
- 剔除、替换与边界：剔除长Session/专属CI性能gate与固定阈值；不将模拟基准当真实用户延迟。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-speed-up-perf/SKILL.md)

### dsh-translate-docs

- 本轮去向：[seek-translate-docs](../.agents/skills/seek-translate-docs/SKILL.md)。
- 保留：扩展翻译仅接受用户按名称调用；`disable-model-invocation: true` 与 `user-invocable: true` 声明调用边界，其他 Skill 不得自动选择或加载。
- 适配：普通多语言同步由项目文档规则处理；不强加双语项目、DSH 术语表或不存在的记录工具。不支持调用元数据的宿主须显式遵守根入口约定，不能宣称跨宿主强制生效。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-translate-docs/SKILL.md)

### dsh-trim-cot-leakage

- 本轮去向：[seek-trim-cot-leakage](../.agents/skills/seek-trim-cot-leakage/SKILL.md)。
- 保留或提炼：区分当前项目事实与无效过程叙事、审阅视角、死草稿引用、逐代码解说、暂定口气；保留真证据/因果/现有issue/回归解释；先审后改、反过度删除。
- 剔除、替换与边界：改名为清理过程性残留以避免混淆内部推理；替换DSH note与生成目录；搜索probe只是召回手段不等于语义定义。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-trim-cot-leakage/SKILL.md)

### record-browser-gif

- 本轮去向：[seek-record-browser-gif](../.agents/skills/seek-record-browser-gif/SKILL.md)。
- 保留或提炼：同一运行的真实证据、精确commit/环境、隔离状态、语义等待、隐私、编码后视觉验收、录制与发布分开、发布前后复核head。
- 剔除、替换与边界：不强制每个GUI PR均GIF、真实模型key、gh特定版本/上传协议/5MiB硬限制；编码器可暂不移植，若移植须带测试/许可/依赖说明。
- 上游：[SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/record-browser-gif/SKILL.md)

## 支撑文件去向

以下路径相对于上游 `.agents/skills/`，不复制原项目的不可用相对链接。正文需要的通用判断必须进入目标入口或其参考，不能仅留下来源链接。

| 上游文件 | 本轮去向 |
| --- | --- |
| `.gitignore` | 不复制；本项目只忽略自身真实产物。 |
| `dsh-client-ui-ux/references/alignment.md`、`spacing.md`、`icons.md` | `seek-ui/references/` 同名参考，保留完整几何关系和实际渲染验证；这是当前上游版本的新增方法。 |
| `dsh-ci-test-reliability/references/ci-flake-diagnosis.md` | `seek-test-reliability/references/ci-flake-diagnosis.md`，保留诊断因果和清理至静止。 |
| `dsh-cua-macos-signing/scripts/signing_e2e.py` | 排除产品签名工具。 |
| `dsh-cua-macos-signing/scripts/signing_identity.py` | 排除产品身份工具。 |
| `dsh-cua-macos-signing/scripts/test_signing_identity.py` | 随未迁移的产品工具排除，不声称执行过。 |
| `dsh-doc/references/metadata-links-i18n.md` | `seek-doc/references/page-style.md`、`lifecycle.md` 与 `seek-translate-docs`；不强制双语物理行对齐。 |
| `dsh-doc/references/review.md` | `seek-doc/references/review.md`。 |
| `dsh-doc/references/structure-hierarchy.md` | `seek-doc/references/document-types.md` 与文档模板。 |
| `dsh-doc/references/style.md` | `seek-doc/references/page-style.md` 与 `seek-prose` 的表达/事实职责分工。 |
| `dsh-doc/references/website-sync.md` | `seek-doc/references/lifecycle.md` 的条件站点同步，不引入站点。 |
| `dsh-doc/templates/package-bundle.md` | 不保留产品 bundle 模板；配置与组合语义按实际模块说明。 |
| `dsh-doc/templates/package-group.md` | `seek-doc/templates/document-patterns.md` 的模块导航。 |
| `dsh-doc/templates/package-library.md` | 同一模板的库职责、调用与失败契约。 |
| `dsh-doc/templates/package-reference.md` | 同一模板的模块/服务说明；不带 Cordis 挂载。 |
| `dsh-doc/templates/persistence-change.md` | 不复制产品类型确认链；通用兼容证据归 `seek-doc/references/lifecycle.md` 和状态投影。 |
| `dsh-doc/templates/persistence-format.md` | 不复制 Session 格式模板；仅有持久化契约时建立实际格式参考。 |
| `dsh-doc/templates/persistence-release.md` | 不复制产品历史类型报告；`seek-doc/references/lifecycle.md` 与状态投影保留兼容判断不能由差异报告替代。 |
| `dsh-doc/templates/upgrade-guide.md` | `seek-create-upgrade-guide` 和文档模板的迁移步骤，保留版本/条目目录和发布冻结，英文词数上限不直接作为中文预算。 |
| `dsh-find-simplifications/references/historical-patterns.md` | `seek-find-simplifications/SKILL.md` 的通用案例；不复制产品历史结论。 |
| `dsh-prose-standard/references/examples.md` | `seek-prose/references/examples.md` 与 `coverage.md`。 |
| `dsh-trim-cot-leakage/references/examples.md` | `seek-trim-cot-leakage/SKILL.md` 的例子，保留反过度删除边界。 |
| `dsh-trim-cot-leakage/references/recall-batteries.md` | 不复制上游关键词集合；同一 Skill 保留语义召回和逐项审查，搜索命中不是删除结论。 |
| `record-browser-gif/scripts/encode_gif.py` | 本轮不迁移；只保留真实录制和验收方法，不提供不存在的编码命令。 |
| `record-browser-gif/scripts/test_encode_gif.py` | 随未迁移编码器排除，不声称执行过。 |

文档类进一步映射见 [seek-doc 映射](../.agents/skills/seek-doc/references/upstream-map.md)与 [seek-prose 映射](../.agents/skills/seek-prose/references/upstream-map.md)。

## 关联规则与事实依赖

- 根 `AGENTS.md`：提炼范围、验证、秘密、文档和规则编辑边界到本项目根入口；不照搬产品布局和命令。
- `docs/AGENTS.md`：单一归属、当前事实与历史区别进入 `seek-doc`；词数、元数据和语言配置只按真实项目需要设置。
- `packages/AGENTS.md`：模块职责、契约、依赖与验证进入文档模板和代码审查；不要求建立 `packages`。
- `packages/client/AGENTS.md`：界面分层和真实入口验证进入 `seek-ui`；去掉 Cordis、slot 和固定导出约定。
- `benchmarks/AGENTS.md`：可复现基准、收益与行为证据进入 `seek-speed-up-perf`。
- `snapshots/AGENTS.md`：真实运行、样本来源和重新生成证据进入 `seek-record-browser-gif`、`seek-verify` 与状态投影；不引入原 Session 录制体系。
- `.agents/notes/AGENTS.md`、`implemented/AGENTS.md`、`archived/AGENTS.md`：取代关系、决策价值、不可改写历史由 Notes 局部入口与归档方法分别维护；规范归 Notes 自身 README/局部 AGENTS，seek-notes 仅负责操作；Python 检查承接单语言格式和冻结，不迁入双语三件套。
- `docs/testing.md`、`docs/defensive-patterns/*` 和 `.agents/notes/README.md` 的通用判断进入验证、测试可靠性、错误处理、资源生命周期和决策归档；产品事实不能变成本项目规则。

`seek-initialize` 是模板专有能力：把六文档和真实验证链交接给派生项目，不冒称上游有对应 Skill。六固定文件、中文默认与 Python 标准库检查实现是明确的模板适配；没有新增统一治理调度器。实际验证范围见 [测试说明](testing.md)。

## 事实归属、兼容与失败验证

文档维护按上游 `docs/AGENTS.md` 的单一归属和冗余检查清单，避免在架构页复制测试/包清单；具体测试与命令由最低拥有层和实际配置维护。`seek-doc` 在涉及持久化或跨版本契约的格式、默认行为与错误策略变化时读取既有兼容参考，分别验证两个读写方向，依据上游 [persistence-change 模板](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/.agents/skills/dsh-doc/templates/persistence-change.md)。`seek-code-review` 与 `seek-verify` 将上游真实入口、接口两端和负例验证应用到受影响的多阶段失败路径，失败示例补充输入与序列化/持久化交互；行为变化需要核对消费者，但不因此创建上游仅用于持久化类型变化的记录。这些是上游方法的通用例证，不是新增全局流水线或数值禁令。语义审查仍需实际执行，结构检查不能证明这些判断正确。

## 自动检查取舍

- **已适配的通用规则**：Notes 分类、格式、状态、旧 RFC 目录拒绝与归档封存；保留 Skill 调用元数据并验证其格式；本地链接与固定入口检查。Python 实现不是上游 TypeScript 脚本原样复制。Notes 直接参考上游 [分类检查](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/scripts/verify-agent-note-classification.ts)、[格式检查](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/scripts/verify-agent-note-format.ts) 和[归档封存实现](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/scripts/archived-agent-notes.ts)。
- **按实际项目接入**：文档代码示例编译、生成 API/配置文档新鲜度、构建产物检查、双语配对、站点链接、SDK/Session 快照。没有相应业务不创建虚构门禁。
- **尚未机械覆盖**：中文文档预算、通用 Markdown 段落换行、完整参考式链接和语义一致性。预算仍按上游的“先调整归属、再精简、必要时说明增额”原则审查，不声称英文词数上限适用于中文。
- **不照搬的仓库专属限制**：上游的组织 URL 和提交号禁用策略、Node/pnpm/Cordis 依赖政策及产品包分类；本模板需要固定上游版本链接以说明改编来源。

检查器与其单元测试只能证明实现覆盖的规则。真实任务中新会话是否读取、选择和遵循方法，需要独立行为验证，不能以元数据通过代替。
