## 2026-10-25 · 1.5.7 界面加载核验随 init 下发：分清「装到哪个 app」与「旧日志不算数」

装完包之后「界面到底加载了没有」是家族里反复踩的坑，两种误判各踩过一次：

1. **装进另一个 app 的 profile**：本机可能同时装着 `DSH Desktop.app`（工作台产品，
   profile 在 `Library/Application Support/dsh-desktop/harness/profiles/web`）与
   `DeepSeek Harness.app`（Agent 宿主，profile 在 `~/.dsh/profiles/desktop`，bundles 里 0 个工作台）。
   装到后者，重启一万次也不会加载。判据不是路径像不像，而是**目标 profile 里有没有别的兄弟工作台**。
2. **把旧日志当新证据**：`harness.log` 里 `[renderer] …` 行**不带时间戳**，
   上一版的 `did not activate` 会永远留在文件里。必须先用最后一条 `Harness process exited`
   把文件切成「上次运行 / 本次运行段」，只看本次段；且 `did not activate` 这行**不带包名**，
   只按包名过滤会漏掉整条信号。

下发 `scripts/verify-desktop-load.mjs`（`npm run verify:desktop`）：只看宿主痕迹——本次运行段、
装机 mtime 与启动先后、`dshHomePath` 数据目录、`desktop-workbenches/state.json`、profile 里的兄弟工作台数。
退出码 0 已加载 / 1 激活失败 / 2 未运行或未重启 / 3 已重启无加载迹象。
路径可用 `HN_HARNESS`、`HN_LOG` 覆盖（否则脚本无法自证）；测试含五条反例（未运行 / 旧日志不算数 /
本次段失败 / 装错 profile / 已加载）。生成文件数 173。

# 变更记录

## 2026-10-25 · 新增 prompts/FULL-CYCLE-KICKOFF.md v1.0（M0–M9 全流程启动提示词）

六轮实战（GBM/MPM/THY/MEL/MM/ENDO）收敛为一键启动提示词：

- **自动领取**：BACKLOG 选型规则（T0/T1、结构化、差异化）+ issue 模板（判定卡+差异化矩阵）+ /claim + 建仓 + init + 接线前置。
- **M0–M9 全表**：新增 M8（BACKLOG 回填，先 pull 再 PR）与 M9（**经验收敛五步，默认执行不等催**：项目追补→LESSONS→规范/prompts→检查器→CHANGELOG）。
- **新规则全量挂钩**：28 交互路径 / 30 窄宽 / 32 治疗线折叠卡 / 33 README 截图 / 06 六类装机失败 / 七步移植 / 独立评审 / HVT / computed fill / apiBase 定稿契约 / 首用会话授权。
- **回流长效机制**：每轮至少一条"下一轮直接受益"；可断言 > 文档 > 口头；模版化优先；回流后跑 starter 自检。

## 2026-10-25 · 新增 32/33 号：治疗路径折叠卡模版 + README 截图规则（默认生效）

两件均从用户真机反馈回收：

- **`docs/32-TREATMENT-PATHWAY-FOLDOUT.md`**（MEL 小痣宝）：每病情阶段=折叠卡，默认「阶段·日期·一句话概要」，展开固定五块（方案/指标和趋势/影像发现/副作用总结/心理营养措施与效果）；原生 details 零 JS；**打印必须展开**；数据形状与 6 条验收断言。参考实现 melanoma-workbench v0.3.1。
- **`docs/33-README-SCREENSHOTS.md`**（用户 2026-10-25 指示，**默认生效**）：测试截图入 README 说明关键功能——何时截（G2 后原型、M6 后真机、发版前刷新）、截哪 5 类（看板/癌种差异首屏/一图秀/红线页/折叠展开态）、放 `docs/screenshots/` 命名 `readme-<功能>-<版本>.png`、质量与红线（1440/真实渲染/无 PII/私密不入图）、README 固定五段结构、`check-readme-assets.mjs` 验收。
- 挂钩：ZERO-TO-DEV §2.4 交付清单、CANCER-KICKOFF M6 流程。

## 2026-10-25 · 1.5.6 激活烟测随 init 下发：真跑 apply()，复刻宿主 7 条 register 校验

1.5.4 把宿主的静态校验抄成了 `check-host-contract.mjs`（正则比对字面量）。它拦得住写错数字，
拦不住 `apply()` 里任何一处抛错——而 `web boot: 1 entry did not activate` 这两种都会报。

新增 `templates/smoke-activate.mjs` → 派生项目得到 `scripts/smoke-activate.mjs`：
桩件喂 `window.__ModuleLoader__` 与 `ctx`，真跑 `factory(require)` → `apply(ctx)` → `register(descriptor, Component)`，
并按宿主原文逐条校验 title / Component / repository 正则 / customFrame / headerLayout / businessSide / businessWidth。

- 接进派生项目的 `npm run check`，另有 `npm run smoke:activate` 单独跑
- **反向对照随措辞一起下发**：把 `businessWidth` 改成 0.72（真实崩过 Desktop 的值）必须退出码 1
- 证据等级写清：桩件复刻的是**规则**不是宿主运行时，只能证明「描述符合法、apply 不抛」，
  不证明「渲染进程加载成功」——后者只有重启 Desktop 能验

`npm test` 39/39。

## 2026-10-25 · 1.5.5 参考图不再随包：assets/ 只放运行时要用的东西

`assets/reference/metric-trends/{breast-records,lymphoma-metrics}.png`（1.1MB）是**设计参考**，
只被 `docs/24-METRIC-TREND-TAB-DESIGN.md` 引用，零运行时代码引用。但它在 `assets/` 下，
而项目的 `files` 含 `assets` → 每个新生成的癌种工作台都白带 1.1MB，
患者机器上还会躺着一张**乳腺癌记录截图**（与本品癌种无关，也不在 `assets/manifest.json` 里登记）。

移到 `docs/assets/metric-trends/`：`docs/` 本来就不随包，`docs/24` 的相对引用照旧成立。
`init` 会把它们放进新项目的 `docs/assets/`，不进发布包。
实测：新生成项目 `npm pack` 的清单里 `metric-trends` 命中 0。

**判据（写给后续加素材的人）**：`assets/` 只放运行时要用的东西；
只在文档里出现的图放 `docs/`。顺带一条——`assets/` 下没在 `manifest.json` 登记的文件，
过一遍再决定留不留，未登记的素材既说不清来源，也没人负责它的授权。

## 2026-10-25 · 1.5.4 「本地全绿、装进去能活」是两套校验——宿主注册契约随包下发

头颈癌工作台（head-neck-workbench）装进 Desktop 后**整机起不来**：渲染进程报
`web boot: 1 entry did not activate` + `<包>: failed`，没有栈、没有字段名，
随后 `plugin-recovery` 自动把插件从 profile 卸掉，app 才恢复。

根因是宿主 `desktopWorkbenches.register()` 里的一条硬校验：
**`0.25 ≤ businessWidth ≤ 0.7`**。项目写了脚手架惯用的 `0.72`，`> 0.7` → throw →
插件 `apply` 失败。**这条校验只在渲染进程里，本地 `check` / `test` / `audit` 一条都覆盖不到。**

### 修了什么

1. **`check-conformance.mjs` 的上限从 0.75 收到 0.7**。原来写 `width > 0.55 && width < 0.75`——
   比宿主上限还宽，等于给越界值放行。这是闸门本身写错，比没有闸门更糟：它给了"已检查"的错觉。
2. **`init.mjs` 对两种布局都校验 businessWidth**。原来只在 `layoutMode === 'split'` 时校验
   `0.25..0.7`，`business-first`（自定义外壳，宽度写在 `lib/client.js` 的 `BUSINESS_WIDTH`）完全不校验。
3. **新增 `templates/check-host-contract.mjs` 并随 init 下发**（`npm run check` + `npm run check:host`）：
   把宿主 7 条 `register()` 校验复刻成本地闸门——title/Component、repository 必须是 GitHub URL、
   customFrame 布尔、businessSide 枚举、**businessWidth ∈ [0.25,0.7]**、headerLayout 枚举、
   业务区宽度 + 会话默认占比 ≤ 1。同时认 `const BUSINESS_WIDTH = n` 与 `"businessWidth": n` 两种写法。
4. `test/starter.test.mjs` 补 2 条：派生项目里闸门跑得起来、`check`/`check:host` 已接线；
   拒绝清单加 `business-first` 的 0.72 与 0.2 两个越界值。

### 验证（双向，不是单向绿灯）
- 正例：`businessWidth: 0.68` → 派生项目 `check-host-contract.mjs` 退出码 0。
- 负例 1：注入 `"businessWidth":0.72` → 退出码 1，点名 `businessWidth=0.72 超出宿主硬区间 [0.25, 0.7]` + 宿主原文。
- 负例 2：repository 改成 `https://gitlab.com/...` → 退出码 1，点名 `不是合法 GitHub URL`。
- starter 自身 `npm test` **38/38**、`check-starter` **167 文件 pass**。

**给后续项目的判据**：凡是「装进去才崩、崩得没细节」的，第一反应应当去宿主源码里把它那几条校验
抄下来变成本地闸门，而不是继续在本地加更细的业务自测——本地自测测的是你以为的合同，不是宿主的合同。

## 2026-10-25 · 1.5.3 整页视图（32 号）——内容多的东西不再塞弹窗

来源：用户评审 `dsh-shopping-workbench` 后的原话——「注意点击打开新页面，空间和内容更加丰富的设计，页面关闭后返回工作台主页或前一页。这个设计很不错，保留到脚手架，现有弹窗空间太小，功能无法扩大。」读源码后确认：参考仓库本身是 `<dialog class="drawer">` 做成近整页（`inset:12px` + `height:calc(100dvh-24px)`），**没有"返回前一页"**，那一层得自己补。

