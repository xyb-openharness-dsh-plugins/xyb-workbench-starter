## 2026-10-26 · 1.7.0 部署目标：只认本机 DSH Desktop（top 要求）

用户点名加一条**最高优先级**要求：开发出来的工作台**默认部署到本机已安装的 dsh-desktop**，
**不许**装到 `~/.dsh`，也**不许**装到 **DeepSeek Harness.app**；机器上没装 dsh-desktop 时，
当场停下并把下载地址 <https://www.dshdesktop.com/> 给用户。

为什么单列一条而不是塞进 06 号：装错宿主**不会报错**，只会安静地没效果——页面能开、
`npm run check` 全绿、tgz 也打了，用户在 Desktop 列表里就是看不到这台。三种表现各自对应
不同真因（列表没有 = 装进 Desktop 不读的 Harness；有但旧版 = 装到另一个 profile；
市场不显示"已安装" = 手工装法无安装记录），都不是"再装一次"能解决的。

本机实测（2026-10-26）：DSH Desktop.app `io.dsh.desktop` 0.12.0，Harness 在
`~/Library/Application Support/dsh-desktop/harness/profiles/web`；`dsh` CLI 0.1.0-rc.6 用
`~/.dsh/profiles/{desktop,tui,web}`；**DeepSeek Harness.app `com.deepseek.dsh` 0.2.1-rc.2 是另一款 app**，
profile 不共享。`~/.dsh/profiles/web` 与目标**同名**却完全不是同一个地方——这是最容易骗过人的一处。

落地：

- 新增 [docs/37-DEPLOY-TARGET.md](docs/37-DEPLOY-TARGET.md)：唯一目标 / 两个排除目标 / 三条硬判据 /
  没装怎么办 / 明确未做（Windows、Linux 未在真机实测）。
- **跨平台（用户追问后补的一轮）**：这是 GitHub 项目，使用者不一定是 macOS，所以
  ① 文档不再写"要背的 macOS 路径"，只给三平台对照表并说明"位置由脚本探测"；
  ② `check-install.mjs` 按平台列探测点（macOS `/Applications`＋`~/Applications`；Windows
  `%LOCALAPPDATA%\Programs\DSH Desktop`、`%LOCALAPPDATA%\dsh-desktop`（Squirrel）、`%APPDATA%\Programs\…`、
  `%PROGRAMFILES%`、`%PROGRAMFILES(x86)%`；Linux `/opt`、`/usr/lib`、`~/.local/share`＋常见目录里的 `.AppImage`），
  Harness 一律走各自 userData（mac `Application Support`、Win `%APPDATA%`、Linux `XDG_CONFIG_HOME`）；
  ③ 装机命令分开写——**PowerShell 不认 `export`，`VAR=` 前置也只在 sh 里成立**，Windows 给 `$env:DSH_HOME`／`$env:NODE_OPTIONS`；
  ④ 新增 `--app <路径>`，绿色版/便携版/自定义目录不必改脚本常量。
- `AGENTS.md` 开头新增「## 部署目标：只认本机 DSH Desktop（最高优先级）」——**要求层**，
  `init` 生成的每个项目都带着；`prompts/ZERO-TO-DEV.md` 加 **§0.0 先找 dsh-desktop**（排在 init 之前），
  §3.3 装机第 2、3 条同步点名 DeepSeek Harness、三平台位置与 Windows 命令差异。
- `project-template/scripts/check-install.mjs` 重写判定：先回答"这台机器装没装 Desktop"
  （各平台 app 路径，或 `desktop-workbenches/` 证据），再说"登记到哪个 profile"；
  没装时打印下载地址并退出 1；机器上存在 DeepSeek Harness 时明确写"不是部署目标"。
  新增 `DSH_DESKTOP_APP=none` 反向对照入口——改这段必须自己验一次"没装"分支，只验正向等于没验。
  同时修掉一个真实假绿：app 卸载后只剩残留目录，旧逻辑照样报"判定基准 Desktop"，
  把"没装"盖过去（Windows 上 `%APPDATA%` 残留更常见）；现在 `desktopPresent` 是绕不过去的前置条件。
