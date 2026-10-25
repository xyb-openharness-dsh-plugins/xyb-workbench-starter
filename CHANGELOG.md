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
