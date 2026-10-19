# 小胰宝 / 小x宝社区 Workbench 开发脚手架

当前本地版本：**1.4.0（待发布）**。在 SPEC、UI 设计、任务与验收模板中明确 DSH 原生 Agent 的顶栏拉起入口、独立隐藏/重开和可调宽要求；区分 CustomFrame splitter 与 split 宿主布局合同，增加 ACC-28–31 验收项。新增 22 号「三阶段×三闸口」开发流程速查与 21 号调研手册；docs/06 补 Desktop 装机实证（**Desktop 读 `~/.dsh/profiles/desktop` 不是 web**、pnpm 同版本不替换须 remove+add、cordis apply 契约）；另有原型工艺复刻指南（令牌骨架/动效系统/交互细节，颜色按癌种换）、DSH 原生 Agent 右侧面板复用提示词与对应的落地设计模板（CustomFrame/split 双形态判定，不绑定癌种）；保留init的用户、场景、流程前置输入。变更见 [CHANGELOG](CHANGELOG.md)。本地修改尚未推送或创建远端tag。

把业务需求、交互原型变成可在 DSH Desktop 安装使用的工作台。面向社区新手与协作开发 Agent，提供互动设计、数据建模、界面实现、测试修复和部署验收流程，并整理项目实践中的典型错误和修复方法。

**开发灵魂文件是 [AGENTS.md](AGENTS.md)**。完整方案与任务验收见 [spec/STARTER-SPEC.md](spec/STARTER-SPEC.md)。不是把整个 DSH Desktop 仓库复制一遍，也不是一套预设医疗业务。

## Git 部署和 CLI 激活

社区仓库：[xyb-workbench-starter](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench-starter)。从 Git 克隆并激活：

```bash
git clone https://github.com/xyb-openharness-dsh-plugins/xyb-workbench-starter.git
cd xyb-workbench-starter
npm link --ignore-scripts --no-audit --no-fund
dsh-wb-cli --version
dsh-wb-cli doctor
```

激活后在新项目父目录执行 `dsh-wb-cli init --prepare`，填写目标用户、初始场景/流程等配置，再 `dsh-wb-cli init my-workbench`。init会输出可编辑设计提示词、癌种提示词、DSH原生Agent右侧面板提示词的绝对路径与首问；当前Agent应在init后立即展示这些路径、读取提示词，并开始对照/关键设计对话，而不是等待用户再找文件。原生AI面板规范默认右置，工作台保持中间主区，支持拖动调宽、隐藏/重开与归属会话复用。已有配置用 `--config`；更新脚手架用 `dsh-wb-cli sync`（仅干净 Git 克隆、快进更新）。生成项目会记录脚手架版本/commit，并保留自身开发修改。完整操作见 [Git 与 CLI 指南](docs/CLI-GIT.md)。远端已由社区确认，`sync` 更新此仓库的跟踪分支。

`init` 初始化开发项目，`npm link` 激活命令；它们不等于把插件装入 Desktop。

本地1.3.2尚未发布。已有干净Git克隆的 `sync` 仅拉取远端已存在版本，不会上传本机更改，也不会覆盖业务项目。

## 不激活命令也可直接使用

1. 把整个目录复制到新位置。无需安装 npm 库，也无需安装任何专属技能。
2. 阅读 [新手流程](docs/01-WORKFLOW.md)，把“服务谁、做什么、一次任务如何完成”写入 [需求模板](templates/BRIEF.md)。有原型时先整理一级/二级页面与所有点击行为。
3. 复制 `project.config.example.json` 为自己的配置，填真实仓库身份、业务与明确的布局选择。业务整页优先考虑 `business-first`；只有明确需要对话伴随面板时选 `split`。分栏比例按具体任务选择。
4. 有 Node.js 22+ 后，在本目录执行（目录路径含空格时加引号）：

```bash
node scripts/init.mjs --config ./project.config.json --target ../my-workbench --dry-run
node scripts/init.mjs --config ./project.config.json --target ../my-workbench
```