- `check-conformance.mjs` 加 `deploy/装机脚本`、`deploy/AGENTS` 两条审计项（只看出脚本与 AGENTS，
  不看 README 自述）。拿旧项目做反向对照：肉瘤 `sarcoma-workbench` 当场两项 FAIL，
  且准确指出它只缺"下载地址 + DeepSeek Harness 排除"（`~/.dsh` 它本来就有）。
- `docs/06-VALIDATION-AND-RELEASE.md` 加「§0 部署目标只有一台」并声明**规则看 37 号、手法看 06 号**，
  避免同一件事两份权威。

**验证**：`npm run check` 194 files / 0 error、`npm test` 62/62；`init` 生成探针项目（197 files）后
`deploy/*` 两条通过；`check-install.mjs` 三支手测（未装 / 已装未登记 / 已登记），
Windows 与 Linux 分支用 `Object.defineProperty(process,'platform',…)` 跑过提示文案——**真机仍未装过，如实记"未实测"**。

**提交归属说明**：1.7.0 的代码主体在 `60da308`；"跨平台"这一轮（三平台探测 + PowerShell 命令 + `--app`）
是用户追问后补的，恰好与另一会话的 35 号改动同时在工作树里，被 `git add -A` 一起收进了 `17d012f`——
内容完整，只是那个提交信息没提这件事。用 `git log -- docs/37-DEPLOY-TARGET.md` 会看到 `17d012f`，
原因记在这里。**教训**：并行会话共用同一个工作树时，提交前必须显式列路径，不要 `git add -A`。

存量 20+ 工作台不回填（AGENTS 与 check-install 都是建仓快照），下一轮动到哪台按 37 号重新核对。
包版本 `1.7.0`。

## 2026-10-26 · 1.6.3 页视图自测：注三个缺陷却只要求抓到两个

`probe-page-view.mjs --self-test` 注入的是三个缺陷（抹空顶栏标题、藏掉关闭入口、解除背景滚动锁），
但判定写的是 `failed.length >= 2`——**注三个抓到两个就算「自测通过」**。容错那一条恰好可能是最关键的那条。

另外函数注释写的是「注入两个已知缺陷：① 空标题（A9）② 关闭后不还原滚动（A5）」，
和实际注入的三条对不上（A5 从来没注入过），后来人照注释读会以为 A5 那条没生效。

改法：

- 新增 `EXPECTED_FAIL = ['A1','A9','A10']`，自测改按 **ID 逐条点名**：三条必须全响，
  漏哪条就报哪条（`自测失败：注入的缺陷漏检 A10（命中 2/3）`），不再用数量阈值。
- 注释改成实际的三条与对应断言，并写明「缺陷必须选同一份文档里就能看见的」这个坑。
- 正常跑仍 `13/13`；`--self-test` 现在输出 `FAIL 9/13` + `自测通过：注入的 3 个缺陷全部被点到（A1、A9、A10）`。

为什么值得单独发一版：数量阈值型自测会让「闸门退化」这件事**静默通过**——
把 A10 的断言删掉，自测依然绿。按 ID 点名之后，删哪条断言都会响。

## 2026-10-25 · 1.6.2 A1 断言原来在骗人：整页打开时背景真的能滚

肉瘤项目（T0 样板）跑 M4 时顺手复核 A1，发现两件事叠在一起：

1. **断言名不副实。** 探针算了 `docOverflow`，但 `check()` 里从没用它——
   只断言了 `bodyOverflow`。于是「宿主不出现滚动条」这句写在标题上，代码从来没验过。
2. **实测确实能滚。** 面板开着时 `window.scrollBy(0, 300)` 把背景从 0 推到 300；
   浮层不透明所以屏幕上看不见，但触屏拖到面板底部会链式带动背景，键盘 PageDown 也会滚它。

