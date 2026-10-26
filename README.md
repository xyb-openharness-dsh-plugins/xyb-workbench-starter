# 小胰宝 / 小x宝社区 Workbench 开发脚手架

## Git开发快照 · 2026-10-25（七）34/35 号契约入架：AI 一键发送 + 试验匹配语义

两条契约随本次快照进架（来源：肢端肥大症仓真机反馈与匹配设计评审）：**[34 号](docs/34-AGENT-DRAFT-SEND.md) AI 协助一键发送**——AI 按钮直接 `postMessage(send:true)` 发进原生会话开启互动（替代旧"只填不发"），演示面板只存在于独立打开形态、嵌入式下原生会话是唯一 AI 面板（2b 面板唯一性）；**[35 号](docs/35-TRIAL-MATCHING.md) 试验匹配**——以小胆宝 match-0.1.0 为参考实现：粗筛符合度 pct（符合÷已对照、待确认=0 只偏低）+ 四档分层 + 逐条证据链，禁止 eligible/suitability 判读列与"适配度"命名。两个条件触发检查器 `check-agent-draft-bridge.mjs` / `check-trial-matching.mjs` 进 [06 号](docs/06-VALIDATION-AND-RELEASE.md)检查器清单（触发即必过、未实现自动跳过），A4/T2b 断言各配正负例实测。包版本 `1.7.1`。

## Git开发快照 · 2026-10-26（六）部署目标：只认本机 DSH Desktop

用户点名加一条**最高优先级**要求：工作台**默认部署到本机已安装的 dsh-desktop**，**不许**装到 `~/.dsh`，也**不许**装到 **DeepSeek Harness**；机器上没装 dsh-desktop 就停下，把 <https://www.dshdesktop.com/> 给用户。为什么值得单列：装错宿主不会报错，只会安静地没效果——页面能开、`npm run check` 全绿、tgz 也打了，用户在 Desktop 列表里就是看不到这台。**这是 GitHub 项目，所以按三平台写**：Harness 都在 app 自己的 Electron userData 下（macOS `~/Library/Application Support/dsh-desktop/harness`、Windows `%APPDATA%\dsh-desktop\harness`、Linux `${XDG_CONFIG_HOME:-~/.config}/dsh-desktop/harness`），但文档**不要求背路径**——`check-install.mjs` 现场探测并打印"判定基准"一行（macOS 实测 0.12.0；Windows/Linux 按约定列探测点，真机未实测，如实标注）；装机命令按平台分开写（PowerShell 不认 `export`）。同时排除 `~/.dsh/profiles/{desktop,tui,web}`（`dsh` CLI 0.1.0-rc.6 侧，与本机目标 **`profiles/web` 同名不同地**）与 DeepSeek Harness `com.deepseek.dsh` 0.2.1-rc.2。落地成 [37 号](docs/37-DEPLOY-TARGET.md) + `AGENTS.md` 开头的新段（要求层）+ `prompts/ZERO-TO-DEV.md` §0.0（排在任何开发动作之前）+ `check-install.mjs` 重写（先答"装没装"、再答"登记到哪"；`--app` 指定非常规位置，`DSH_DESKTOP_APP=none` 反向对照）+ `check-conformance` 的 `deploy/*` 两条审计项。顺手修掉一个真实假绿：app 卸载后只剩残留目录时，旧逻辑照样报"判定基准 Desktop"，把"没装"盖过去（Windows 上这种残留更常见）。包版本 `1.7.0`。

## Git开发快照 · 2026-10-25（五）A1 断言原来在骗人