- **新增 `docs/32-FULL-PAGE-VIEW.md`**：三层视图模型（主页/整页/二级整页）、弹窗与整页的**唯一判据**（内容超 1.5 屏或需分区 → 整页）、布局规格写死（`inset: clamp(8px,1.2vw,16px)`、56px sticky 顶栏、1180px 内容宽、只有 `.pv-body` 滚、≤760px 整屏）、焦点/滚动/减少动效四条、**A1–A10 验收表**与五条反例。
- **新增 `assets/patterns/page-view.js` + `page-view.css`**：无依赖参考实现。导航栈 `open/back/close/home`，**history 是唯一真源**；Esc 一层一退；`#page=` 深链；每层记住自己的 `scrollTop`；关闭后焦点回触发者。
- **新增 `examples/page-view.html`**：三层可点演示，`file://` 之外走本地端口即可（ESM 需 http）。
- **新增 `scripts/probe-page-view.mjs`**：A1–A10 共 13 条真 Chrome 断言 + `--self-test` 反向对照，随 `init` 下发、`package.json` 加 `probe:page-view`。**实测抓到三个真问题**：① `back()` 用 `replaceState` 假装退栈 → history 多出一条假位置，浏览器返回键退到错位（改 history 驱动）；② 鼠标点击在多浏览器不给按钮焦点，只记 `activeElement` 会让 A4 形同虚设（补 `pointerdown` 落点兜底）；③ 探针自身两处错对象——`page.click` 会先 `scrollIntoView` 把主页滚回顶部（A5 永远测不出真问题），带 hash 的 `goto` 属同文档导航、模块不重跑（A7 假失败）。修正后 13/13 绿，自测 3 条 FAIL。
- **`templates/FULL-PAGE-VIEW.md`** 项目实例模板（形态判定表/整页清单/导航口径/分区表/A1–A10 证据表），`init` 生成 `docs/FULL-PAGE-VIEW.md`。
- **入口接线**：AGENTS.md 新增「整页视图」硬约束段（返回与关闭两个入口、回原滚动位置、Esc 与返回键只退一层、禁止 `replaceState` 假退栈）；`prompts/ZERO-TO-DEV.md` §1.4 加进原型必查件；`docs/07` 补「容器形态：先定弹窗还是整页」；`assets` manifest 与 README 同步。
- **补 `examples/page-view-standalone.html`（同日追加）**：ES module 在 `file://` 下被 CORS 拦，而家族硬要求是「原型双击 `index.html` 就能开」——两者冲突。所以单文件演示把 `export ` 去掉、包 IIFE 挂 `window.createPageView`、CSS 内联，真 Chrome 以 `file://` 实测能开、0 error。**原型里不要 `import`，要内联**，写进 32 号与 AGENTS。
- **`docs/LESSONS.md` 追加第 14 类**：导航栈不能"看起来退了"——`replaceState` 会让 URL 与返回键错位，验收必须在真浏览器上按返回键。

## 2026-10-25 · 1.5.2 产物级页签验收随包下发 + 教训 11/12/13

来源：头颈癌工作台（`head-neck-workbench`）M5/M6 实测——三个缺陷都不是「代码写错」，而是**验收位置错了**：一直在源码树上验，没有在装进去的那一份上验。

- **新增 `project-template/scripts/serve-artifact.mjs`**：把**装机副本**（或解包目录）的 UI + API 挂到本地端口。与 dev-server 分工写清：dev-server 服务源码树（改代码看效果），serve-artifact 服务产物（交付前证明装进去能干活）。骨架阶段没有 `dsh/server.js` 时给出人话提示并 exit 1，不静默跳过。
- **新增 `project-template/scripts/verify-tabs-on-artifact.py`**：真 Chrome 把所有一级/二级页签**逐个点开**，判据 = 0 未捕获异常 / 0 console error / 0 失败请求 / 无「尚未实现」空态 / 390 宽不溢出。`--navs` `--tabs` 校验页签数。连不上服务时提示「先跑 serve-artifact」，不出 traceback；缺 playwright 时 exit 2 并明说「跳过等于没有这条闸门」。
- **新增 `project-template/test/pack-contents.test.mjs`**：以 `npm pack --dry-run --json` 真实清单为对象断言 `public/`、`schema/migrations/*.sql`、`assets/`、`lib/client.js`、`cordis.patch.yml` 在包里；并断言「`Config` 声明了 `root` 时 patch 必须给 `config.root`」。**自适应**：项目还没长出对应目录就跳过，长出后自动开始保护。
- **`scripts/init.mjs`**：manifest 新增 `probe:artifact` / `probe:tabs` 两个脚本；实测新项目 154 文件（原 151+3），`npm run test` 4/4 绿。
- **`scripts/check-starter.mjs`**：三件加入必备清单，防止以后被误删。
- **`verify-tabs-on-artifact.py` 加垃圾值断言**：只断言「页签不空」不够——映射漏字段的典型症状是**渲染成功但内容是 `undefined`**，比整页崩溃更危险（崩溃会被发现，垃圾值会被当成真数据读走）。判据加 `undefined` / `NaN` / `null` / `[object Object]`。**并做了反向对照**：向产物注入 `'undefined'`，闸门必须 FAIL 并点名具体页签——只报绿不报红的闸门等于没有闸门。
- **`docs/LESSONS.md` 追加三条**：11 约束失败不能漏成 500（500 与 4xx 是「谁的错」的线）；12 `Already up to date` 不等于内容最新（版本号 ≠ 内容，换包先 remove 再 add，装完 `diff -r` 验）；13 原型能开 ≠ 接上数据库还能开（漏读子表 + 默认对象必存在；演示档案要故意缺几样东西，否则空态全被遮住）。

## 2026-10-24 · 06 号补「第 6 类：首用会话授权」+ MPM v0.1.3 发布

- 小胸宝（MPM）真机首用发现：新装工作台未建会话时宿主鉴权闸拒 API（离线演示兜底）+ 会话区空白，误似"AI 按钮失效"。装机探针（probe:install）证明服务层全通后定位为宿主状态，非缺陷。06 号装机节补第 6 类与 V3 首动作。
- MPM v0.1.3 发布（release + BACKLOG PR #15 🔵）；probe-install 探针 fork 模式（attr → MPM）验证为家族可复制资产。
- **同日追加 · 第 8 类：曲线平滑算法**——smoothPath 原为普通 Catmull-Rom（切线不随 x 间隔缩放），在**不均匀采样间隔**下（THY 长程复查 2 周–4 月混杂）密集点过冲出尖角（用户真机指认）。重写为 **Fritsch-Carlson 单调三次 Hermite**（过点/防过冲/间隔安全，符合 16 号"单调三次插值"本义）；GBM/MPM 均匀采样未暴露同款弱点，下轮迭代升级。同时第 7 类教训继续有效：探针待实施⑥补"曲线平滑性"断言（相邻控制点二阶差分阈值）。——M2 手写 chart 模板漏 `class="chart"`，`.chart .line{fill:none}` 全部不匹配，path 回退默认黑填充（用户真机发现）。探针 chart 断言只数路径数量不断言视觉——**"数量对 ≠ 颜色对"**；检查器待实施⑥：probe 加 computed fill 断言；CSS 清理禁逐行 token 删（必须引用验证+括号平衡+渲染验证三重）。

## 2026-10-24 · 新增 prompts/PROGRESS-REPORT.md（进度汇报口径，随 init 下发并激活）

来源：小甲宝 ATTR 仓的 `docs/PROGRESS-REPORT-PROMPT.md` 被用户点名上收到脚手架——「看看现在到哪了 / 更新下进度条」这类请求在家族里出现频率很高，但每次口径都不一样，容易退化成"我觉得差不多了"。

- **新增 `prompts/PROGRESS-REPORT.md`**：先读（VERSION / DEV-PLAN / SIGNOFF / RELEASE / CHANGELOG / git log -15，读不到写"缺失"不猜）→ 四条口径（**判据可验证 / 签认只认原话 / 三态分开写 / push≠发布**）→ A–G 结构输出（一句话现状、进度条 M0–M9 + G1–G3、里程碑表、用户能感知的 2–4 件事、踩过的坑四段式、下一步三步、未验证清单）。附精简版、换仓只改三处、以及**「这条提示词不是什么」**（不代替 DEV-PLAN、不自证、不是发布许可）。
- **激活四处**（不是只放一个文件）：
  - `prompts/CONTINUE.md`：用户说「继续 / 看进度 / 汇报」时自动套用，不临场另拟说法；
  - `prompts/ZERO-TO-DEV.md`：阶段汇报条补一条——要正式汇报时整段用它，四条口径不许在本轮放宽；
  - `docs/22-PHASES-AND-GATES.md`：「最容易踩的坑」5 → 6 条（第 6 条：进度靠"我觉得差不多了"），并新增「要一份进度汇报时」小节；
  - `README.md`：顶部快照 + 「要一份进度汇报时」小节（四条口径 + A–G 一览）。
- **`scripts/init.mjs`**：输出里新增 `progressReport` 路径，`init` 后 Agent 能直接读到该文件；`prompts/` 整目录本就随 init 下发，实测生成的新项目里 6.0 kB 的 `prompts/PROGRESS-REPORT.md` 存在、`npm run check` 绿、`npm run audit` 基线仍是 17/30（不因新增提示词改变）。
- 分工写清：**判据与状态的唯一来源仍是 `docs/DEV-PLAN.md`**，本提示词只管"怎么讲给非工程读者"；两者数字打架以 DEV-PLAN 为准，并当场修正 DEV-PLAN。

## 2026-10-24 · 装机面第 7 类失败：装进去的还是旧包（ATTR 踩 7 回收）

来源：小甲宝「先不发布、用 tar 包安装测试」这一轮。同版号重打包后 `pnpm add -w file:<tgz>` 打印 **`Already up to date`**、退出码 0、无警告；`package.json` 版本对、lockfile 的 `integrity` **也已是新包的**，但 `node_modules/<pkg>/` 下仍是旧文件——**探针加载旧副本、45 项报绿，验的根本不是刚打出来的包**。

- **`docs/06-VALIDATION-AND-RELEASE.md` 新增「装机面第 7 类失败」**：现象 / 根因（`file:` 按路径解析 + 同版本不重链）/ 为什么比前六类更危险（症状是"绿"，不是"坏"）/ 对策三步（删副本重链 → 逐文件比对 tgz 与副本 → 入口文件逐字节一致）。明写**这条静态查不出来**，只能进流程 + 脚本，不进检查器——不是所有教训都能长成闸门。
- **`docs/LESSONS.md` 记踩 7**：附元教训「"改了没生效"的排查顺序是 副本内容 → 包内容 → 源码，不是从源码往回猜」；并记 shasum 同版重打每次都变，**shasum 不能当版本号用**。
- **`prompts/ZERO-TO-DEV.md` 阶段 3 补第 11 步**：同版号重打包后必须验副本内容，参考实现指向 `attr-workbench/scripts/install-local.mjs`。
- 这一步同时给出**不发布也能验**的路径：`npm run install:local` 一条命令走完 pack → 装 profile → 逐文件比对 → 探针。M8（回填组织 BACKLOG）在 ATTR 侧按用户要求暂缓，流程文档不动。