修法分三层，缺一层都白改：

- `assets/patterns/page-view.js` 加背景滚动锁：首次 `open()` 记住 `scrollY` 并给 `<html>` 加 `.pv-lock`，
  `teardown()` 时**先摘类再 `scrollTo` 还原**（顺序反了还原不回去，`overflow:hidden` 期间滚动位置已被夹住）。
- `assets/patterns/page-view.css` 加 `html.pv-lock{ overflow:hidden }`。只锁 `html` 不锁 `body`：写在 body 上 Safari 会漏。
- `scripts/probe-page-view.mjs` 的 A1 改成**真滚轮打遮罩**再读 `scrollY`。

**为什么不是 `window.scrollBy` 试滚**：`overflow:hidden` 只挡用户滚动，程序化 `scrollBy` 照样滚
（实测 260 → 426），拿它当判据会得到假红。只有真滚轮事件才是用户能做的事。这条弯路记在这里，
免得下一个人再试一遍。

自测同步加第三个缺陷（`html.pv-lock{overflow:auto!important}` 顶掉锁），
`--self-test` 现在 4 条 FAIL / 13 条（A1、A9、A10、A2），正常 13/13。

**存量项目按已知偏离处理**：20 个已落地项目的 `prototypes/<vX>` 里整页视图是内联实现，没有锁；
它们各自的 `probe-page-view.mjs` 是建仓快照，仍是旧断言，所以「绿」不代表锁住了。
下一轮动到哪个项目就补哪个，不单独做一轮 20 仓回填——与「老项目不回溯改造」口径一致。

顺带一条口径决定（写进 36 号 §2.4）：**自采登记数据算一手数据**，
`original` 记 `true`，note 写「自采快照；第三方原件未存档」，与「指南原件未取得」分开计。

## 2026-10-25 · 1.6.1 36 号落地一天后修的两个真 bug

全家族铺开第一天（22 个有原型的病种 + 7 个仅有 README 的），暴露两处实现缺陷：

1. **`check-conformance.mjs` 里写了 `\Z` —— JavaScript 没有这个转义。**
   `/^##\s*疾病概要([\s\S]*?)(?=^##\s|\Z)/m` 里的 `\Z` 退化成**字面量 "Z"**，
   于是"本节到下一个 `##` 为止"实际变成"到第一个 Z 为止"。GBM 项目 README 里 TMZ 出现十几次，
   后面两段被截掉，`primer/README` 误报"缺段"（数据与文案其实都写了）。
   改成逐行扫、遇到下一个 `##` 停，没有转义可用错的余地。
   **元教训：正则里的转义写错不会报错，它只是悄悄地按另一个意思匹配。**
   跨语言习惯（`\Z` 在 Python/PCRE 里是"字符串末尾"）搬进 JS 就是这颗雷。

2. **模块接管已存在的按钮时没补 a11y 属性。**
   `mount()` 原实现假定 `[data-primer-open]` 上的 `aria-label` 作者已经写全。
   head-neck 是 93KB 单文件、顶栏结构与本家其他项目不同，按钮只能手写，
   结果只有可见的 "?"，读屏软件读出来就是一个问号。改成接管时补齐
   `aria-label` / `aria-haspopup` / `aria-controls`（已有值不覆盖）。

同步：16 个已落地的项目各提一条 `chore(36): primer 模块同步到 starter 1.6.1`，
`head-neck`、`bladder`（无 `.top-actions`，模块退到 `.topbar`）两个特殊布局复跑仍 9/9。

## 2026-10-25 · 1.6.x 从慢性淋巴细胞白血病（小淋宝 LymPal）回收：移植残留检查器

