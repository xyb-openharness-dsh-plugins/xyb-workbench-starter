# 小胰宝 / 小x宝社区 Workbench 开发脚手架

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

激活后在新项目父目录执行 `dsh-wb-cli init --prepare`，填写需求配置，再 `dsh-wb-cli init my-workbench`。已有配置用 `--config`；更新脚手架用 `dsh-wb-cli sync`（仅干净 Git 克隆、快进更新）。生成项目会记录脚手架版本/commit，并保留自身开发修改。完整操作见 [Git 与 CLI 指南](docs/CLI-GIT.md)。远端已由社区确认，`sync` 更新此仓库的跟踪分支。

`init` 初始化开发项目，`npm link` 激活命令；它们不等于把插件装入 Desktop。

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

生成器只复制文件，不联网、不安装依赖、不新建 Git 提交、不覆盖同名文件。需要修改目标已有文件时，先在临时目录生成，再人工比较合并。项目配置会随生成结果保存，请只填公开元数据和业务摘要。

## 与 Agent 一起完成设计

模板就绪后，让 Agent 通过对话填写需求、SPEC、UI 和数据设计；可直接使用 [共创提示词](prompts/DESIGN-WITH-ME.md)。UI 优先采用一个实际可用的专用设计技能，完成可交互原型和真实预览，由开发者确认。数据根据业务选择 JSON、SQLite，或加入可选的记忆/检索层；业务事实保持统一来源。见 [互动设计流程](docs/07-INTERACTIVE-DESIGN.md)。这些是 Agent 工作流，当前 CLI 的 init 不会自动进行聊天或生成完整业务 UI。

## 按问题阅读

| 要做的事 | 文档 |
| --- | --- |
| Git 克隆/命令激活/同步/初始化 | [CLI-GIT](docs/CLI-GIT.md) |
| 从想法到上线的顺序、如何省 token | [01-WORKFLOW](docs/01-WORKFLOW.md) |
| 包声明、注册、原生会话、宿主边界 | [02-DSH-CONTRACT](docs/02-DSH-CONTRACT.md) |
| 社区风格、Logo、UI/UX 技能、图表/动效 | [03-DESIGN-SYSTEM](docs/03-DESIGN-SYSTEM.md) |
| SQLite、可扩展指标、来源与文件目录 | [04-DATA](docs/04-DATA.md) |
| 给我建议、技能/MCP、离线数据与结果回流 | [05-AGENT-AND-RESOURCES](docs/05-AGENT-AND-RESOURCES.md) |
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

文档可离线读。初始化/校验工具只依赖 Node 内置模块；实际工作台还依赖 DSH Desktop 和宿主 peers。SQLite 项目需核验 `node:sqlite` 所需 Node 版本；MinerU、MCP、自动任务、导出转换器各有自己的运行条件。没有一键生成 dmg/exe：本交付产物是 DSH 工作台插件包；独立桌面安装器是另一项工程。

## 品牌与分发

社区 Logo 作为参考素材提供，来源与授权状态见 [assets/README.md](assets/README.md)。无患者数据、有效密钥、大型数据集或第三方技能代码。项目发布前确认自己仓库、素材和数据许可证。仅本机使用不需要市场投稿；Git 推送、Release/npm 发布、市场 PR 是独立动作，按用户授权推进。

感谢小x宝社区、DataElement 社区，以及开发者 sam / hhx / 繁华的 ❤️ 贡献。

UI 共创补充：已纳入 [Taste Seed 风格决策适配](docs/08-TASTE-SEED.md)，配合 frontend 设计技能使用，保留主辅风格、具体参数和开发者反馈记录。