## 2026-10-24 · 新增 prompts/CANCER-KICKOFF.md v2.0（发起层提示词）+ ZERO-TO-DEV 补独立评审节

应发起人要求，基于 GBM（四连踩全过）与 MPM（评审 P0=0 一轮通过）两轮实践优化"发起开发提示词"并保存：

- **新增 `prompts/CANCER-KICKOFF.md`（v2.0）**：用户 → 开发会话的标准开场——四个填空（病种/目录/**移植样板按 client 链路成熟度选 + 成熟基准固定 breast**/认领流程）、四条总原则（新增第 4 条"约定必须有测试与语境栏"）、**患者视角红线**、互动规则（4 问 + 不答按推荐项执行可回退）、M0–M7 闸口表、M1–M7 汇报节奏（5 行内/闸口单独签认/待拍板清单）、技能与模型路由（主线 GLM-5.3 + 批量 Flash，质量闸口永不降级）、**两轮实战发起期避坑速查表 8 条**。
- **`prompts/ZERO-TO-DEV.md`**：新增 §1.7 **独立评审**（独立子代理 / 13 项检验单 / 评审对象=git HEAD / P0 修复留痕后签认 / 复跑走查脚本核对自报数字 / 评审员只写 DESIGN-REVIEW）；§1.4 补 HVT X 层（X 任一不过 G2 不签）与窄宽（30 号）两件标准件；头注指向发起层。
- 分层定稿：**CANCER-KICKOFF=发起层**（任务定义/互动/汇报），**ZERO-TO-DEV=执行层**（规程/验收/清单）——下一癌种开场直接复制 KICKOFF，执行细节引用 ZERO-TO-DEV，不再依赖会话记忆。

## 2026-10-24 · M9 回流闭环：把 ATTR 装机双踩做成检查器的四条装机面规则

来源：小甲宝 ATTR v0.2.1/0.2.2 装两次白两次（包里少模块、静态资源被兜底）。四要素全过、`check` 全绿、296 视图 0 问题，仍然装不上——说明**文档型判据不够用**，必须变成机器会红的检查才留得住。用户点名要做 M9 闭环。

- **`scripts/check-workbench-package.mjs` 增加四条装机面规则**（随 `init` 下发、`npm run check` 自动跑）：
  ⑤ `Config` 声明 `root` ⇒ patch 必须有 `config.root: !!js dshHomePath(...)`；⑥ 运行期相对 import/require 的落点必须在 `files` 白名单内；⑦ 有 `public/` ⇒ 必须被 `files` 覆盖；⑧ UI 挂子路径 + 页面相对资源 ⇒ warn。
- **一次关键返工**：⑤ 第一版写成"patch 必须含 `config.root`"，横测把肝癌仓判 fail——它**故意**用 `dbPath` 指向仓内演示库。收窄为"自己声明了 root 才要求注入"后，肝癌恢复 pass，宫颈（`Config.root` 有、patch 没注入）被正确点名。这是「禁止把个案推广为规则」的现场复现。
- **回归写两半**：新增 `test/checker-install-surface.test.mjs` 六条（必须报 4、必须不报 2，含 dbPath 型不点名）。starter 测试 31 → 37 条全绿。
- **docs 三处同步**：`docs/06-VALIDATION-AND-RELEASE.md` 新增「装机面第 5、6 类失败」（含 dev 语境 vs 宿主语境四点差异表 + 静态四规则表）；`docs/LESSONS.md` 记踩 5/踩 6 与规则边界，并把 GBM 那条「待实施③」标为已实装一半；`prompts/ZERO-TO-DEV.md` 阶段 3 补第 9、10 步（静态检查要绿 + 对装机副本跑探针）。
- **横测七仓**：attr / glioblastoma / liver / lung / ovarian 通过；cervical 抓到真实缺陷（缺 `config.root`）；breast 两条既存 fail 与本次规则无关。
- **挂账**：⑧ 只能 warn（要判定得真发一次 `GET /api/<slug>/ui/app.js`）；装机副本探针尚未模板化；LESSONS ①②④ 仍未实装。

## 2026-10-24 · 新增 31-BACKLOG-STATUS：发布之后回填组织 BACKLOG（M8，病种无关）

来源：小甲宝 ATTR 工作台 v0.2.3 装机通过后，M7 发布完发现**没人把进度写回组织目标池**——外部贡献者看到的还是"🟡 未开工"。用户点名要求把这一步固化成 M8 并同步进脚手架流程。

- **新增 `docs/31-BACKLOG-STATUS.md`**：状态词表（⬜/⚪/🟡/🔵/🟢，🟢 只认 V1+V2+V3 三层全过）、只改状态与招募两列（序号/病种/页码/级别不动）、状态列必须带版本号与日期、走 PR 不直推 main、合并后回填项目 `RELEASE.md`、未达 🟢 不许说"已上架"。
- **接入流程**：`prompts/ZERO-TO-DEV.md` 新增「阶段 5（M8）：回填组织 BACKLOG 状态」六步；`docs/22-PHASES-AND-GATES.md` 的流程图与 Phase 映射表各加一行，并把"发布完还有一格"写进「最容易踩的 5 个坑」第 4 条；README 文档索引加一条。
- **项目侧落法**（ATTR 为样板）：`docs/DEV-PLAN.md` 增加 M8 里程碑 + 「本仓库对应的那一行」三时点对照表；`docs/RELEASE.md` 动作表增加「组织 BACKLOG 状态」一行。
- 硬口径：**"PR 已合并"≠ 可用**；状态单向推进，回退要写原因；仓库 private 导致的链接 404 属预期，不为了"链接能点"改可见性。

## 2026-10-24 · 新增 30-RESPONSIVE-RULES：窄宽自适应规则（病种无关）

从小星宝（GBM）v0.1.5 实机修复回收（用户点名沉淀；用户判语："别让卡内元素横向互挤"）：

- **新增 `docs/30-RESPONSIVE-RULES.md`**：六条硬规则（卡内纵向堆/grid+minmax(0,1fr)/行内标签不作 flex item/min-width:0/scroll-hint/短 token nowrap）+ 三档断点 + 探针扫描规则（竖排单字/横向溢出/内容被裁）——全部病种无关，罕见病工作台直接适用。
- 核心认知：customFrame 下 `@media` 量到的是**业务区宽度**不是窗口宽度；断点按"业务区能放下什么"定。
- 接入时机：M2 无头走查即纳入（与 HVT X 层同场），M6 真机复扫。
- 参考实现：glioblastoma-workbench `docs/RESPONSIVE-RULES.md` + `scripts/probe-responsive.mjs`。

## 2026-10-24 · 家族一致性 audit：把横向对照变成可执行检查

背景：对四个新开发项目做横向对照（都按代码实测，不看文档自述），缺口高度重复——`lib/layout.js` 缺失或 `customFrame` 未开、版本生成物缺失、`npm run check` 只做语法与包合同、强约束文档没建。这些是"文档写了、项目没做"的典型，靠人逐台看会漏。

- 新增 `scripts/check-conformance.mjs`：五组约 37 项，只读文件与源码。版本（`VERSION` / `package.json` / `lib/version.js` / 页面字面量 / CHANGELOG）｜面板（`layout.js` 唯一来源、`customFrame: true`、`businessWidth` 0.55–0.75、`AGENT_PANE` 25%–45%、避让 `--dsh-frame-leading-clearance`、会话区常挂载、`currentSession`/`ownsSession`）｜检查链（语法/单测/版本/schema/文案红线/装机自检/用例文件）｜文档（AGENTS、SPEC、DIFF-MATRIX、DEV-PLAN、SCHEMA、`DEV-REQUIREMENTS-<日期>`、freeze-contract、prototypes/v0.2）｜密钥（MinerU 申请地址、`.gitignore` 的 `.secrets`、Token 解析函数里文件先于 env、有保存实现、无 `sk-` 明文）。
- CLI 新增 `dsh-wb-cli audit [项目目录] [--json]`；`npm run audit` 同义；`npm run check` 增加对该脚本的语法检查；`check-starter.mjs` 把它列入必需文件。
- 文档接入：`prompts/ZERO-TO-DEV.md` 新增「交付前最后一道：家族一致性 audit」（含"fail 不交付 / warn 逐条给结论 / 脚本是下限"三条规则）；`docs/22-PHASES-AND-GATES.md` 增加「家族一致性 audit（V1 之后的第二道静态闸）」；`templates/ACCEPTANCE.md` 增 ACC-00；README 五步流程与文档索引各加一条；AGENTS.md 增一条硬规则。
- 判定细节（都来自真实误报修正）：`AGENT_PANE` 同时接受百分比 25–45 与比例 0.25–0.45；避让量允许出现在 `public/shell.css`（标准分栏由页面自己避让）；"会话区常挂载"只要求"渲染了 conversation + 用 display 且出现 'none'"，不把 `conversation ? ... : null` 误判成条件渲染；Token 优先级只在"同时读文件与读 env"的那个函数里比位置；`sk-` 明文扫描豁免同行标 `secret-allow` 的夹具。
- 首次实测（2026-10-24）：胶质瘤 0.1.5 全通过（37/37）；食管 0.1.0 3 fail（`customFrame:false`、缺 DIFF-MATRIX、缺 DEV-PLAN）；宫颈 0.1.1 2 fail（缺 DIFF-MATRIX、DEV-PLAN）；膀胱 0.1.0 13 fail（无 VERSION/CHANGELOG、无 layout、check 只做语法）；肝癌 0.3.2 7 fail（无 version.js/layout、check 只做语法）。这批数字写进 `docs/22` 作为"为什么需要这条命令"的依据。
- **随生成项目下发（2026-10-24 补）**：`init` 现在把 `scripts/check-conformance.mjs` 复制进新项目，`package.json` 增加 `audit`（`node scripts/check-conformance.mjs .`）与 `release:check`（`check && audit`）；同时补发 `VERSION`（0.1.0）与 `CHANGELOG.md` 首条（记录脚手架名/版本/revision），让"版本唯一来源"从第 0 天成立。**没有把 audit 挂进 `check`**——实测裸生成项目 audit 有 11 项 fail（`version/lib`、`panel/单一来源`、check 链四项、`test/` 无用例、DIFF-MATRIX、DEV-PLAN、强约束），挂进 `check` 会让新项目第一天就是红的，开发者会练成忽略它。分工是：`check` 第一天必绿（语法 + 装包合同）、`audit` 是交付闸口、`release:check` 一次跑完两者；`templates/RELEASE.md` 加了一行"家族一致性结果"，`project-template/README.md.tpl` 写明两者区别。新增单测 `test/starter.test.mjs` 末条：生成物必须含 VERSION/CHANGELOG/audit 入口，且在生成目录里跑 `scripts/check-conformance.mjs .` 必须是"查出 fail"（exit 1）而不是崩溃（无 `Cannot find`/`SyntaxError`），`--json` 输出可解析且 `panel/单一来源` 在 fail 里。
- **扫描口径两处修正（2026-10-24，小胰宝 0.1.34 实证）**：①`mineru/Token 优先级` 之前把**参数默认值**里的 `tokenFromEnv = process.env.MINERU_TOKEN` 当成"先读环境变量"，把小胰宝这个正确实现（文件优先）误判为 fail；改为只看函数体（`bodyAfterSignature`），签名里的默认值单独按"参数名在体内的使用位置"计入顺序。②`hygiene/无密钥` 之前把随包公益 Token（`dsh/community-token.js`，头注释写明 intentionally shipped/public）判成泄漏；改为两级——文件头 10 行内声明"随包公益 / 公开凭据 / `secret-allow-file`"的降为 warn（仍需人工确认可公开），无声明的一律 fail。两条都做了反向对照：把 `settings.js` 的两段读取顺序真反转 → 报 fail（`file@147 env@28`）；往 `dsh/leak.js` 写一条裸 `sk-` 明文 → fail，加声明注释后 → warn。