从 `cervical-workbench` 移植引擎到 `cll-workbench` 时，**底本品牌名进了患者界面**：
`src/client.js` 的 `TITLE` 还是「小莲宝 CerviPal」、`scripts/dev-server.mjs` 用法行同款、
两个测试断言 `/小莲宝/`，共 14 处；随后新检查器又抓出 `scripts/check-pack.mjs` 仍在请求
`/api/cervical/...`（装机自检会 404）——**这个缺陷靠人工 grep 漏了一轮**。

- **`scripts/check-derivative-leftovers.mjs`（新增，随 init 下发并入 `npm run check`）**：
  扫 `dsh/ lib/ public/ src/ demo/ scripts/ test/ prototypes/` + `README.md`，
  命中底本病种/品牌词表（25 条，含 CerviPal/小莲宝/cervical/宫颈 + 家族各仓品牌）即红；
  行尾 `leftover-allow` 可豁免并须写理由；检查器自身文件跳过（否则词表扫自己永远红）。
  **自带 `--self-test`**：4 条正反例 + 1 条元断言（清空词表后脏样本不再命中，证明断言有牙齿）。
  实测：对本仓 61 文件零命中；对移植中的 CLL 仓先抓出 4 处（check-pack 的旧前缀），修完转绿。
- **`docs/LESSONS.md` 新增 L28–L31**（从 CLL 回流）：
  L28 检查器读生成物要先剥注释、并回查常量字面量（底本注释里的 `customFrame=true` 被当成值）；
  L29 换病种必须**整体重写**五套测试（底本断言的是它的业务表名/私密分节，改常量是假绿）；
  L30 「数据只有一个来源」要在**生成器与原型两处逐点**钉住（只比末值会放过分叉序列）；
  L31 装机 profile 不能凭 `~/.dsh` 推断（Desktop 实际用 `~/Library/Application Support/dsh-desktop/harness/profiles/web`，
  装错会「装成功但界面永不出现」）。
- **待实施**：`check-workbench-package` 增加「`files` 未含运行时会读的目录」断言（与 NF 回流待实施⑤之②合并）。


## 2026-10-25 · 28 号新增 IP11：每页头部「和 AI 讨论」（GTN v0.7.0 参照）

每页标题行常驻「和 AI 讨论」按钮（拉起对话栏 + 携带本页关键信息 discussFacts，不代发）；顶栏五态开关承担拉起/隐藏原生对话栏；弹窗类内容内置讨论入口。GTN v0.7.0 为参照实现（47 原型断言含 3 条 IP11 断言）。
## 2026-10-25 · 1.6.0 疾病概要（36 号）：每台一个「?」，四段说清「我得的这个病」

用户原话：「在每个癌肿项目的 readme 介绍 + 工作台看板，添加一个？图标：点击后介绍疾病精炼概要，
包括定义-医学资料规范和指南情况，目前治疗全景概要介绍，以及发展趋势。对 Downloads 下所有工作台，
补充这个动作，另外把这个要求加入到 starter 脚手架里。纳入要求，以及开发后审计两个节点。」

**为什么这是该做的事**：患者第一次打开工作台看到的是「我的记录」，但要读懂自己的记录，得先知道这个病的
公共背景——怎么定义、医生依据哪份指南、指南里列了哪些手段、这些年指南与药物在往哪动。这些都不是「你的判断」，
是公开信息的整理，正好落在三层信息边界的第 ② 层。**给背景是为了让人少猜**：只讲「你的数据」不讲「病的背景」，
人就会拿自己的单点数值去推全局。

**四段固定、顺序不变**：定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势。
缺段即不合格，没内容写「本台尚未整理」，不许删段（删段会让人以为这个病没有这块）。

**「发展趋势」是这条最容易越界的段**，白名单写死五类已发生的事实（指南版本更替 / 监管批件 /
在研登记数量与阶段分布 / 分类体系更新 / 指南结构变化），每类都要带日期或版本号；展望、推荐、优劣类词
另有一套禁止词表，`check-conformance.mjs` 的 `primer/趋势段` 会扫。要表达「在研多」，写数字不写形容。