5. 进入生成的目录，将 [prompts/START.md](prompts/START.md) 交给 Codex。按 spec → 契约 → 共享组件 → 完整页面 → 成组检查 → 打包 → Desktop 实测推进。原型尚未确认时先做设计，不直接展开业务代码。

init同时生成项目级发布记录 `docs/RELEASE.md`，并回传路径；CLI只交接文档，不自动推送、安装或投稿。发布/市场流程见 [10-MARKET-PUBLISHING](docs/10-MARKET-PUBLISHING.md)。

生成器只复制文件，不联网、不安装依赖、不新建 Git 提交、不覆盖同名文件。需要修改目标已有文件时，先在临时目录生成，再人工比较合并。项目配置会随生成结果保存，请只填公开元数据和业务摘要。

## 与 Agent 一起完成设计

初始化后先让Agent展示 [设计者提示词](prompts/DESIGNER-FIRST.md) 和 [DSH原生Agent面板提示词](prompts/DSH-AGENT-PANE-INTEGRATION.md) 的项目副本路径，基于已有素材对齐角色、研究方法、取舍原则并核对UI parity；面板落地前先按 [Agent面板落地设计模板](docs/20-AGENT-PANE-DESIGN.md) 填写项目设计文档（先摆证据、判版式形态、列未决，确认后才写代码）；癌种项目使用 [新癌种完整提示词](prompts/NEW-CANCER-WORKBENCH.md)。之后通过对话填写需求、SPEC、UI 和数据设计；可直接使用 [共创提示词](prompts/DESIGN-WITH-ME.md)。UI 优先采用一个实际可用的专用设计技能，完成可交互原型和真实预览，由开发者确认。数据根据业务选择 JSON、SQLite，或加入可选的记忆/检索层；业务事实保持统一来源。见 [互动设计流程](docs/07-INTERACTIVE-DESIGN.md)。CLI不会自动启动模型对话；但当前Agent必须在init后马上读取提示词并接续关键对话，不应把路径输出当作设计对话已完成。

## 需求审核：癌种特有场景有没有真的做出来

单癌种工作台最常见的失败不是"少写功能"，而是**通用能力写得很满、只有这个癌种才有的场景只剩一个二级页标题**。`skills/hvt-requirement-review/` 提供一套可执行审核方法：沿十条疾病轴推导 HVT 场景，打 V/S/F 分，逐条查场景/模块/字段/交互/验收五层是否落地，输出带证据的差异评价和能直接并入 SPEC 的补丁。

```bash
python3 skills/hvt-requirement-review/scripts/hvt_scan.py --project . --profile ovarian --out /tmp/hvt-scan.md
```

脚本只做命中统计（内置 breast/ovarian/lung/pancreatic/colorectal 术语包），C 值必须人工复核。方法与产出见 [15-HVT-REVIEW](docs/15-HVT-REVIEW.md)，项目内记录模板为 [HVT-REVIEW](templates/HVT-REVIEW.md)。这条审核属 G1 闸口：B 级（有场景无落地）未清零不签字，不写业务代码。

五层之外还有一道**发布可见性 P**：版本号必须在 HTML 原型首页与装机后的应用首页**看得见**，并与 `package.json`、tag、市场条目一致。只在 README 或关于弹窗深层写了不算；未接入 DSH 时写"未验证"，不写通过。判据见技能内 `references/publish-readiness.md`，定位脚本 `publish_check.py`。

## 一图秀：多指标时间轴怎么做才算对

一图秀做错的根因通常不是图表库，而是三个合同没定：**指标可比性、归一化基准、事实源单一**。三件事错了，后面怎么调样式都救不回来。

[16-ONE-CHART-SPEC](docs/16-ONE-CHART-SPEC.md) 把乳腺癌工作台这一版的实现经验固化成 12 条硬规则与 12 条验收断言：独立归一化并写明不可比、单点不连线、治疗条与数据区分层、只标末点并做避让、康复测量用绝对值而非百分比、`pathLength=1` 绘制动画、`minmax(0,1fr)` 防溢出、减少动效保留终态、指标卡真 3D 翻转等。每条都带反例与可观察判据。