## 2026-10-24 · GBM 装机三连踩回收：宿主接线四要素（文档轮，不改代码）

从小星宝（GBM）0.1.0→0.1.2 装机实踩回收（用户确认缺陷定位并要求沉淀）：

- **`docs/06-VALIDATION-AND-RELEASE.md`** 新增「装机前宿主接线四要素」：`dsh` 块 / patch `config.root` / **真客户端**（build-client 链路产物，非 init 占位骨架）/ 版本簿记（改包必升版）；每项带缺失现象与"对照 tgz 内容查"的验收方法。meta-lesson：**dev-server 能跑 ≠ 装进宿主的包**——dev 语境检查链接不到宿主接线面。
- **`docs/LESSONS.md`** 记 2026-10-24 条目：三连踩全过程与错误来源（404 截图 / 用户"tar包版本号也不对"原话 / "接入骨架"截图）、判据教训（自拟五要素漏"客户端真身"）、检查器三项待实施（client 占位标记禁入 / tgz 变更而 VERSION 未变报错 / package.json 必须有 dsh 块）。
- **`prompts/ZERO-TO-DEV.md`** §2.1 六步移植扩为七项：新增第 7 步"宿主接线件"（接线①② + build:client 链路③ + 版本单源④）。
- 本轮按用户纪律**只记文档不改代码**；检查器四项待实施列入 LESSONS，下轮实现。
- **同日追加 · 踩 4（宿主模式白屏）**：外壳生效后业务区 iframe 白屏，真机控制台抓到 app.js 顶层 throw。根因不在守卫，在注入侧先违约——`server.js` 把含 `/api` 的宿主 basePath 直接当页面基址注入，违反 F3（lymphoma 没爆是因为页面无守卫，不是注入正确）。已补：06 号"第 5 类运行时失败"、LESSONS 踩 4 条目（meta：约定拆两半/无权威范本/dev 零覆盖/顶层 throw 白屏）、ZERO-TO-DEV §2.1 第 4 步注入契约双侧同验。

## 2026-10-24 · 新增 29-DOCUMENT-IMPORT-PIPELINE：材料导入链路五段

从小甘宝（HCC）v0.3.2 回收（用户：「嗅探 → 取行 → 闸门 → 抽候选 → 落库……这个很好的设计，放进去」）：

- **新增 `docs/29-DOCUMENT-IMPORT-PIPELINE.md`**
  - **§0 何时需要导入链路**：四条触发信号（院外材料 / 多院模板 / 扫描件 / 多病种并存）+ 一条反例（院内接口直连是集成不是导入）。
  - **§1 五段与顺序**：闸门必须在抽候选之前；真实事故「胰腺穿刺病理被当成病理报告，腺鳞 panel 落进肝癌 A/B 轨，写进去后每个视图都在错的基线上算且不报错」；另加"决策纯函数 / 副作用落库分离"。
  - **§2 嗅探**：文本层判据 `/Font` **且** `Tj|TJ|Tf`（`pypdf` 对扫描件返回 0 字符且不报错）；`route` 三值含 `unsupported`，没有"直接放弃"。
  - **§3 取行**：只吃 `{text, confidence}` 行数组，OCR 与链路解耦；无行时 `needs_lines` + `pending_parse`，不假装成功。
  - **§4 闸门三级证据**：原发灶措辞 > 部位词计分 > 指标组合（≥2 项）；两处真实误判（`胰腺癌肝转移` 词频 2:1、无器官名的化验单）；长词先匹配并抹除；打平一律 `needs_review`；输出带 `via` 标明靠哪级证据。
  - **§5 抽候选四条硬约束**：不改数（超范围只降置信度）、近似词后行断言排除（前白蛋白 / 直接胆红素）、不换算单位（cm 不转 mm）、不给结论（返回对象不许有 `conclusion/grade/diagnosis`，写成测试）。
  - **§6 落库**：sha256 幂等；确认五条规则；状态机表；`parsed` = 人已看过而非机器解析成功；拒绝理由必须存 `parse_note`；`source_line` 必须落库（第一版漏了）。
  - **§7 接口骨架 + 6 条不变式**（I1–I6，含"reject 时候选必为空""decide 不写库"）。
  - **§8 换病种要改的六处配置**（词表只放一处）；**§9 IM01–IM14 验收**；**§10 五条局限**；**§11 六条反例**。
- `README.md` 索引加 29 号。

## 2026-10-24 · 新增 28-INTERACTION-PATH-DESIGN：HTML 前必备「交互路径文档」+ HVT 新增 X 层一致性检查

来源：用户 2026-10-24 原话——"设计用户每个场景进行细化，设计合理的操作路径，从首页入口开始，到功能完成返回首页，其中对于增删改查，可进行工作台手工操作，默认是 AI 协助，因为大部分患者不懂数据库，编辑功能太多会让交互门槛更高。"首次实践：GBM 工作台 `docs/INTERACTION-DESIGN.md`（13 条场景路径 + CRUD 双通道矩阵，与页面树/场景清单同批签认后进入原型）。

- **新增 `docs/28-INTERACTION-PATH-DESIGN.md`**：交互路径文档 = HTML 原型构建的**前置输入**（无此文档不开 HTML，IP1），三张表才算"有了"——场景路径表（六要素：ID/入口逐字/步骤分 AI 默认与手工/产物可观察/一步回首页/失败恢复；双向覆盖判据**孤儿页 = 0**）、CRUD 双通道矩阵（AI 协助默认：说/拍/PDF→候选→核对→确认，与 18 号 MinerU 候选同心智；手工可及但收敛：每页显式编辑 ≤1、藏「⋯ 更多」、表单 ≤6 字段、数字用键盘组件）、删除=更正语言规范（只新增版本、界面语言"改这一条"、无"不可恢复"、无裸删除）。判据 **IP1–IP10** 进 G2 签认范围。§0 说明为何新立 28 号而非扩展 07 号（流程文档 vs 合同文档，判据需可引用）。
- **新增 `templates/INTERACTION-DESIGN.md`**：新项目骨架（场景路径表 + CRUD 矩阵 + IP 红线清单，空但结构完整，签认时机与 G2 走查对照写进表头）。
- **HVT 技能新增 X 层**（`SKILL.md` 第 4.6 步 + 新参考 `references/interaction-path-consistency.md`，15 号与报告/项目模板同步）：**开发页面与交互设计路径一致性** X1–X4——X1 页面覆盖无孤儿页（`(view,sub)×路径` 穷举双向）/ X2 路径逐字走通（导航 key 一致、产物一致、返回闭环）/ X3 CRUD 通道一致（编辑入口 ≤1、AI 候选闭环、无裸删除）/ X4 无头脚本按文档逐条断言出数字（沿用 LESSONS 2026-10-19 harness）。X 不并入 C（同 P：工作台级属性）；任一 X=0 → G2 不签认、Phase3 parity 不写达标；无路径文档 → X 整体 0 且不得开工。
- **接线**：01（§2 设计环节加一步 + 设计冻结产物含交互路径文档）、22（一张图 Phase1 加"(+交互路径文档)"、Phase1 硬规则与 G2 签认加 IP1/X1–X4、新增第 5 坑"没有交互路径文档就写 HTML"）、19（HTML 构建输入清单加"构建输入先于一切工艺"段）、13/07（HTML 前置一句）、README 索引加 28 号行。
- **prompts**：START / DESIGNER-FIRST / NEW-CANCER-WORKBENCH（§九）/ ZERO-TO-DEV（1.4 开工前置）各加"HTML 前先产出并签认交互路径文档"。

## 2026-10-23 · 新增 27-TRACKS-AND-METRIC-CARDS：多轨并列 + 卡片结构 + 自适应

从小肝宝 v0.2.0–v0.2.1（用户确认「卡片自适应效果、内容结构、A/B/C 轨道思路非常好」）回收：