形态是**整页视图**（32 号）不是弹窗——四段必然超过 1.5 屏，塞进弹窗只会被压成摘要。

下发：

- `docs/36-DISEASE-PRIMER.md`：规范本体（四段定义、趋势白名单、来源栏格式、两个节点、P1–P8）。
- `assets/patterns/disease-primer.js` + `.css`：参考实现。**经典脚本 IIFE，不是 ES module**——
  原型要 `file://` 双击能开，模块会被 CORS 拦（32 号踩过同一个坑）。自动把「?」插进 `.top-actions`
  （取不到退 `.topbar`，再取不到浮右上角），所以多数项目只需加三行引用。
- `examples/disease-primer.html` + `disease-primer-data.js`：可跑示例（用软组织肉瘤做样例，标注为示例数据）。
- `templates/DISEASE-PRIMER.md`：项目实例填空题（四段 + 来源栏 + 落地清单 + P1–P8 验收表）。
- `scripts/probe-disease-primer.mjs`：P1–P8 + E0 共 9 条断言，`--self-test` 注入三个缺陷（小弹窗 /
  删返回入口 / 趋势塞禁止词）必须至少 3 条 FAIL。实测 9/9 通过、自测 6/9（3 FAIL）。
- `init.mjs` 下发 `docs/DISEASE-PRIMER.md` 模板与探针，`package.json` 加 `probe:primer`。
- `check-starter.mjs` 必备清单加 8 个新文件。

**两个节点（用户点名）**：①要求 = `AGENTS.md` 新增「疾病概要」硬约束段 + `prompts/ZERO-TO-DEV.md`
的 M4 必查件（M1 起写清单，M4 上线前必须能点开）；②开发后审计 = `check-conformance.mjs` 新增
`primer/README`、`primer/数据`、`primer/趋势段`、`primer/入口` 四项，只看文件与代码——README 写
「已加 ? 图标」不算数，原型里没有 `primer.js` 或 `data-primer-open` 就是没加。

**踩坑三条**：
1. `--self-test` 第一版只在 load 时注入缺陷，而面板 DOM 是**第一次 open 才建的**，删按钮等于没删，
   自测只剩 1 条 FAIL。改成「open 之后注入面板缺陷 / P8 之前注入数据缺陷」两处分别注入。
2. 示例数据的趋势段原本写「不写『有望』这类词」——自己撞了自己的禁止词表，P8 判红。**规则文档里可以
   引用禁止词，数据文件里不行**。已改成「不做评价、不给倾向」。
3. P6 想验「关掉后滚动位置不变」，但示例页太短根本滚不动（`scrollY` 一直 0，测了个寂寞）。加了几块
   占位内容把页面撑长，断言才有意义——**验证滚动恢复，先保证页面能滚**。

## 2026-10-25 · 1.5.10 从慢性粒细胞白血病（小粒宝 GranPal）回收：断言强度检查器

## 2026-10-25 · 从神经纤维瘤病小纤宝 FibroPal（neurofibromatosis-workbench v0.1.2）回收

- LESSONS L26/L27：真机 boot 的 ctx.config 未注入激活失败（smoke 桩件要显式不给 ctx.config）；package files 漏 schema/ 致装机后迁移失败（files 与运行时读路径对照）。
- 检查器待实施清单 ⑤：ctx.config 无注入断言 + files 含 schema 断言（见 LESSONS 文末）。
- 新可复用结构：templates/FLIP-METRIC-CARD.md（3D 翻转指标系列卡，与 32 号折叠卡并列），ZERO-TO-DEV 挂钩。
- 流程规则：自动领取前按 issues 搜索确认无人正在做；NF 语境判读词黑名单追加恶变风险/遗传概率建议两类。
小粒宝第四轮独立评审抓出一类此前没被写成规则的缺陷：**「被空值骗过的真」**——
断言"关掉治疗条后曲线不变"在实现**一根线都没画出来**时也是绿的（`before`/`after` 都是空字符串）。
同一轮还有第二例：图例写「全期口径」，基线实际取窗口内首点，而"图例文字没变"这条也绿，因为没人核过基线来源。