肉瘤项目跑 M4 时复核整页视图的 A1，发现探针算了 `docOverflow` 却从没断言它，而实测面板开着时背景文档**真的能滚**（`scrollBy` 0 → 300）。三处一起修：`page-view.js` 首次 `open()` 记住 `scrollY` 并挂 `.pv-lock`、`teardown()` 先摘类再还原；`page-view.css` 加 `html.pv-lock{overflow:hidden}`（只锁 `html`，锁 `body` 在 Safari 会漏）；A1 改成**真滚轮打遮罩**再读 `scrollY`——`window.scrollBy` 不能当判据，`overflow:hidden` 只挡用户滚动、挡不住程序化滚动（实测 260 → 426 的假红）。`--self-test` 加到三个缺陷、4 条 FAIL。存量 20 个项目的整页视图是内联实现，没有锁、探针也是旧快照，按已知偏离处理，下一轮动到哪个补哪个。同版把「自采登记数据算一手、与指南原件未取得分开计」写进 [36 号](docs/36-DISEASE-PRIMER.md) §2.4。包版本 `1.6.2`（1.6.3 修其自测判据与过期注释，见 CHANGELOG）。

## Git开发快照 · 2026-10-25（四）每台一个「?」：疾病概要进骨架

每个工作台要能回答「我得的这个病大概是什么、依据什么文件、世上有哪些手段、这几年在变什么」。落地成 [36 号疾病概要](docs/36-DISEASE-PRIMER.md) + 实现 `assets/patterns/disease-primer.{js,css}` + 演示 `examples/disease-primer.html` + 9 条断言探针 `scripts/probe-disease-primer.mjs`（含 `--self-test`）。四段固定：**定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势**，落点是 README 的 `## 疾病概要` 与看板顶栏「?」（整页视图，不是弹窗）。三条红线：整体属第 ② 层（解释）、**趋势段只写已发生的事实**并带日期/版本、原件没拿到就写「未取得原件，据二次来源」。两个节点都已接：**要求**进 `AGENTS.md` 与 `prompts/ZERO-TO-DEV.md`，**开发后审计**进 `check-conformance.mjs` 的 `primer/*`。项目清单填 `docs/DISEASE-PRIMER.md`（`init` 生成）。包版本 `1.6.0`。

## Git开发快照 · 2026-10-25（三）整页视图进骨架

用户点名把 `dsh-shopping-workbench` 的「点开就是一整页、关掉回主页/前一页」设计**保留到脚手架**，理由是"现有弹窗空间太小，功能无法扩大"。落地成 [32 号整页视图](docs/32-FULL-PAGE-VIEW.md) + 可运行实现 `assets/patterns/page-view.{js,css}` + 演示 `examples/page-view.html` + 13 条断言探针 `scripts/probe-page-view.mjs`（含 `--self-test` 反向对照）。三条硬约束：**返回与关闭是两个入口**、**关掉回原滚动位置且焦点回触发者**、**Esc 与浏览器返回键各只退一层**。history 是导航栈唯一真源，禁用 `replaceState` 假装退栈。项目清单填 `docs/FULL-PAGE-VIEW.md`（`init` 生成）。包版本 `1.5.3`。

## Git开发快照 · 2026-10-24（二）

新增 [提示词 PROGRESS-REPORT](prompts/PROGRESS-REPORT.md)：把「看看现在到哪了 / 更新下进度条」这类请求固化成一套口径——先读 VERSION / DEV-PLAN / SIGNOFF / RELEASE / CHANGELOG / git log，再按 **A–G 结构**（一句话现状 → 进度条 → 里程碑表 → 用户能感知的事 → 踩过的坑 → 下一步三步 → 未验证清单）输出。四条口径不许放宽：**判据可验证 / 签认只认原话 / 三态分开写 / push≠发布**。它管"怎么讲给非工程读者"，判据与状态的唯一来源仍是 `docs/DEV-PLAN.md`（两者数字打架以 DEV-PLAN 为准，并当场修正 DEV-PLAN）。随 `init` 下发到新项目；已激活在 [CONTINUE](prompts/CONTINUE.md)（用户说"继续/汇报"时自动套用）、[ZERO-TO-DEV](prompts/ZERO-TO-DEV.md) 阶段汇报条、[22 号](docs/22-PHASES-AND-GATES.md)「最容易踩的坑」第 6 条。