- **新增 `docs/27-TRACKS-AND-METRIC-CARDS.md`**
  - **§0 何时分轨**：四条触发信号（不同量纲 / 一类限制另一类 / 第三条独立风险线 / 分期并存不换算）+ 一条反例（同量纲不同来源 ≠ 轨道）。
  - **§1 四条硬约束**：永不加总、永不折算、各自独立归一化、分类变量只画节点；附判据「页面若能让用户算出总体几分，说明轨道没分开」。
  - **§2 卡片结构**：正面固定六段（眉题/指标名/值与原单位/较前次差值/一句说明/次数日期来源），背面只有趋势与区间依据；明写"正面不出现什么"。
  - **§3 3D 翻面合同**：CSS 可照抄 + JS 三条（状态存 key、点击只改属性不重绘、组件只有一份），并记录"看板另写近似 markup 漏 `data-code` → 全站静态"的真实事故。
  - **§4 自适应**：两层断点（>960 两列 / <960 一列 / 不做三列），密度退让表（退什么、绝不退什么），三档断言 `{cols,overflow,h}`。
  - **§5 接线**：轨道由数据 `track/group/color` 决定，一张卡只属一条轨，跨轨指标归一条轨并在说明里写另一层含义。
  - **§6 12 条验收**（含 0 级不挂徽章、换页保持、`inert`、reduced-motion、三档断言）；**§7 边界**。
- `README.md` 索引加 27 号。

## 2026-10-23 · 新增 26-CANCER-FEATURE-LINES：功能线框架与跨癌种对比

从小肝宝（HCC）v0.1 → v0.2.0 的功能线补齐中回收。触发是用户一句「功能线少了太多了，对比下乳腺癌，比如营养，心理，病情指标分析」，随后要求把这份对比抽象成换病种可照做的框架：

- **新增 `docs/26-CANCER-FEATURE-LINES.md`**：
  - **§1 三层结构**：线（8–10）/ 二级页（24–30）/ 卡，并给三条走查下限——一级 < 8 或二级 < 20 直接判结构性不足；二级为 0 的一级线 ≥ 3 条判「平铺页」；单线二级 > 6 该拆线。
  - **§2 十条候选功能线池**（L1 看板 / L2 疾病本体 / L3 治疗与决策 / L4 指标分析 / L5 安全与症状 / L6 营养与体重 / L7 心理与家庭 / L8 复诊与随访 / L9 资料与导出 / L10 试验与线索），每条写「它回答的患者原话 / 家族共通度 / 癌种专属部分举例」，并规定**每条线都要显式回答上/不上/为什么，沉默漏掉算失误**。
  - **§3 对比矩阵**（7 个维度 + 判定口径）与 §3.1 小肝宝 v0.1 的真实走查结论。
  - **§4 三条补齐纪律**：不照抄基准癌种命名（附「一级名称一致率 > 70% 且二级顺序一致 = 没调研」的反向判据）；每条线必须配「患者原话 / 页面接住 / 明确不做什么」三段式场景；私密内容是数据属性（`visibility` 列 + 三处出口各自过滤）而非界面开关。
  - **§5 家属线通用设计**：家庭内传播防护 vs 高危随访提醒两表对照，「未检测 ≠ 阴性」、只给客观间隔、与患者本人复诊节奏分表存放。
  - **§6 验收**：结构断言 / 场景断言 / 「二级 × 3 宽度」巡检矩阵，附小肝宝 `81 组零问题` 与 3D 卡实测口径。
  - **§7 接入模板**：可直接复制填的 10 行表格 + 填完自检三问；**§8 边界**：数量是下限不是目标，癌种专属切法不照抄。
- `README.md` 文档索引在 25 号后新增一行；`docs/LESSONS.md` 表格补 **L25** 并新增一节正文（病象 / 根因 / 判定口径 / 两个配套坑）。

## 2026-10-22 · 回流：ZERO-TO-DEV v1.2，补「指南 + 分级 + 面板」三块高发区

从乳腺癌工作台 v0.10.0–v0.12.0 三轮（G1 出处 / G2 节奏 / G3 分级）回收。这一轮的特点是：功能都"看起来接上了"，但底层口径与验收方式全都有坑。新增/修正是三类：

- **`prompts/ZERO-TO-DEV.md` v1.1 → v1.2**（并同步到食管癌工作台 `prompts/`）：
  - 新增 **阶段 1.5「指南与分级标准」**：四问筛（有没有权威带页码的指南 / 原件还是二手 / 有没有间隔或阈值 / 版权允不允许摘录）→ G1 出处（页码 + ≤200 字摘录 + **三处登记一致单测**）→ G2 节奏（节点 = 起点 + k×间隔、月末夹取、不发提醒、±30 天要标"不是指南内容"）→ G3 分级（两类指标两套处理、双标准并列不取严）。
  - 新增 **阶段 2.2「面板：默认在右、可拖、顶栏开关」**：`businessSide: 'left'` 家族统一、0.65/0.35 互补用 `assertPanelConfig()` 钉住、拖动四条（容器 rect / aria separator / 键盘同精度 / 读回 clamp）、顶栏五态为唯一入口、收起只切 display 且会话节点恒定挂载。
  - 新增 **末节「假绿清单」**：12 条"看着像通过、其实是假绿"的对照表（check 全绿 / 装机已完成 / 面板可拖 / 分级接上了 / 指南接上了 / 0 条结果…），每条给验法。
  - 硬约束表加 **医学口径**一组（四条带错误来源）；阶段 0 文档体系补 `METRIC-GRADING` 与 `GUIDELINE-BRIDGE`；阶段 1.2 要求化验记录带 `ref_low/ref_high` 两列；阶段 2.3/3 补版本校验陷阱、git 退出码、干净临时目录、Desktop profile 路径与 `check-install.mjs`；阶段 4 明确"不自动提交、不自动推送"。
- **新增 `docs/25-GUIDELINE-BRIDGE.md`「指南接入工作台：四层刻度尺」**：整份可直接照做的通用文档 —— 四问筛；四类颗粒（结构/节奏/阈值/处置）必须分开处理；L1 出处（含 **登记三处一致** 的代码示例、notes 会原样显示给用户、说明条数多改 `<details>`）；L2 适用（标签由记录算出、药名宁缺勿猜、匹配不了写"无法自动匹配"）；L3 节奏（节点算法、月末夹取、三条硬边界、显示带宽标注、验收四条）；L4 分级（**先比对再实现**——常见结局是两套口径其实一致；正面单徽章；级差只标不一致不取严；四类"其实不是分级"的东西）；X 禁止层与版权（原件不入包、结构化 JSON 必须在 `assets/`）；G0–G4 落地顺序与 14 条验收清单。
- **修正 `docs/23-METRIC-GRADING-AND-ALERTS.md` 的过期口径**（重要，旧版会把人带错）：
  - 原文写「×ULN 型指标本地没有结构化 ULN 之前**不启用，也不近似**」，与 v0.12.0 冲突。改为原文保留"不近似"，同时新增 **§2.1**：绝对阈值型可借通用下限近似（`approx: true`），×ULN 型**必须用这张化验单的参考上限**，缺失返回 `needsUln` + 虚线徽章「需参考上限」，并给出"下限可以借，上限不能借"的记法、ALT 40–55 U/L 差 1.4 倍的算例、边界钉整除点（120 vs 120.1）、QTc `maxGrade: 3` 与 `needsUnit`、三种"没有级别"的界面区分、以及"状态由缺失推导时文案不能反过来说结果"的红线。
  - 验收条目 M3 拆成 M3/M3b/M3c，新增 M4b（参考值落库校验 + `Number(null) === 0`）与 M4c（未采用分支要写注释）；§8 家族表更新乳腺癌为 22 项字典，并加一句"×ULN 的参考上限不许进家族常量"。
- **`docs/20-AGENT-PANE-DESIGN.md` 补三节**：§2.1 默认位置（业务在左、会话在最右，三条理由 + 四条硬约束，含"register 仍会被宿主校验"）；§2.2 可拖动四条硬约束（容器 rect / aria / 键盘同精度 / clamp）与窄屏抽屉；§2.3 顶栏开关为唯一入口、收起≠结束会话、节点恒定挂载、服务缺失才禁用。
- **`docs/18-MINERU-PARSING.md` 补两节**：§0.1「v1 → v2 改了什么」八行对照表（Token 优先级 / 密钥文件 / 设置页 / flash 作废 / 默认模型 pipeline / LaTeX 单位 / `.html` 拒收 / 表格先转竖线），当迁移检查表用；§15「改动落点表」按文件列改哪里、怎么验，并注明四条家族级口径不许单仓改回。
- `docs/LESSONS.md` 表格补 L23/L24，正文补五节（×ULN 缺上限、版本 commit 滞后与 git 退出码、指南当知识库、面板形态前置条件）。
- `README.md` 文档索引加 25 号并更新 23 号摘要；`docs/11-REUSABLE-PATTERNS.md` 加一段指南/分级/面板的交叉引用。

## 2026-10-22 · 重写 18-MINERU-PARSING：开发原则 + 设置页手工维护 Token

`docs/18-MINERU-PARSING.md` 从"经验记录"改成"能照着做的开发指南"，并纠正上一版写反的一处口径。变更有三类：

- **新增 §1「十条开发原则」**：把四次真实事故抽象成可扫读的表（只走 HTTP 不包 CLI、Token 文件优先、Token 只一份实现一个文件、原文不回显、表格先转竖线再对齐、失败不产候选、设置页必须能手工填、写入原子 600/坏文件不覆盖、失效给三个动作、申请地址当约定标记）。每条都写"违反后的真实现象"，而不是只写"应该怎样"。
- **新增 §5「设置页手工维护 Token」**：这是本轮的"小修复"沉淀。上一版为不假装有状态，把设置页做成只读文案，等价于把换 Key 的成本推给患者。
  - 接口契约：`GET/POST /api/<topic>/settings/mineru`，返回 `{configured, source, sourceLabel, masked, file, fileExists, tokenUrl, permissions}`，**响应体里没有 token 字段**；`POST {token}` 存、`{action:'clear'}` 清；校验失败 400、文件坏/写不进 500。
  - 只有一份实现 `dsh/settings.js`（三个使用者：解析客户端读、路由给状态、设置页写），否则会出现"界面写 A 文件、解析读 B 文件"的分叉。
  - 写入五条：先校验再落盘（校验失败不创建文件）、同目录 tmp+rename 原子写、600/700、保留其它键、坏文件不覆盖。
  - 前端四处：password + autocomplete、保存后清空输入框、成功才关弹窗、状态显示掩码+路径+来源。
  - 验收用真实浏览器点一遍并读盘，给出实测表（初始未配置 → 保存后 `sk-u****54` + 磁盘 JSON 一致 + 600 → 清除后文件删除）。