- **`docs/LESSONS.md` 新增「假面孔 C：被空值骗过的真」**，与既有假面孔 A（同步读 DOM）、
  B（跨场景状态污染）并列。四条要点：①断言"不变"前先断言"有东西"；②"不变"要比较**所有会变的量**
  （本项目只比 `d`，缺陷恰好只动 `cy`）；③声称"口径 X"必须核口径**来源**；④触发不了记 **SKIP 不记 PASS**。
  元教训：**一条断言如果在实现完全坏掉时也能通过，它不是断言是装饰**。
- **`project-template/scripts/check-assertion-strength.mjs`（新增，随 init 下发并入 check）**：
  扫 `scripts/` 下所有 `probe-*` / `verify-*` 的 `.py`/`.mjs`（**不手写清单**，新探针自动纳入），
  找出「两侧变量都来自 `get_attribute`/`textContent`/`getBBox`/`evaluate` 等取值源」且用 `==`/`===` 比较的断言，
  要求往上 20 行内出现过非空守卫，否则报红。
  **双向验证**：无守卫 → 红；加 `assert len(x) > 0` → 绿；再删守卫 → 又红。
  **第一版自己犯了两处错**（已修，值得记）：①手写候选清单，新建的探针文件根本没被扫到（正是它要防的那类错）；
  ②正则只认驼峰 `getAttribute`，Python 探针的 `get_attribute` 被当成普通变量 → 故意写坏的用例被判 pass。
- 接入：`scripts/init.mjs` 的 check 末尾、`scripts/check-starter.mjs` 必存在清单。冒烟：新项目 `npm run check` 绿，
  输出「3 个探针脚本通过「先证有东西，再比不变」检查」。

> 顺带记录一处远端状态（未擅自改）：拉取时 `package.json` 为 `1.5.8` 而 `CHANGELOG.md` 顶部已是 `1.5.9`，
> 两者漂移。本条目按 **1.5.10** 落，`package.json` 一并归位到 1.5.10。


## 2026-10-25 · 1.5.9 页面版本字面量闸门随 init 下发：UI 显示哪一版 = 服务端跑哪一版

「版本号三处打架」是家族高频故障，但**页面那一处从来没人拦过**：`public/index.html` 的
版本徽标和页脚可以写死 `v0.1.0`，升版时只动了 `VERSION` 和 `package.json`，页面还显示旧版本，
**没有任何检查会响**——用户拿着旧版本号来提问，你只能反查他装的是哪一版。

两个病种独立复现（L2 门槛）：

1. **cervical-workbench**：自己在 `scripts/check-version.mjs:67` 立了「页面字面量去重后与 VERSION 比对」的闸门。
2. **PF-ILD-workbench v0.2.0**：升版 `0.1.0 → 0.2.0` 后 audit 直接报红
   `public/index.html 里有版本字面量与 VERSION 不一致（0.1.0）`——徽标 `#ver-chip` 与页脚
   `#app-version` 各写死一处，而定点移植脚本只替换了 `prototype-bar` 那第三处。
   顺带暴露一个更隐蔽的形态：**「可复跑的移植脚本」把漂移从代码转移到了脚本里**，脚本自己也会漂。

下发 `scripts/check-version-literal.mjs`（进 `npm run check`，另有 `npm run check:version-literal`）：
支持两种约定——**占位符约定**（页面写 `__VERSION_DISPLAY__` / `__BUILD_DATE__`，服务端注入，
物理上不可能不一致，PF-ILD 已落地）与**字面量约定**（存量项目，出现的版本必须全部等于 `VERSION`）。
原型阶段还没有 `public/index.html` 时**跳过**（check 从第一天就该是绿的）；
页面完全不显示版本也判失败（看不见就不算错也是错）。测试 8 条含正反例与行号断言。