## Git开发快照 · 2026-10-24

新增**家族一致性 audit**：`scripts/check-conformance.mjs` 用代码与文件核对家族硬约束（版本/面板/检查链/文档/密钥五组约 37 项），不再靠 README 自述。入口三个：项目内 `npm run audit`（随 `init` 下发）、发布前 `npm run release:check`（`check && audit`）、跨仓横向对照 `dsh-wb-cli audit <目录> [--json]`。`init` 同时补发 `VERSION` 与 `CHANGELOG.md`，让版本唯一来源从第 0 天成立；裸生成项目 audit 基线 17/30，剩下 11 项 fail 就是开发待办清单。包版本升 `1.5.0`。

## Git开发快照 · 2026-10-21

新增 [提示词 ZERO-TO-DEV v1.1](prompts/ZERO-TO-DEV.md)：从一个癌种名到可运行开发版的一次性交付提示词，把「init → 强约束文档 → 调研/患者流程/schema/多通道临床库/HTML 原型 → 第一次确认 → 开发版 parity → dsh-desktop 实测 → push 与经验回流」整条链路固化成可复制的阶段说明。同时把临床库的**已知覆盖限制**写进去：unified-trial-mcp 的三个离线语料（ChiCTR 468 条、小胰宝归档 139 条、ctv 索引）**目前只有胰腺癌**，做其他癌种只能走在线通道（`ictrp` / `ctv` / `chictr_online` / `chinadrugtrials`），离线通道对该癌种须如实声明为"未配置/无覆盖"。README 补「新手：五步从一个癌种名走到可运行开发版」。

## Git开发快照 · 2026-10-20

新增24号指标趋势Tab设计、参考截图、可复用提示词和项目填写模板；init生成指标趋势规格副本，更新AGENTS/一图秀合同/设计系统及检查测试。 包版本保持`1.4.3`；这是开发快照，正式发布状态另行记录。核验结果、已知问题及同步范围见 [本次Git记录](docs/GIT-SYNC-2026-10-20.md)。


当前本地版本：**1.7.1（待发布）**。**1.7.0 加的是"装到哪"**：部署目标只认本机 DSH Desktop（`io.dsh.desktop`）自己的 harness profile，排除 `~/.dsh` 与 DeepSeek Harness.app，没装就给 <https://www.dshdesktop.com/>；规则见 37 号，判据是 `check-install.mjs`。**1.6.3 修的是自测本身**：`probe-page-view.mjs --self-test` 注入三个缺陷却用 `failed.length >= 2` 判定，注三个抓到两个也算通过——闸门退化会静默过关。改成 `EXPECTED_FAIL = ['A1','A9','A10']` 按 ID 逐条点名，漏哪条报哪条；同版改正「注入两个缺陷（含 A5）」的过期注释（A5 从未注入）。**1.5.1 新增装机面规则⑨**：运行期按**拼出来的路径**读目录（迁移 SQL、模板、标准原文）也必须随包发出——⑥ 只管 import 落点、⑦ 只管 `public/`，这一类在 2026-10-25 头颈癌 M6 漏掉 `schema/migrations/`，装进去**静默空库**（服务能起、`/health` 200、界面能开，只是所有列表空着）。同版下发 `templates/test-pack-contents.test.mjs`（以 `npm pack` 真实清单为对象，自适应跳过项目还没有的目录），并给生成项目加 `test` 脚本、`release:check` 串上 `test`。在 SPEC、UI 设计、任务与验收模板中明确 DSH 原生 Agent 的顶栏拉起入口、独立隐藏/重开和可调宽要求；区分 CustomFrame splitter 与 split 宿主布局合同，增加 ACC-28–31 验收项。DSH 原生 Agent 复用提示词补 **§6.1 上下文草稿落地细则**（服务端按范围出文本、三个范围各带什么、四条不可让步、postMessage 双校验、空态与独立运行降级）。新增 23 号「指标分析与卡片提醒原则」（指标卡分组 / 用 CTCAE v5.0 做分级对照 / 表达面与指标面两侧并置提醒，含 M1–M11 验收与三条反例）、22 号「三阶段×三闸口」开发流程速查与 21 号调研手册；docs/06 补 Desktop 装机实证（**安装前核验Desktop实际使用的Harness profile**、pnpm 同版本不替换须 remove+add、cordis apply 契约）；另有原型工艺复刻指南（令牌骨架/动效系统/交互细节，颜色按癌种换）、DSH 原生 Agent 右侧面板复用提示词与对应的落地设计模板（CustomFrame/split 双形态判定，不绑定癌种）；保留init的用户、场景、流程前置输入。变更见 [CHANGELOG](CHANGELOG.md)。本次Git开发快照范围与检查见下方记录；尚未创建正式发布tag。

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