- **纠正并补齐**：
  - §4.1 Token 优先级由 v1 的「显式 > env > 文件」改为 **「显式 > 文件 > env」**。v1 那条正是"换了新 Token 还是 401"的根因，文档里现在连带写上复现方法与"状态接口必须报来源"的配套要求。
  - §4.2 密钥文件落点：装机场景写用户目录 `~/.<品牌>/secrets/mineru.json`，包内 `.secrets/mineru.json` 只在已存在时沿用——包目录会随插件升级整份替换。
  - §2 默认模型改为 `pipeline`，并明确 **flash 通道作废**（只出 markdown、表格结构不保证，与下游位置对齐冲突），不再写"可选轻量模式"。
  - 新增 §6「Token 失效的出路」：界面独立提醒 + 三个动作 + Agent 提示词三条硬要求（给步骤 / 警告别把 Token 发到对话或病友群 / 说明是工具问题不是病情变化），以及"错误消息里的申请地址即 Token 故障标记"的判定方式。
  - 新增 §7.1「单位先剥 LaTeX 外壳」（`$10^9/L$` → `10⁹/L`，夹具比线上干净会导致本地绿、桌面端错）与 §3 的 `.html` 拒收（-10002）。
  - §13 采纳清单增四条（设置页可写、写入约束、用户目录落点、LaTeX 单位）；§14 部件表由五个补成六个，迁移顺序插入"抽出 Token 读写层"与"设置接口补成可写"两步。
- 同步 `README.md` 的文档索引、`AGENTS.md` 的 MinerU 条款（原写"Token 只进环境变量/本地密钥文件"，顺序暗示 env 优先，已改）与 `docs/11-REUSABLE-PATTERNS.md` 的一行摘要。

## 2026-10-22 · 选型：MinerU 统一走 HTTP API，不再用本机 CLI 包装

- `docs/18-MINERU-PARSING.md` 新增 §0「路线选择」：对比 HTTP 客户端与 `mineru-open-api` CLI 两条实现，结论是社区六个工作台统一到 HTTP，不再新增 CLI 包装。四条理由：① 桌面 GUI 的 `PATH` 通常不含 nvm / `.npm-global`，多一个二进制就多一个装不上的理由；② CLI 唯一的独有能力（`flash-extract` 免鉴权）实测走的是 `POST https://mineru.net/api/v1/agent/parse/file`，传 `.txt` 返回 `-30002`（扩展名不支持）而非 401，说明该端点不校验 Token，可用几十行 HTTP 复现；③ stderr 正则判错会被上游文案变更误判成可重试、白烧额度；④ `.secrets/mineru.json` 与 `~/.mineru/config.yaml` 两处 Token 源会互相掩盖，现象是 401 而非"未配置"。
- 同节定下两档模式：默认 precision（v4 四步 + Token，`vlm` 优先、仅在接口拒参数时回退 `pipeline`）；可选 flash（`/api/v1/agent/parse/file`，免 Token、只出 markdown、界面须标"轻量模式结果可能不准"）。明确 `.secrets/mineru.json` 为唯一本地密钥文件。
- 新增 §10「统一模块与迁移顺序」：五个部件（client / 抽取 / 编排 / 状态接口 / 任务表）各自的验收判据，迁移按"风险×工作量"排序——先清写死的假绿灯，再补 HTML 表格转换，再补任务历史，最后 CLI 改 HTTP 并补抽取层。

## 2026-10-21 · 回流：MinerU 的 HTML 表格必须先转竖线表（L2，乳腺癌 + GIST 两处复现）

- `examples/mineru-labparse-align.mjs` 新增 `htmlTablesToPipes(markdown)`：把 `full.md` 里 `<table><tr><td>` 表格转成 `| a | b |` 并补一条 `| --- |` 分隔行，再交给对齐逻辑。`extractTableCandidates(lines)` 支持直接传原始 markdown（内部先转），也支持传已切好的行数组。
- 修复的是一条**静默错读**：常规清洗先 `replace(/<[^>]+>/g,'')` 会把整表压成一行，导致"指标名后取第一个数"跨表串位——病理字段读出 `胃体肿瘤最大径6.8 cm核分裂象计数12 个`，化验读出 `白细胞 4.210 10^9/L`、`血小板 21010 10^9/L`。**不报错，只是结果全错**。
- `docs/18-MINERU-PARSING.md` 补 §5.1「先转竖线表，再谈对齐」：给出错误/正确两种输出对照、`htmlTablesToPipes` 的四个实现细节表（`colspan` 补空位、正则必须写 `["']?` 而不是 `"?'`、单元格内 `|` 换 `/`、首行当表头插分隔行）、以及"用反例测试锁住清洗顺序"的防护建议；§4 抽取规则表与 §9 采纳清单各加一条。新增 §8b「实测经验（2026-10-21，GIST 工作台）」：13 条候选、12.9–18.8 秒，并记下本轮新踩的三点——环境变量盖住密钥文件且现象是 401、`解析中` 不写库（避免僵尸状态）、导入只改状态不产候选。
- `docs/LESSONS.md` 追加同题条目，抽象为通用规则：凡是"先做通用清洗再做结构化解析"的链路，都要有一条反例测试锁住顺序。
- 新增 `test/mineru-align.test.mjs`（6 项）与夹具 `test/fixtures/mineru-pathology-html.md`（真实 1 页 PDF 的 `full.md` 原文，无患者信息）：含 "先剥标签会压成一行且抽不出指标" 的反例。

## 2026-10-21 · 回流：Desktop Harness 判定与装机自检脚本（L2，肺 + 结直肠两处复现）

- `docs/06-VALIDATION-AND-RELEASE.md` 新增「用户侧入口与三层验收」：写明 **不要** 用 `dsh web` + 浏览器 Settings → Plugins 冒充 Desktop 用法；正规入口是设置 → 通用开「启用工作台功能」→ 工作台市场安装 → 「立即重启」/菜单 Harness → 重启 Harness → 市场「已安装」核对；验收三层（配置 / 列表 / 界面），只有前两层只能写"配置已加载、UI 未验证"。
- **新项目模板自带 `scripts/check-install.mjs`**（只读）：自动探测 Desktop Harness（app 自带 → `DSH_HOME` → `~/.dsh`）并打印判定依据，核对 dependencies + `dsh.profile.bundles`，区分"市场安装 / 手工 native 安装"，装在别处会明确报错。换机器、换版本先跑它，不照抄路径。
- `npm run check` 增加对该模板脚本的语法检查。

> 判定事实（Desktop 0.12.0 实测）：app 自己的 Harness 在 `~/Library/Application Support/dsh-desktop/harness`，活动 profile 名恰好叫 `web`；`~/.dsh/profiles/*` 属 CLI 侧，Desktop 不读。既有项目里"装到 `~/.dsh/profiles/desktop`"的硬要求已作废，需按本节更正。

## 2026-10-21 · ZERO-TO-DEV 升级 v1.1（对齐真实交付链路）

- 补 `init` 与标准文档体系（SPEC / DEV-REQUIREMENTS / DIFF-MATRIX / PATIENT-FLOW / SCHEMA /
  CLINICAL-DATA / DEV-PLAN），并把「强约束文档」提为阶段 0 的交付物。
- 明确三阶段闸口：3.1 调研+schema+临床库+HTML demo（第一次确认）→ 3.2 开发版与原型一致性
  → 3.3 dsh-desktop 发布实测；之后才是 push 与经验回流。
- 临床试验补多通道口径：改用 unified-trial-mcp（六个通道、MCP 工具面、离线语料 sha256、
  「0 条结果必须带覆盖声明」），不再只写 CT.gov。
- 加「已知覆盖限制」引用块：三个离线语料（`chictr_pancreatic` 468 条 / `xyb_cde_pancreatic`
  139 条 / `ctv_index`）**仅覆盖胰腺癌**，其他癌种只能走在线通道，离线通道须在
  `CLINICAL-DATA-<年>.md` 与 sqlite 来源终态里如实写「未配置/无覆盖」，不算"已查过"；
  自建语料按 `docs/corpus-lifecycle.md` 流程，语料单独发 Release，不进工作台仓库。
- README 新增「新手：五步从一个癌种名走到可运行开发版」（装 CLI → `init --prepare` 答三问
  → `init <name>-workbench` + `npm run check` 钉基线 → 写强约束 → 交 ZERO-TO-DEV 走三闸口），
  并把两条最常踩的纪律写在段末（闸口不签不往下走；来源终态不许美化）。
- 排版沿用硬换行；样板基准统一写成 `<癌种英文>-workbench v0.1.0`。

## 2026-10-21 · 新增「癌种 → 可运行开发版」一次性交付提示词

- `prompts/ZERO-TO-DEV.md`：把食管癌（EsopPal）那一轮实际跑通的路径固化为 9 段可执行提示词
  （三件前置 → 调研与差异化矩阵 → schema 冻结 → 生成器 → 原型 G2 → 开发版六步移植 → 验收命令 →
  交付清单 → 禁止事项），并在 README 提示词表加索引。
- 重点是把踩过的坑写成硬约束：分节 `*_title` 逐节对账、`assemble()` 不许漏中间量、
  `events/docs/candidates` 是定长数组、分类指标无 `unit` 键、列一致性脚本要执行全部迁移、
  `apiBase` 不含 `/api`、AI 面板五态与宽度单一来源、无头穷举不能先抓按钮再点。

## 2026-10-20 · 开发快照（包版本 1.4.3）

- 新增24号指标趋势Tab设计、参考截图、可复用提示词和项目填写模板；init生成指标趋势规格副本，更新AGENTS/一图秀合同/设计系统及检查测试。
- `npm run check`：通过（退出码0）。
- `npm test`：通过（退出码0）；tests=24, pass=24, fail=0。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。


## 1.4.3 — 2026-10-20（本地待发布）