项目接入时填 [ONE-CHART-SPEC 模板](templates/ONE-CHART-SPEC.md)（指标清单、分类、可比性分组、状态默认值、逐条核对与偏离记录），不复制规范正文。

## 按问题阅读

| 要做的事 | 文档 |
| --- | --- |
| **需求到人工反馈的闭环项目流程（含 HTML 确认、临床试验 SQLite、>98% parity、DSH Desktop RC发布）** | [17-CLOSED-LOOP-PROJECT-FLOW](docs/17-CLOSED-LOOP-PROJECT-FLOW.md) |
| Git 克隆/命令激活/同步/初始化 | [CLI-GIT](docs/CLI-GIT.md) |
| 从想法到上线的顺序、如何省 token | [01-WORKFLOW](docs/01-WORKFLOW.md) |
| **癌种特有高价值场景是否真的落地（G1 需求审核）** | [15-HVT-REVIEW](docs/15-HVT-REVIEW.md) + [技能包](skills/hvt-requirement-review/SKILL.md) |
| **多指标时间轴（一图秀）与指标卡翻转** | [16-ONE-CHART-SPEC](docs/16-ONE-CHART-SPEC.md) + [项目填写模板](templates/ONE-CHART-SPEC.md) |
| **原型工艺复刻：令牌骨架、动效系统、交互细节（颜色按癌种换）** | [19-PROTOTYPE-CRAFT](docs/19-PROTOTYPE-CRAFT.md) |
| **一图秀动画重播、事件泳道与标签联动的完整实现提示词** | [TIMELINE-MOTION-AND-EVENTS](prompts/TIMELINE-MOTION-AND-EVENTS.md) |
| **Agent 对话面板落地设计（先判定版式形态、摆证据、列未决，不绑定癌种）** | [20-AGENT-PANE-DESIGN](docs/20-AGENT-PANE-DESIGN.md) |
| **工作台顶栏：三段式 + 按钮右置 + 版本号随品牌（customFrame 专用提示词）** | [DSH-WORKBENCH-TOP-BAR](prompts/DSH-WORKBENCH-TOP-BAR.md) |
| **三阶段×三闸口开发流程速查（必记心智模型，G1/G2/G3 签认规则）** | [22-PHASES-AND-GATES](docs/22-PHASES-AND-GATES.md) |
| **罕见病/新病种调研手册（设计→执行→输出，证据分级）** | [21-RESEARCH-PLAYBOOK](docs/21-RESEARCH-PLAYBOOK.md) |
| 包声明、注册、原生会话、宿主边界 | [02-DSH-CONTRACT](docs/02-DSH-CONTRACT.md) |
| 社区风格、Logo、UI/UX 技能、图表/动效 | [03-DESIGN-SYSTEM](docs/03-DESIGN-SYSTEM.md) |
| SQLite、可扩展指标、来源与文件目录 | [04-DATA](docs/04-DATA.md) |
| 给我建议、技能/MCP、离线数据与结果回流 | [05-AGENT-AND-RESOURCES](docs/05-AGENT-AND-RESOURCES.md) |
| 顶部目录/会话状态、绑定绿灯与切换竞态 | [09-WORKBENCH-STATUS](docs/09-WORKBENCH-STATUS.md) |
| 本机安装验收、GitHub Release、Awesome Workbench 市场 PR | [10-MARKET-PUBLISHING](docs/10-MARKET-PUBLISHING.md) |
| 任务分层、原型一致性、产物检查与可选视觉方案 | [11-REUSABLE-PATTERNS](docs/11-REUSABLE-PATTERNS.md) |
| 可选高德POI、Key配置、地图/坐标与结果校验 | [12-AMAP-POI](docs/12-AMAP-POI.md) |
| **PDF 报告云端解析（MinerU）：Token、抽取纪律、表格对齐与失败语义** | [18-MINERU-PARSING](docs/18-MINERU-PARSING.md) + [对齐示例](examples/mineru-labparse-align.mjs) |
| 测试、安装、旧版本、发布和回滚 | [06-VALIDATION-AND-RELEASE](docs/06-VALIDATION-AND-RELEASE.md) |
| 开发典型错误和修复经验 | [LESSONS](docs/LESSONS.md) |
| 来源规则、官网版本差异、复盘方法 | [SOURCES](docs/SOURCES.md) / [HISTORY](docs/HISTORY.md) |
| 脚手架本次检查结果 | [VALIDATION](docs/VALIDATION.md) |