## 新手：五步从一个癌种名走到可运行开发版

不想读完所有文档就先照这条走，每一步都有明确产出，卡住了再回上面查细节。

1. **装 CLI**：`git clone` 本仓库 → `cd xyb-workbench-starter` → `npm link --ignore-scripts --no-audit --no-fund` → `dsh-wb-cli doctor` 自检（Node.js 22+）。
2. **答前置问题**：`dsh-wb-cli init --prepare`，填「服务谁 / 什么场景 / 一次任务怎么完成」。这三个答案会写进生成项目的 SPEC 骨架，后面不再问第二遍。
3. **生成项目**：`dsh-wb-cli init <english>-workbench`，得到标准目录与文档体系（AGENTS / spec / docs / templates / prompts / 版本与检查脚本）。进目录先 `npm run check`，能在干净状态下全绿才算基线没坏。
4. **建强约束再动手**：按 `docs/DEV-REQUIREMENTS-<日期>.md` 写一份本癌种的强约束文档（范围、照抄样板的产品要求、硬约束 H1–Hn、本轮明确未做、我替你定的默认值）。**没有这份文档就不写业务代码**，这是最省返工的一步。
5. **把提示词整段交给 Agent**：[ZERO-TO-DEV](prompts/ZERO-TO-DEV.md) 填四个空（癌种中文名 / 英文名 / 目标目录 / 样板基准），剩下的按闸口推进——3.1 调研 + 患者流程 + schema + 多通道临床库 + **指南与分级（G1 出处 / G2 节奏 / G3 分级）** + HTML 原型，**第一次人工确认**；3.2 开发版，逐页 parity + 面板默认在右可拖 + 顶栏开关；3.3 dsh-desktop 实测；确认后 push + 把踩到的坑回流到脚手架。

### 什么时候跑 `audit`，怎么跑

`check` 与 `audit` 分工不同，跑的时间点也不同。下面这张表就是全部要求：

| 时点 | 跑什么 | 为什么是这时候 |
| --- | --- | --- |
| 生成项目当天 | `npm run check` | 确认基线没坏；此时 audit 必然有 fail，不看 |
| 每次改完代码 | `npm run check` | 语法 + 装包合同，秒级，随时跑 |
| **G2 原型确认后、写业务代码前** | `npm run audit` | 这时缺的通常是 `lib/layout.js`、`VERSION`/`lib/version.js` 这类**结构**，越早补越便宜；拖到开发完再拆面板参数，改动面翻倍 |
| **交付 / 装机前（必跑）** | `npm run release:check` | `check && audit` 一次跑完。**有 fail 不交付**，不是一个"以后再说"的项 |
| 发布 / 投稿市场前 | `npm run audit --json` 存档 | 把 `xx/xx 通过 · N 失败 · M 待人工` 抄进 `docs/RELEASE.md` 的「家族一致性」一行，作为当版证据 |
| 想横向看多个仓 | `dsh-wb-cli audit <项目目录> [--json]` | 不用逐个 `cd` 进去，一条命令扫一批；`--json` 给 CI 或汇报用 |