- [prompts/DSH-AGENT-PANE-INTEGRATION.md](prompts/DSH-AGENT-PANE-INTEGRATION.md) 新增 **§6.1 上下文草稿的落地细则**：把原第 6 条"与 Agent 讨论"从原则补成可直接照抄的形状。来源为小粉宝乳腺癌工作台 v0.8.0（2026-10-20 实现并实测）。
- 要点：①取数走服务端只读接口按范围出文本，`blocks/gaps/excluded` 三件套供预览与草稿共用，页面不再自己拼；②三个范围各自"带什么/不带什么"表——图表页带选中序列+同段时间的治疗节点，就诊准备带问题与未完成待办，核对页**只带已确认事实、未确认候选只报条数不带值**；③四条不可让步（只抄记录/核对≠医学审核/私密 fail-closed 且开关保留/草稿不带本机路径）要求写进单测；④送达协议：`postMessage` 必须**同时**校验 `event.source` 与 `event.origin`（只查 origin 挡不住同源其他窗口）+ 长度上限，送达只调 `setDraft` 不调提交；⑤空态不给入口或明说无内容，独立运行退化为"复制草稿"并写明没有 AI 面板。

## 1.4.2 — 2026-10-20（本地待发布）

- 新增 [docs/23-METRIC-GRADING-AND-ALERTS.md](docs/23-METRIC-GRADING-AND-ALERTS.md)：**指标分析与卡片提醒原则**。来源为小粉宝乳腺癌工作台 v0.7.0（2026-10-20 用户定则：指标卡片要分组；化疗后并发症如骨髓抑制，表达上是头晕无力、指标上是中性粒细胞低，用 CTCAE 分级对照，可直接用已有标准）。四条不可让步：①指标卡按类别分组，组顺序与一图秀同一来源，两页组名/顺序/项数必须一致；②有国际分级标准就用标准阈值对照，不自创轻/中/重，且只启用标准里有**绝对数值界限**的项（"×ULN"型在拿到结构化参考范围上限前不启用、也不近似，贫血 G4 无数值界限只给到 3 级）；③分级是**对照**不是诊断——徽章"对照 CTCAE v<版本> · N 级"、必带区间与免责、用了通用下限要标"按通用下限"、版本号由读模型透传不硬编码；④看板提醒只把"表达面（感受）"与"指标面"两列并置，不写因果不写处置，是否出现由读模型算 `paired`/`labsOnly`（只有一侧不弹提醒，避免拿感受猜指标）。
- 附：CTCAE v5.0 血液学四项阈值表（含 g/dL→g/L 换算与通用下限近似规则）、标准原文的存放与换版流程（`assets/reference/<standard>/` 单一来源 + 只读接口按元信息常量取文件名并校验目录边界）、分层位置表（分级是派生值，读取时算不落库）、M1–M11 验收清单、家族六个工作台的落地差异（无化疗的 FSHD 不适用；标志物不做不良事件分级）。
- 三条反例来自实证：平铺网格让"没显示 = 正常"被误读；卡片背面固定高度加区间后页脚被裁；接口基址含 `/api` 又拼 `/api/xxx` 得到 `/api/api/state` 导致整页 404。
- 接线：AGENTS.md 新增「指标分析与卡片提醒」小节；README 索引表与版本说明同步。

## 1.4.1 — 2026-10-19（本地待发布）

- 新增 [prompts/DSH-WORKBENCH-TOP-BAR.md](prompts/DSH-WORKBENCH-TOP-BAR.md)：**customFrame 工作台顶栏提示词**（三段式结构、按钮右置、版本号随品牌、色带克制）。来源为小粉宝乳腺癌工作台 v0.6.1 真机三轮反馈后的定稿版式：左=品牌+版本号 chip、中=一句状态说明、右=AI 对话/收起按钮组紧贴右缘。含尺寸与间距表、颜色**角色**表（不锁定色号，按项目品牌换）、换色规则、结构骨架、五态按钮文案、7 条硬约束与真机验收清单。
- 明确两条反例：按钮放左缘会被 macOS 窗口按钮挤占；版本号只藏在业务 iframe 右上角会导致用户找不到。附"饱和粉底+饱和按钮"被真机否掉的原因：色带抢过业务区。
- 接线：AGENTS.md 的原生 Agent 条目指向该提示词；README 索引表新增一行；docs/20-AGENT-PANE-DESIGN.md 增「顶栏结构与视觉」小节并链接过去。

## 1.4.0 — 2026-10-19（本地待发布）