## 工具和示例

```bash
node scripts/check-starter.mjs
node --test test/starter.test.mjs
node scripts/check-workbench-package.mjs /absolute/path/to/generated-project
```

[examples/metric-card.html](examples/metric-card.html) 是离线交互参考：独立翻面、等比折线、普通/大字、减少动效和数据表。它不是 DSH 已安装业务页。

[examples/workbench-status.mjs](examples/workbench-status.mjs) 是不依赖框架的状态读模型示例，区分目录就绪、当前项目/会话匹配、归属不可验证与过期快照；不创建会话或授予权限。

[examples/progressive-disclosure.html](examples/progressive-disclosure.html) 可离线打开，演示默认折叠的配置、💡教学与常显任务/错误。输入不提交到任何服务。

有位置检索需求时，使用[POI接入记录](templates/POI-CAPABILITY.md)和[高德候选归一化示例](examples/amap-poi-normalize.mjs)。不携带Key，也不会自动为其它主题安装地图或调用外部服务。

文档可离线读。初始化/校验工具只依赖 Node 内置模块；实际工作台还依赖 DSH Desktop 和宿主 peers。SQLite 项目需核验 `node:sqlite` 所需 Node 版本；MinerU、MCP、自动任务、导出转换器各有自己的运行条件。没有一键生成 dmg/exe：本交付产物是 DSH 工作台插件包；独立桌面安装器是另一项工程。

## 品牌与分发

社区 Logo 作为参考素材提供，来源与授权状态见 [assets/README.md](assets/README.md)。无患者数据、有效密钥、大型数据集或第三方技能代码。项目发布前确认自己仓库、素材和数据许可证。仅本机使用不需要市场投稿；Git 推送、GitHub Release/npm 发布、市场目录 PR 是独立动作，按用户授权推进。按 [市场发布步骤](docs/10-MARKET-PUBLISHING.md)分别核对安装源、Profile 安装、Release 附件和市场条目，不把 GitHub Release 当作自动投稿或自动上架。

感谢小x宝社区、DataElement 社区，以及开发者 sam / hhx / 繁华的 ❤️ 贡献。

UI 共创补充：已纳入 [Taste Seed 风格决策适配](docs/08-TASTE-SEED.md)，配合 frontend 设计技能使用，保留主辅风格、具体参数和开发者反馈记录。

## 业务开发前两项明确关口

先出HTML交互工作台UI、实际预览，由用户确认具体版本与范围后才开发对应业务。数据模型与前端页面和业务步骤解耦，必须走查导航/字段/流程改变以及更正和升级场景。参见[HTML原型与数据演进规范](docs/14-HTML-AND-DATA-CONTRACT.md)；初始化骨架和模拟原型不算业务实现。


## HTML确认与可演进数据模型

先交付可交互HTML工作台，用户确认对应版本/模块后再实现业务。数据模型与UI/业务流程变化解耦：领域/证据/主体/版本稳定，命令API和版本化读模型适配页面。init生成SCHEMA/API/UI/PARITY和PROTOTYPE-REVIEW的docs副本，均为待填写/待确认，不能冒充完成。参见 [详细合同](docs/14-HTML-AND-DATA-CONTRACT.md)。