怎么读输出：

```bash
npm run audit
#  xyb-demo 0.1.0 — .
#   ✗ panel/单一来源  缺少 lib/layout.js（面板参数必须有唯一来源）
#   ! ui/原型基线  没有 prototypes/v0.2：视觉验收缺少唯一基准
#   17/30 通过 · 11 失败 · 2 待人工
```

- **`✗` fail = 结构上缺一块**，不是风格分歧。要么补齐，要么在 `docs/DEV-REQUIREMENTS-<日期>.md` 写明偏离理由并让用户确认——但不能把它说成通过。
- **`!` warn = 脚本判不了、需要人看**（会话归属、是否常挂载、Token 读写层）。汇报时逐条给「已人工确认」或「确实没有」，不要留空。
- **脚本是下限不是上限**：它查不出交互正确性、医学口径、装机是否真加载。那些仍按 V2 装机与 V3 业务闭环走。
- 退出码：有 fail 返回 1，可直接接 CI 或 `&&` 串联；纯 warn 返回 0。


三条最容易踩的：**闸口不签不往下走**（G1 需求、G2 原型、G3 schema 各签一次，省下的时间远超一次返工）；**临床库要如实写来源终态**，没查到就是"未配置/无覆盖"，不能写成"已查过"；**×ULN 类指标缺参考上限就写"需参考上限"**，不拿成人通用值凑倍数（详见 [23](docs/23-METRIC-GRADING-AND-ALERTS.md) §2.1）。

### 要一份进度汇报时

用户说「看进度 / 到哪了 / 汇报一下 / 更新进度条」→ 整段套用 [prompts/PROGRESS-REPORT.md](prompts/PROGRESS-REPORT.md)，不要临场另拟一套说法。它规定两件事：

- **先读再写**：VERSION / `docs/DEV-PLAN.md` / `docs/SIGNOFF-*.md` / `docs/RELEASE.md` / CHANGELOG 顶部 / git log -15；读不到就写"缺失"，不猜。
- **四条口径不许放宽**：① 只有"判据可验证"才算完成（DEV-PLAN 判据列写什么就只认那个）② 签认只认用户原话，截图/脚本/自述都不算 ③ 已完成／已执行未验证／未开始三态分开，未验证不许写"已验证" ④ push / tag / 装进 Desktop / 市场上架是四件事。

输出结构 A–G：一句话现状 → 进度条（M0–M9 + G1–G3，闸口没过画成卡点不画成进度）→ 里程碑表（判据照抄 DEV-PLAN）→ 用户能感知的 2–4 件事 → 踩过的坑（症状/根因/怎么修/以后怎么防）→ 下一步三步（卡在谁身上）→ 未验证与外部依赖清单。