新文档 `docs/35-PAGE-VERSION-LITERAL.md`。

> 已知：本轮 `npm test` 在干净克隆上也失败 1 条（`ships the desktop-load verifier`，
> `starter.test.mjs:59` 的 `/界面加载核验/` 不匹配）——**与本变更无关**，是 1.5.7 的既有问题，
> 如实记录未修。


## 2026-10-25 · 1.5.10 两个检查器：静态引用完整性 + 选择上限一致性

PF-ILD v0.2.0 交付前 `check` 全绿、`audit` 0 fail、`test` 60/60，真浏览器打开才发现两处坏掉。
共同点：**缺陷不在"写错一行"，而在"看起来对"**，静态 grep 与既有检查链一条都罩不住。

### 新增 `check-static-refs.mjs`：**家族第二次**，升 L3 硬拦截

开发版把数据层从 `window.DEMO_DATA` 换成异步 `/api/bootstrap`，`public/demo-data.js` 随之删除，
**但 `index.html` 里的 `<script src="demo-data.js">` 没删**。请求 → 静态层找不到 →
**SPA 兜底返回 index.html** → 浏览器把 HTML 当 JS 解析 → `SyntaxError: Unexpected token '<'`
→ **整页脚本全废**。最要命的是「看起来能开」：header/导航/卡片标题/页脚都在（HTML 本来就有），
只有 JS 渲染区域是空的。

> `docs/LESSONS.md:203`（ATTR「业务区全白」）已记过一次，**这是第二次**。
> 按 SCAFFOLD-ITERATION §1，第二次 = 升 L3 并自动拦截，不能只写在文档里等下次再踩。

检查：`<script src>` / `<link href>` / `<img src>` 的本地相对路径必须真实存在；
被引用的 `.js` 内容不得以 `<` 开头（HTML 兜底当 JS 的典型特征）。

### 新增 `check-choice-limit.mjs`：设计层早有、检查层缺失

一图秀指标选择上限 4 项。点第 5 项：toast 正确弹「最多选 4 项」，
**但 checkbox 的浏览器原生勾选已经发生**，代码 `return` 在 `render()` 之前，
界面停在「已勾 5 项」而数据只有 4 项。

诱因是**阅读顺序的错觉**：拒绝分支后面（调用方末尾）确实有 `render()`，读代码时容易认为"反正会重绘"，
但拒绝路径 `return` 之后那行**执行不到**。

> `docs/19-PROTOTYPE-CRAFT.md` §5-6 早写了「回弹 checkbox 并 toast 解释」，**设计层覆盖了**，
> PF-ILD 首次违反 → L2。教训：**设计覆盖 ≠ 实现覆盖 ≠ 检查覆盖**，三者少一层规则形同纸面。
>
> 19 号已补「实现层铁律」：回弹必须是**拒绝分支体内的显式动作**，不能指望调用方兜底。

检查：找到「上限判断 + 拒绝」分支，要求**分支体内**有状态回滚或重渲染。
只扫拒绝分支体，**不把 return 之后的行算进来**——这正是本检查器第一版写错的地方：
它把调用方末尾的 `render()` 算进了分支，**反例判成通过**。写完四形态测试才暴露。

### 测试与接线

- `test/check-static-refs.test.mjs` 7 条、`test/check-choice-limit.test.mjs` 7 条（正例/反例/单行/多行/注释/不误报）
- 两者随 `init` 下发，进 `npm run check` 链，另有 `check:static-refs` / `check:choice-limit`
- `docs/06-VALIDATION-AND-RELEASE.md` 新增「随 init 下发的六个检查器」总表（含各闸门抓哪一类、来源病种）
- 反例留痕：PF-ILD 实际项目上把 `demo-data.js` 引用放回去 → 闸门报红并指名该文件；恢复后转绿

### 验收