- 将 DSH 原生 Agent 面板要求写入生成项目模板：全局顶栏拉起按钮、真实连接状态、独立隐藏/重开、会话和页面状态保留、面板宽度调节与偏好恢复。
- 明确 CustomFrame 可使用 35% 默认、25%–45% 范围的可访问 splitter；split 形态只遵循 Desktop 宿主布局能力，不重复实现宽度控制或伪造原生对话。
- 新增 ACC-28–31，将入口、隐藏重开、鼠标/触控/键盘调宽、窄窗和重启偏好纳入验收，并加入 T07 实施任务。
- **修正 20 号文档的关键误判（实证）**：原表把「可拖 25%–45%」判给 CustomFrame、并让 split 形态沿用宿主能力。经 `dsh-desktop` 源码核对：split 下宿主把 `--workbench-business-width` 写成注册时的静态值，服务只暴露 register/isActive/ownsSession/add/open/home/ensureSession/currentSession/**subscribe**，**没有** setBusinessWidth/togglePane、也无 splitter 节点——**split 形态根本无法实现拖宽与收起**。20 号文档已加「2026-10-19 实证修正」：需求含「面板可调」必须由 split 改为 customFrame（宿主以 `conversation` prop 交出原生会话节点）。表格第 1 节现状示例同步为乳腺癌工作台 v0.6.0（customFrame=true），并给出可直接照抄的四个实现要点（五态入口 / `role=separator` splitter / 按容器 rect 夹取 / 会话恒定挂载只切 display）。

## 1.3.9 — 2026-10-18（本地待发布）

- 新增 [一图秀动效与事件交互提示词](prompts/TIMELINE-MOTION-AND-EVENTS.md)，沉淀小巢宝原型的趋势重播、独立事件泳道、节点/标签同ID联动、日期对齐、密集事件避让和减少动效终态；接入AGENTS、README索引、19号原型工艺与UI-REVIEW，init随prompts目录自动分发。品牌与癌种医学场景按项目替换。

- 新增 [docs/21-RESEARCH-PLAYBOOK.md](docs/21-RESEARCH-PLAYBOOK.md)：罕见病/新病种**调研手册**（设计→执行→输出）。来源：FSHD 工作台首调研（组织与患者证据部分）。要点：①输入=社群基础资料+关键人物+已确认 V 清单；②四条检索线（人物→组织→研究→管线，无药病种必须保留失败/停止管线）；③证据 A/B/未核实分级 + 资源条目七字段（`limit` 强制存在，防名单变推荐）；④输出三件套（RESEARCH 主文档 7 节结构 / research/ 证据稿 / 回写 SPEC·SCENARIOS·原型）；⑤发布前质量自查五条。不绑定病种。

- 新增 [docs/22-PHASES-AND-GATES.md](docs/22-PHASES-AND-GATES.md)：**三阶段×三闸口开发流程速查**（必记心智模型）。来自 FSHD 工作台流程对齐：Phase1 设计（schema 只是草案）→ G1/G2/G3 三道签认闸口（顺序不可跳、逐个留痕；HTML 是 G2 权限闸口，G3 未过不建表）→ Phase2 数据（正式迁移+冻结+demo manifest）→ Phase3 开发与三层验证（V1 npm check / V2 装机 / V3 业务）→ 反馈进台账循环。含与 17 号 10 阶段的映射表和 4 个最易踩坑。STARTER-SPEC「开发流程」节与 README 阅读表已接线。

## 1.3.8 — 2026-10-18（本地待发布）

- docs/06-VALIDATION-AND-RELEASE「安装到正确 Desktop」补**本机实证案例**（breast-cancer-workbench 首装踩坑，同日两轮修正）：**DSH Desktop 实际读 `~/Library/Application Support/dsh-desktop/harness/profiles/web`**——`~/.dsh/profiles/web`（CLI 用）和 `~/.dsh/profiles/desktop`（名字带 desktop 但 Desktop 不读）都装错过一次，重启后列表没有就是没装对地方。附完整清单：判定法（看 harness profile 里已显示工作台的同款登记）、file:tgz + `dsh.profile.bundles` 双登记、corepack 遵循 profile 的 `packageManager`、**pnpm 同版本号不替换内容必须 remove+add**、`NODE_OPTIONS` shim 拦 symlink、CLI 短启验证的错误排除法、cordis `apply` 非 async 契约。

## 1.3.7 — 2026-10-18（本地待发布）

- 沉淀乳腺癌工作台 `docs/AGENT-PANE-DESIGN.md` 为**不绑定癌种的通用模板**：新增 [docs/20-AGENT-PANE-DESIGN.md](docs/20-AGENT-PANE-DESIGN.md)。要点：①先摆集成现状证据（V1/V2/AI 代码/入口/可移植参考五项，未验证就写未验证）；②版式判定分 CustomFrame 与 split 两形态——35%/25–45% 拖宽基线只适用 CustomFrame，split 下会话节点归宿主、工作台不自建 splitter；③交互合同七条逐项落地（入口四态、会话创建、来源页四类衔接——**未核对候选禁止进草稿**、宿主 API 缺位走剪贴板回退不自建聊天框、草稿冲突三选、AI 输出零沉淀、私密默认不进草稿）；④数据模型解耦四行表；⑤验收清单七条骨架（V2 实机才算验收）；⑥未决问题固定四问。
- 与 1.3.5 的面板提示词配套：提示词=合同，20 号文档=落地模板（判形态、摆证据、给偏离理由、列未决），init 接力与癌种提示词均已指向。
- 接线：`check-starter` 必需清单 +1；README init 接力段与「按问题阅读」表更新、版本行更新。

## 1.3.6 — 2026-10-18（本地待发布）

- 沉淀乳腺癌工作台 v0.3.0 原型（34 视图签认快照）的**工艺层复刻指南**：新增 [docs/19-PROTOTYPE-CRAFT.md](docs/19-PROTOTYPE-CRAFT.md)。覆盖：设计令牌五组骨架（中性/品牌三档/行动色与品牌刻意分离/语义 pill/结构）、`minmax(0,1fr)` 版式骨架与 1180/900/600 三级断点职责、14 类组件要素、六个动效的时长缓动与 `prefers-reduced-motion` 降级（折线恢复终态）、13 条交互细节（事件委托、最近点 tooltip、pin 两层深度、标签避让、上限回弹、局部重绘、解析三态、AI 演示不伪装接通）、a11y 语义清单、图表泳道规则、复刻验收清单。
- **颜色不锁定**：令牌只定结构不定色值，第 9 节给出结直肠/食管/宫颈三个癌种的 `:root` 覆盖示例与换肤规则（brand-soft/deep 分档、行动色与品牌色互补）。
- 接线：`check-starter` 必需清单 +1；README「按问题阅读」表 +1 行、版本行更新。

## 1.3.5 — 2026-10-18（本地待发布）

- 新增可复用 DSH 原生 Agent 右侧面板集成提示词，约束工作台保持中间主区、对话可拖动调宽/隐藏/重开、按需创建或复用归属会话、保护原生草稿并显式带入。
- init 交接立即输出面板提示词路径和面向原型 parity 的首轮工作指令；AGENTS/START/癌种提示词要求新会话先读取并开始关键对话。
- 癌种项目启动流程明确要求静态/交互原型逐项对照，而不是用导航存在或功能名相似宣称1:1完成。

## 1.3.4 — 2026-10-18（本地待发布）

- 沉淀乳腺癌工作台已真实跑通的 MinerU 云端解析经验：新增 [docs/18-MINERU-PARSING.md](docs/18-MINERU-PARSING.md)（适用判断与代价表、API v4 四步协议与踩坑、Token 三条硬规则、"抄写不判断"抽取纪律、失败语义、界面三态、实测经验与采纳清单）。
- 新增纯函数示例 `examples/mineru-labparse-align.mjs`：指标词边界匹配、不等式保留（`<0.5` 不折成数值）、单位归一、**表格按位置对齐**（云端把整表塞进一个单元格时按第 i 个指标配第 i 个数，数目不一致整行放弃）；不联网、不读凭据、不写库。
- 接线：AGENTS 开发原则与 `docs/11-REUSABLE-PATTERNS.md` 各加一条入口；README「按问题阅读」表与本地版本行更新；`check-starter` 必需文件清单补两项。参考实现指向社区仓库 `xfb-workbench`，指南与示例不携带任何 Token。

## 1.3.3 — 2026-10-17（本地待发布）

- HVT 需求审核技能新增**发布可见性检查（P1–P5）**：版本号必须在 HTML 原型首页与装机后的应用首页首屏可见，并与 `VERSION`、`package.json`、tag、市场条目一致；P 不并入五层覆盖分 C，但 P1 不过 G2 不算可签认产物、P2 不过装机验证不能写通过。新增 `references/publish-readiness.md` 与定位脚本 `publish_check.py`（只报来源、字面量与不一致，不判定首屏可见性）。
- HVT 报告模板与 `docs/15-HVT-REVIEW.md` 增加第 6 节「发布可见性」，闸口表补装机/发布一行。
- 新增 **`docs/16-ONE-CHART-SPEC.md`：一图秀（多指标时间轴）开发规范**。三个先决合同（可比性/归一化/事实源）+ R1–R12 硬规则 + C1–C12 验收断言 + 真实事故表；覆盖单点不连线、治疗条分层、只标末点与避让、康复测量用绝对值、`pathLength=1` 动画、`minmax(0,1fr)` 防溢出、减少动效保留终态、指标卡真 3D 翻转。
- 新增 `templates/ONE-CHART-SPEC.md` 项目实例模板（指标清单、可比性分组、状态默认值、逐条核对与偏离记录）；init 会生成项目内 `docs/ONE-CHART-SPEC.md`，并回传 `oneChartSpec` / `hvtReview` 路径。
- README、AGENTS、`docs/07-INTERACTIVE-DESIGN.md` 接入一图秀规范入口；`templates/PROTOTYPE-REVIEW.md` 增加版本号一致性与一图秀 C1–C12 两行；check-starter 必需文件清单补两项。
- 修 `publish_check.py` 的原型定位：原先只认 `prototypes/`，会把 `docs/prototype/*.html`（肺癌/卵巢癌的实际布局）误报成“没有原型入口”。现同时识别 `prototypes/`、`prototype/`、`docs/prototype/`、`docs/prototypes/` 与根入口，并去重；重测肺癌/卵巢癌后结论从“无入口”更正为“有入口但首屏无版本号”。

## 1.3.2 — 2026-10-17（本地待发布）

- 为癌种工作台初始化新增 `docs/SETTINGS-DESIGN.md` 与 `settingsDesign` 交接路径。
- 癌种提示词、SPEC/UI/原型评审和验收模板强制覆盖全局设置页：资料目录、外部解析凭据状态/授权、临床数据包版本、保存/取消/错误恢复。
- 凭据要求只显示来源/状态，不向原型或文档复制明文；设置页审核仍受HTML确认门禁约束。
- 市场发布指南补充本地发布顺序：Profile备份、显式 `DSH_HOME` 安装与副本核验、默认分支/tag/Release附件校验；明确市场 PR 独立于 GitHub Release，沿用已有条目并按实际来源更新，不为普通版本升级重复投稿。
- README 主入口指向完整市场实操步骤，并区分包已安装、宿主已加载、市场PR已提交与已上架状态。
- init现在生成项目级 `docs/RELEASE.md` 并回传其路径；CLI帮助和交接输出都链接市场步骤。SPEC、任务、验收和设计审查模板明确发布授权、Git/Release/市场来源的独立性与状态边界。


## 1.3.1 — 2026-10-17（本地待发布）

- 新增 HVT 需求审核技能 `skills/hvt-requirement-review/`：十条疾病轴推导癌种特有场景、V/S/F 打分、五层落地检查（场景/模块/字段/交互/验收）、证据化分级与需求补丁；含 breast/ovarian/lung/pancreatic/colorectal 术语包与 `hvt_scan.py` 命中统计脚本（只给候选初值，判定需人工复核）。
- 新增 [docs/15-HVT-REVIEW.md](docs/15-HVT-REVIEW.md) 与 [templates/HVT-REVIEW.md](templates/HVT-REVIEW.md)，接入 G1 闸口；init 复制 `skills/` 到生成项目，报告模板随初始化落地。
- 明确"提到一次不等于覆盖""通用能力不计入癌种特有覆盖"，避免用泛肿瘤功能证明需求扎实。

- 明确HTML交互原型先行：用户确认对应版本/模块后才生产开发，记录路径/hash/预览与范围。
- 强化数据模型与页面/业务流程解耦、命令API/版本化读模型、候选/接受/隐私/失效及迁移/恢复合同。
- init生成SCHEMA/API/UI/PARITY与PROTOTYPE-REVIEW的docs副本，并输出确认记录路径；不生成虚假的已完成原型。

## 1.3.0 — 2026-10-17（本地待发布）

- 明确业务开发前必须先交付HTML交互工作台UI、实际预览并取得用户对版本/范围的确认；同步AGENTS、设计入口和模板。
- 数据设计新增前端/业务流程变化矩阵，分离领域事实、工作流与读模型，覆盖兼容/迁移/恢复；不直接固化原型数据结构。

- 保留init的用户、场景和流程前置输入，将其作为SPEC关键互动素材；不把配置通过校验当成研究/设计确认。
- init生成项目设计提示词、设计者章程、设计会话和独立review记录，输出实际路径与首问，由当前Agent接续对话。
- 新增完整新癌种患者/照护者提示词：先构建设计者，ai-spec辅助、患者需求证据、场景取舍、医学约束、分期及实际高能力模型独立review。
- AGENTS/START/共创入口/README/CLI引导统一，癌种流程按需使用，不强制泛用项目医疗化。

## 1.2.1 — 2026-10-16

- 补充长内容弹窗/抽屉规范：固定标题与关闭入口，内容独立滚动，列表工具和主要操作按需固定；涵盖窄窗、大字、焦点、表单关联及真实滚动验收。
- AGENTS、UI设计记录与验收模板同步，新增ACC-19。

## 1.2.0 — 2026-10-16

- 新增工作台全局双状态设计合同：资料目录连接与原生会话绑定分别显示，有依据才显示绿灯。
- 补齐状态用途、视觉/无障碍规则、后端与宿主适配、切换竞态、异常恢复和最小检查矩阵。
- 新增无第三方依赖的状态派生示例与防假绿灯检查；随初始化复制，不会自动接通宿主能力。
- 在 AGENTS、接入/设计指南、SPEC/UI/验收模板中建立入口，README 和 CLI 版本统一为 1.2.0。
- 新增独立的工作台市场投稿流程、人工验收单和投稿提示词，含安装来源选择、官方规范/目录协议快照、YAML、PR命令与审核结果判定。
- 默认复用开发者对指定版本的明确手工确认及真实截图，Computer Use 按需辅助，避免重复验证消耗；Git推送与工作台市场上架分开记录。
- 已认可的复盘整理为通用开发方法：任务阶段分层、原型一致性、宿主异步状态、产物检查、冻结结果与资源加载；宋韵主题/配图作为可选方案。
- 明确本机更新必须交付到实际安装版本，正常走最短更新路径，异常时才展开完整旧版加载排查。
- UI/UX增加渐进披露规范及离线示例：主任务常显，配置/说明折叠、💡教学按需打开，关键错误不隐藏。
- 外部信息原则抽象为来源、时效、适用条件与核实状态，适用于不同业务主题，获取成功或用户采纳不等于事实核实。
- 增加可选高德POI接入指南、官方来源、能力记录模板及无依赖候选归一化示例；覆盖Key类型、API版本、坐标/分页/范围、后端代理、地图降级和异常字段，未捆绑凭据或启用联网。

## 1.1.0

既有基线提供 Git 同步与 CLI 初始化、互动需求/SPEC/UI 共创、混合数据设计、Taste Seed 使用约定、包检查和宿主接入经验。本条归纳既有能力，具体历史以 Git 记录为准。



## 未发布 · 2026-10-20 指标趋势设计沉淀

新增24号分类指标趋势/3D卡片规范、参考截图、METRIC-TREND-SPEC项目模板与AI-IDE提示词；init自动携带并生成项目确认表，AGENTS/设计系统/一图秀合同加入入口与密集事件教训。本次保存到Git，不自动修改已生成项目。


## 未发布 · 2026-10-25 从肢端肥大症（acromegaly v0.2.0）回收

LESSONS 新增 4 条：dialog 截图 md5 去重断言（settings.png 复制件 P1）、罕见病中文词 0 命中与英文机制词命中口径、罕见病随访判定词表扩充、化验多单位逐行随附不换算。待实施检查器清单：截图 md5 去重（check-shots-dedup）。