本文件**不代替 DEV-PLAN**：两者数字打架时以 DEV-PLAN 为准，并当场修正 DEV-PLAN；也不代表发布许可。

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
| **从一个癌种名到可运行开发版（init→强约束→调研/schema/多通道临床库/原型→开发版→dsh-desktop 实测→回流）** | [ZERO-TO-DEV](prompts/ZERO-TO-DEV.md) |
| **三阶段×三闸口开发流程速查（必记心智模型，G1/G2/G3 签认规则）** | [22-PHASES-AND-GATES](docs/22-PHASES-AND-GATES.md) |
| **罕见病/新病种调研手册（设计→执行→输出，证据分级）** | [21-RESEARCH-PLAYBOOK](docs/21-RESEARCH-PLAYBOOK.md) |
| **指标分析与卡片提醒：分组、CTCAE v5.0 分级对照（含 ×ULN 型）、两侧并置提醒** | [23-METRIC-GRADING-AND-ALERTS](docs/23-METRIC-GRADING-AND-ALERTS.md) |
| **指南接进工作台：出处 / 适用 / 节奏 / 分级四层刻度尺（含登记三处一致、不取严、版权边界）** | [25-GUIDELINE-BRIDGE](docs/25-GUIDELINE-BRIDGE.md) |
| **功能线框架与跨癌种对比：十条候选线各回答哪句患者原话、与成熟癌种逐行对比、家属早筛只提示不判定** | [26-CANCER-FEATURE-LINES](docs/26-CANCER-FEATURE-LINES.md) |
| **多轨并列与指标卡：A/B/C 轨怎么分、卡片正反面结构、3D 翻面合同、窄屏先变列数再变密度** | [27-TRACKS-AND-METRIC-CARDS](docs/27-TRACKS-AND-METRIC-CARDS.md) |
| **交互路径设计：每个场景一条看板入口→步骤→产物→回首页、CRUD 双通道（AI 协助默认、手工收敛、删除=更正），HTML 开工前置** | [28-INTERACTION-PATH-DESIGN](docs/28-INTERACTION-PATH-DESIGN.md) · [30-RESPONSIVE-RULES](docs/30-RESPONSIVE-RULES.md)（窄宽自适应） + [模板](templates/INTERACTION-DESIGN.md) |
| **材料导入链路：嗅探→取行→闸门→抽候选→落库五段、闸门三级证据（原发灶>部位词>指标组合）、候选≠指标的五条确认规则** | [29-DOCUMENT-IMPORT-PIPELINE](docs/29-DOCUMENT-IMPORT-PIPELINE.md) |
| 包声明、注册、原生会话、宿主边界 | [02-DSH-CONTRACT](docs/02-DSH-CONTRACT.md) |
| 社区风格、Logo、UI/UX 技能、图表/动效 | [03-DESIGN-SYSTEM](docs/03-DESIGN-SYSTEM.md) |
| SQLite、可扩展指标、来源与文件目录 | [04-DATA](docs/04-DATA.md) |
| 给我建议、技能/MCP、离线数据与结果回流 | [05-AGENT-AND-RESOURCES](docs/05-AGENT-AND-RESOURCES.md) |
| 顶部目录/会话状态、绑定绿灯与切换竞态 | [09-WORKBENCH-STATUS](docs/09-WORKBENCH-STATUS.md) |
| 本机安装验收、GitHub Release、Awesome Workbench 市场 PR | [10-MARKET-PUBLISHING](docs/10-MARKET-PUBLISHING.md) |
| 任务分层、原型一致性、产物检查与可选视觉方案 | [11-REUSABLE-PATTERNS](docs/11-REUSABLE-PATTERNS.md) |
| 可选高德POI、Key配置、地图/坐标与结果校验 | [12-AMAP-POI](docs/12-AMAP-POI.md) |
| **PDF 报告云端解析（MinerU）：开发原则、设置页维护 Token、抽取纪律与表格对齐** | [18-MINERU-PARSING](docs/18-MINERU-PARSING.md) + [对齐示例](examples/mineru-labparse-align.mjs) |
| **交付前的家族一致性检查（版本/面板/检查链/文档/密钥）** | `dsh-wb-cli audit <项目>` · [22-PHASES-AND-GATES](docs/22-PHASES-AND-GATES.md) |
| **发布之后回填组织 BACKLOG 状态（M8）：状态词表、只改哪两列、🟢 只认三层全过** | [31-BACKLOG-STATUS](docs/31-BACKLOG-STATUS.md) |
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


指标页复用入口：[分类指标趋势Tab与3D卡片规范](docs/24-METRIC-TREND-TAB-DESIGN.md)；包含两张开发者参考图、导航映射、可比读模型、翻面CSS、状态矩阵与MT01–MT15验收。配套 `prompts/METRIC-TREND-TAB.md`、`templates/METRIC-TREND-SPEC.md`，init会生成项目`docs/METRIC-TREND-SPEC.md`。