- 脚手架：`check-starter` pass=true（files 176）；`npm test` **61 pass / 1 fail**
  （仍是 1.5.7 既有的 `desktop-load verifier`，干净克隆同样失败，与本变更无关）
- 临时目录同配置 init：181 文件，三个闸门全部下发，`npm run check` 输出三条「跳过（原型阶段）」并整体 PASS
- 真实项目回归：PF-ILD 上两个闸门当前均绿（60/60 test、audit 0 fail 未受影响）

## 2026-10-25 · 1.5.8 从慢性粒细胞白血病（小粒宝 GranPal）回收：检查器覆盖面

CML 工作台 M2 增补轮（三块家族既有能力：指标卡 3D 翻面 / 一图秀指标选择 / 临床试验三档匹配）回收到脚手架：

- **`project-template/scripts/check-probe-coverage.mjs`（新增，已串进生成项目的 `check`）**：
  断言三个探针脚本（`probe-page-view` / `probe-ip-matrix` / `probe-write-paths`）的 `PAGES` 覆盖原型 `app.js` 里每一条 `ROUTES`。
  起因：加了新页 `onechart` 后三个探针仍只扫旧 10 页，于是"宽度/溢出/禁词全绿"其实是"新页根本没被测"。
  **双向验证过**：抹掉一条路由 → 报 `漏了 1 条路由 [onechart]`；恢复 → 通过。
  新项目还没有 `prototypes/v0.2/app.js` 时**显式 skip 并打印原因**（不静默通过，也不崩——`check` 从第一天就该是绿的）。
- **`docs/LESSONS.md` 第 10 类（新增）**：**「检查器全绿」可能是它没在看你那一页**。含四种真实形态（手写路由表漏新页 / 字号按值放行 / 默认展开 details / 免责措辞自己踩禁词）与两条元教训：
  ① 静态检查器对"新增的东西"天然失明，每加新路由/新页/新数据表，**先把名字加进所有覆盖面清单，再写实现**；
  ② **孤儿页判据必须双口径**——「无入站链接 **或** 无场景路径经过」任一成立即算孤儿。CML 实测 `链接缺席=[]` 但 `路径未经过=['onechart']`：代码里入口是有的，文档里没有场景说明"用户为什么会到这一页"。只查代码链接会放过它。
- **字号豁免的正确粒度**：24 号要求数字约 33px，正文只允许 12.5–15px。不能让检查器"按值放行 33"（等于取消断言），要**按选择器**单点豁免（CML 用 `NUMERAL_SELECTORS = ['\\.mval']`），且豁免条目要能在本项目 `DEV-REQUIREMENTS §七` 查到来源。
- **断点要从规范的断言值反推**：27 号 §4.3 断言 1440/1080/860 → 列数 2/2/1，等价于断点取 **960px**；按直觉写 700px 会让 860px 档变两列、三档断言直接不过。


## 未发布 · 2026-10-25 · 34 号修订：面板唯一性（2b）与 A4 断言

用户真机反馈（肢端肥大症截图）：嵌入式形态右侧出现业务页自带的『AI 协助·演示』面板残留。34 号 §一新增 2b 条款——**演示面板只存在于独立打开形态，嵌入式下原生会话是唯一 AI 面板**；断言器加 A4（嵌入式支持 ⇒ 演示面板必须有门控），正负例实测。


## 未发布 · 2026-10-25 · 35 号 v2：以小胆宝 match-0.1.0 为参考实现

按用户指示核对 biliary-tract-workbench 试验匹配页后修订：允许语义受控的『粗筛符合度 pct』（符合项÷已对照项、待确认按 0 计只偏低）+ 四档分层（高度符合/部分符合/需补充信息/硬性条件不满足单列）+ 逐条三态证据链；仍禁止 eligible/suitability 判读列与"适配度/入组概率"命名；断言器 T2 收窄、新增 T2b（band 词+『不是入组资格』声明）；小胆宝仓正例通过。
