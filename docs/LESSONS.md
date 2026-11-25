## 2026-11-22 · 从角膜缘干细胞缺乏症小膜宝 LimbalPal（lscd-workbench v0.1.0）回收

### L99 · 眼科多指标量纲与倒向区间映射规范

眼科特征指标同时涵盖无量纲分级（如裂隙灯结膜化分级 0~4 级、角膜新生血管累及钟点数 0~12 点）、倒向指标（荧光素染色积分 FLS 越小越好、LogMAR 视力 0 为最好）与连续物理量（眼压 10~21 mmHg、泪膜破裂时间 >10 秒）。
一图秀与指标卡需要支持倒置基线与多轴双量纲缩放。如果简单使用单向递增坐标轴，会导致荧光素染色积分好转（数值降低）在视觉上表现为下行下跌，引发误解。
**规则**：指标定义增加基线方向属性（`better_direction: 'lower' | 'higher'`），一图秀按方向自适应 Y 轴上下界与颜色预警。

### L100 · 左右眼别（OD/OS/OU）眼表实体建模与隔离

眼科疾病具有高度单眼/双眼不对称性（如单眼化学伤导致单侧 LSCD，对侧为健眼供体；或双眼累及但分级严重度不同）。
从非眼科底本移植时，必须在事件表（`lscd_events`, `surgery_events`）与展示层显式增加 `eye_side` 支持，避免双眼数据混淆导致随访失真与手术植片记录错乱。

### L101 · 真实临床试验 MCP 多通道检索状态诚实留痕

在通过统一试验 MCP 采集时，部分通道（如 `chictr_online`）可能返回 `FAILED` 或 `NO_RESULTS`。
按照 35 号口径，这不能视为“未查过”，而需把通道终态存入 `source_statuses` 表；同时，只对成功通道去重归一，确保快照元数据与数据库 100% 对账。

### L102 · MinerU 视觉眼表报告抽取位置对齐

眼科检查报告常包含裂隙灯与眼前节图片下的文字描述（如上皮缺损面积、染色点数）。
本地抽取规则应强化对“缺损”、“点状染色”、“钟点”等眼科关键词的位置匹配与 HTML 表格解构，先转竖线表再对齐，防止图文混排导致单元格压缩串位。

---

## 2026-11-22 · 从家族性噬血细胞综合征小噬宝 PhagoPal（fhl-workbench v0.1.0）回收

### L95 · 原型指标卡 key 与 label 失配导致静默 0 渲染

在构建 `prototypes/v0.2/demo-data.js` 时，`metricGroups.items` 必须配置为 `metricDefs` 对象的键名（即缩写 key，如 `['SF', 'sCD25', 'IL-6']`），而不是中文名称（如 `['血清铁蛋白', '可溶性CD25', '白介素-6']`）。
若写错为中文名，原型渲染器无法按 key 取到单位、参考区间与数据点，导致所有指标卡全部静默跳过渲染，卡片总数为 0，直接触发 `probe-page-view.mjs` 在 `X2` 断言报 `expected > 0, got 0`。
**规则**：`metricGroups` 只存指标 key 引用，显示标签统一通过 `metricDefs[key].name` 解构；增加断言校验 `metricGroups.items` 中的每个元素必须在 `metricDefs` 中有定义。

### L96 · 诱发因素枚举 `triggerDefs` 必须与 `TRIG1` 探针硬断言完全闭环

`demo-data.js` 中必须显式提供完整的 `triggerDefs` 诱发因素枚举（如 `ebv_virus`, `infection`, `non_adhere`, `chemo_myelo`, `vaccine`, `fatigue`, `unknown`, `other` 8 项）。
探针在抓取 `TRIG1` 触发事件时，会严格断言 `hasEnum === true`。若缺少该配置，探针在自动化走查中报红。

### L97 · 移植底本的表名与列名强校验（静态 AST/词表 + 动态测试）

从底本移植代码时，核心业务事件表名（如 TIO 的 `pmt_events` vs FHL 的 `fhl_events`）以及关联列名（如 `treatment_events` 的 `name` vs `drug_name`）极易遗留在 `readmodels.js` 或测试用例中。
这种失配在纯静态扫描时不易察觉，但在运行时会直接抛出 SQLite 错误 `no such table: pmt_events` 或 `table treatment_events has no column named name`。
**规则**：以 `schema/0001_initial.sql` 唯一真实来源建立表名/字段名白名单；`npm test` 必须全量覆盖全部 CRUD 与 readmodel 接口。

### L98 · `check-profile.mjs` 单插件快速验机与异常隔离

在 DSH Desktop 宿主装载了多个社区插件的复杂 profile 环境下，`check-profile.mjs` 原有逻辑会顺序遍历加载每一个插件，若某个其他插件（因未编译或未安装）报错，会误中断当前正在验收的插件。
**回流改进**：支持 `--only <slug>` 精确单仓过滤，并在扫描各个插件时做好 `try/catch` 隔离与容错，使得当前插件的自动化验收独立可靠。

---

## 2026-10-25 · 从慢性淋巴细胞白血病小淋宝 LymPal（cll-workbench v0.2.0）回收

### L28 · 移植底本的检查器会把**底本病种名**当成本项目的期望值

`scripts/check-host-contract.mjs` 从「底本 + 布局」拼出的字符串里正则找 `customFrame`。
底本头部注释里写着「面板 customFrame=true · 业务 left 0.65」，而本项目的真实值是
`const CUSTOM_FRAME = String(PANEL.customFrame === true)`（生成物里的常量引用）。三轮修法都不对：

1. 先报 `true · 业务 left 0.65`（注释被当值）→ 只剥 `//`/`/*` 行头，**没剥块注释续行 ` * `**；
2. 再报 `'true' === 'true'`（常量赋值式被当值）→ 把正则收窄成 `customFrame:\s*` 对象属性形态；
3. 最终仍报 `CUSTOM_FRAME`（属性值本身是常量）→ 还要**解析常量定义**取字面量。

**规则（可做成断言）**：检查器读生成物时，**先剥注释再匹配**，且属性值允许「常量名」——
需回查 `const NAME = 'true'|'false'` 的定义。判据：把底本原样换成新病种，检查器应直接绿；
若不绿，问题在检查器不在项目。

### L29 · 五套测试是按底本**业务形状**写的，换病种必须整体重写而不是改常量

底本的 `store/server/import-export/demo-parity/ui-parity` 断言的是 `metric_points`、`documents`、
`candidate_fields`、私密分节 `vagina/sexual`。直接 `sed` 换病种名 → 31/42 红（不是环境问题，是形状不符）。
CLL 的 19 表与 cervical 的 18 分节没有任何一列同名。

**规则**：移植第一步先跑一遍底本测试，把红项按「形状不符 / 环境不符」分类；形状不符的一律
**按本项目 schema 重写**（本仓重写后 41/41）。改常量能让它变绿的那种改法是假绿。

### L30 · 「数据只有一个来源」要在**两处**同时钉住：生成器与原型

原型（视觉基准）与 demo 生成器（入库基准）各有一份血象序列时，日期与点数会悄悄分叉
（原型 10 点 2024-11 起 / 生成器 9 点 2024-03 起）。**正确方向是生成器服从原型**——
原型是签认过的视觉基准，生成器跟它对齐后，parity 测试才有意义。

**可断言**：`test/demo-parity` 里逐点 `deepStrictEqual(原型点位, 生成器点位)`，
而不只比点数或末值。只比末值时两条不同序列也可能通过。

### L31 · 装机目标 profile 不能凭 `~/.dsh` 推断

本机同时存在两套：`~/.dsh/profiles/desktop`（通用 CLI）与
`~/Library/Application Support/dsh-desktop/harness/profiles/web`（DSH Desktop app 实际使用）。
按 06 号做「装到 ~/.dsh」会**装成功但 Desktop 永远看不到**，而 `verify-desktop-load` 会如实报
「装机目录 未安装」。

**规则（可做成断言）**：装机前先读 `desktop-workbenches/state.json` 的 `added` 数组——
里面出现的 workbench 说明宿主认这个 profile；再用 `~/Library/Logs/DSH Desktop/harness.log`
里出现的 `profiles/<名字>/node_modules` 路径交叉确认。两处一致才动手装。

### 待实施⑦（下轮进检查器）

- `check-workbench-package`：移植自底本时，若 `package.json` 的 `files` 未包含运行时会读的目录
  （`schema`/`public`/`demo`），报红（与 NF 回流待实施⑤之②合并实现）。
- 新增 `check-derivative-leftovers`：扫 `dsh/ lib/ public/ src/ test/ scripts/` 里出现
  **底本病种名/底本品牌名**（如 `cervical`/`CerviPal`/`小莲宝`/`宫颈`）即报红。
  本轮实测残留 14 处（`src/client.js` 标题、`dev-server.mjs` 用法行、两个测试的 brand 断言），
  人工 `grep` 才清掉；这类残留会直接出现在患者界面上。

## 2026-10-25 · **假面孔 C：被空值骗过的真**

慢性粒细胞白血病工作台（小粒宝）第四轮独立评审抓到的，比前两副面孔更隐蔽——**它不是假失败也不是假通过，是一条"证据看起来完备"的假通过**。

```js
// 断言：关掉"治疗条"后曲线不变（16 号 R3 硬要求）
const before = path.getAttribute('d');
toggleTreatment();
const after = path.getAttribute('d');
assert(before === after);   // 恒成立——因为 before 和 after 都是空字符串
```

真实情况：绘图函数的调用方传 `[x, y]` 数组，函数只认 `{x, y}` 对象，`filter` 把点全丢了 → `d=""`。
**图上一根线都没有画出来**，而这条断言绿了整整一轮，自检里还写着「实测 True」。

同一轮第二例：图例写「全期口径」，基线实际取的是**窗口内**首点。切 6 个月窗口后基线从 42.6% 变 8.4%，
但"图例文字没变"这条也绿——因为没人核过基线的**来源**。

**修法与验收合同**：

1. **断言"不变"之前，先断言"有东西"**。顺序不能反：
   `assert(d.length > 0)` → `assert(bbox.width > 0 && bbox.height > 0)` → 再比 `before === after`。
2. **"不变"要比较所有会变的量**，不只最显眼的那个。本项目只比 `d`，漏了每个点的 `cy`——
   而缺陷恰好只动 `cy`（治疗条压缩了绘图区高度）。逐项列全：路径、坐标、bbox、容器高度。
3. **凡声称"口径 X"，断言必须核口径的来源**。写"全期口径"就要断言基线等于全期首点，
   而不是断言"这段文字没改过"。
4. **空窗口用例触发不了时记 SKIP，不记 PASS**。触发不了却记 PASS 等于假装验过。

**元教训（可直接做成断言）**：一条断言如果**在实现完全坏掉时也能通过**，它就不是断言，是装饰。
写完立刻想一遍"我把核心逻辑删掉，这条还绿吗"——本项目那两条都会绿。

## 2026-10-25 · 从神经纤维瘤病 v0.1.3 回收：profile 目录会被应用迁移

**【2026-10-26 修正：上一版这条把方向写反了】** 工作台 bundle 永远装 **DSH Desktop.app** 的
profile：`~/Library/Application Support/dsh-desktop/harness/profiles/web`（本地惯例：tgz 拷进该目录、
依赖写 `file:<tgz 文件名>`、bundles 数组登记、`CI=true corepack pnpm install --no-frozen-lockfile`）。
**不能**因为 `pgrep -fl dsh-desktop-host` 看见 DeepSeek Harness（Agent 宿主）的 argv 指向
`~/.dsh-classic/profiles/desktop` 就往那里装——Agent 宿主加载工作台 bundle 会把宿主搞崩
（NF 0.1.2–0.1.4 三轮装错位置，用户反馈"安装位置错误，导致 dsh 崩溃"后纠正）。
两个 app 的分辨判据见 1.5.7 节；激活的硬证据：DSH Desktop 的 web profile 数据目录里出现
`schema_migrations` 有记录的 sqlite（真目录模式不灌演示数据，表计数 0 是正确行为）。

## 2026-10-25 · 从神经纤维瘤病小纤宝 FibroPal（neurofibromatosis-workbench v0.1.2）回收

- **L26/L27 见上表**（真机 boot 的 ctx.config 未注入；files 漏 schema/）。**待实施⑤（下轮进检查器）**：`check-workbench-package` 增加——① `dsh/*.js` 出现 `ctx.config` 且对应 `apply(ctx` 无第二参 → 报错；② 存在 `dsh/store.js`（读 `../schema`）而 package.json files 缺 `schema` → 报错。
- **可复用结构（templates 挂钩）**：`templates/FLIP-METRIC-CARD.md`——分系列有序指标卡墙 + 正面当前值/背面最近记录与来源的 3D 翻转卡（含 reduce-motion 降级与键盘 Enter 支持），与 32 号折叠卡并列的第二个"原型即模版"结构；`prompts/ZERO-TO-DEV.md` 已在功能线清单挂引用。
- **流程规则**：自动领取前必须按 issues 搜索确认无人正在做（本轮 PF-ILD/地贫/儿童急淋均已被认领，BACKLOG 未认领池 ≠ issues 现实）；判读词黑名单在 NF 语境追加"恶变/癌变风险提示、遗传概率建议"两类（仅静态来源引用豁免）。
- **待实施⑥（既有失败，2026-10-25 实测）**：starter `npm test` 中 "ships the desktop-load verifier" 在本机失败——`verify-desktop-load.mjs` 在找不到 DSH Desktop harness 目录时直接抛「找不到…harness 目录」，没走到「界面加载核验」可读结论分支（test/starter.test.mjs:59 期望 `/界面加载核验/`）。该失败早于本次 NF 回流（stash 验证过），按不修绿纪律只登记不擅改。

## 2026-10-26 · 从急性髓系白血病（aml-workbench v0.3.0）回收

1. **判定对 ≠ 提示可见**。`classifyTemp` 的边界逻辑 11 例全过，纯函数断言 9/9 绿；
   但 UI 层 `onSave(vals); closeModal()` 把刚弹出的急症框当成录入框一起关掉了——
   家属录 38.5℃ **什么提示都看不到**，体温静默入库。5 个 check 全绿，红线已破。
   **切法（两条）**：
   - 表单保存回调要能"接管弹窗"：`const handled = onSave(vals); if (handled !== true) closeModal()`
     ——凡是 onSave 里会再开弹窗/对话框的，必须走这条；
   - 断言器必须有一层**源码级守卫**：grep 出「先关后弹」的调用顺序 + `dataset.emergency` 标记 +
     cancel/遮罩拦截。纯函数断言永远看不见 UI 编排。
2. **"不可忽略"必须写进事件拦截，不能只写文案**。急症框文案写着"不可忽略关闭"，
   但 `<dialog>` 默认 Esc 可关、遮罩 click 可关——全文件 `addEventListener('cancel')` 只有 0 处。
   **切法**：不可忽略对话框 = `dataset.emergency='1'` + `cancel` preventDefault + 遮罩点击忽略 +
   唯一出口按钮 + closeModal 时清标记（否则下一次普通弹窗也被锁）。
3. **"写进去"和"看得见"是两件事**。`mem().temps.push(...)` 写了，但 `grep mem().temps`
   三处全是写、无一处渲染——家人代记的体温曲线只能存不能看。**切法**：每个新写入点都必须
   配一条"写入后渲染出现"的断言（录 1 条 → 图上/列表里 +1）；这类缺失静态检查抓不到，
   要靠"写入点 → 读取点"双向 grep 核对。
4. **README 截图会静默腐烂**。同一目录存在 `-0.2.0`（新，1000px）与 `-v0.2.0`（旧，940px）
   两套，README 引用的是旧的，其中一张还是根本不存在的文件名（破图）。**切法**：
   截图产物入库前做三项断言——① 引用路径全部存在；② 全目录 md5 无重复；
   ③ 文件名版本 == VERSION；并删除旧命名的一套（两套并存必然引错）。
5. **SVG 标签要避让，位置由上一条决定**。hourLane 事件标签（12:40 / 13:10）、
   一图秀输注泳道（红细胞×1 / 血小板×1）都直接 `x+6` 绘制，实测包围盒相交叠印成黑块。
   **切法**：同泳道内按 x 排序，相邻 < 阈值则交替上下两行（配引导线）；
   一图秀末点标签的 `cursor` 避让模式可直接复用。
6. **schema 断言器要自校验哈希**。`check-schema.mjs` 不只查"有无判读列"，
   还比对 `freeze-contract.md` 里记录的 sha256 与当前文件——否则"冻结"只是口头约定，
   谁改一行 ALTER 都能悄悄过。反例测试：改一个空格即报"冻结被破坏"。

## 2026-10-26 · 从神经纤维瘤病 0.1.5 回收：激活失败的两个判据坑

- **L28 · mkdirSync(recursive) 返回值不可当路径**：`mkdirSync(dir, { recursive: true })` 在目标目录**已存在**时返回 `undefined`；把它传给 `join()`/`readFile` 等 → `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string`。表现极阴：**首次安装能跑（目录被创建），之后每次重启必挂**，工作台从列表里消失。修复：mkdir 与拼路径分离（`mkdirSync(dir,{recursive:true}); join(dir,'db.sqlite')`），开库失败降级 503 + health `degraded`，不裸 throw；回归测试要"同一 root 连开两次"。
- **L29 · "装上了没有"的判据次序**：`Harness is ready` ≠ 每个 bundle 都激活；数据目录/工作台清单有痕迹 ≠ 界面看得见。正确顺序：① 看本次运行段（最后一条 `Harness process exited` 之后）有没有 `<plugin-id>` 的 error 行；② 看 profile 里 node_modules 链接与 bundles 登记；③ 最后才是人眼确认界面。

## 2026-10-26 · 从神经纤维瘤病 0.1.5 二次回收：Desktop 会自动禁用崩溃过的插件

- **L30 · 激活崩溃 → 自动禁用，之后"修好了也不出现"**：DSH Desktop 在一次 bundle 激活失败后，会往 profile
  `cordis.patch.yml` 追加 `- id: <plugin-id>\n  disabled: true`，并留 `cordis.patch.yml.pre-disable-<id>-<时间>` 备份
  （package.json 也有 `.pre-…-disable-…` 备份）。此后即使升级到修好的版本，条目仍被禁用，宿主启动段"干净无错"
  （因为根本没加载），列表里永远不出现。**排查"工作台不出现"的完整顺序**：
  ① `grep "id: <plugin-id>" -A2 profile/cordis.patch.yml` 看有无 `disabled: true`（有就删掉该条，删前备份）；
  ② 看 harness.log 本次运行段有没有 `<plugin-id>` 的 error 行；
  ③ 核 node_modules 版本与 package.json bundles 登记；
  ④ 最后人眼确认。

## 2026-10-26 · 从神经纤维瘤病 0.1.6 回收：ctx.effect 不是「注册清理函数」

- **L31 · `ctx.effect(fn)` 会立即执行 fn，fn 的返回值才是 disposer**。写成
  `ctx.effect(() => { close(db) })` 等于在 apply 阶段立刻关库；之后任何查询抛
  `Error: database is not open`，若 handler 是 async 且未被收口，就变成
  `unhandled rejection` → DSH Desktop 打 `dsh: fatal load failure` → 进入 plugin recovery
  并**自动写 `disabled: true`**（症状：工作台从列表消失，且启动段看起来"没有插件错误"）。
  正确写法：`ctx.effect(() => () => { try { close(db) } catch {} })`；路由守卫必须收口
  async rejection（`const out = handler(req,res); if (out?.then) out.catch(fail)`），
  否则"禁裸 throw"只覆盖了同步路径。回归测试两条：setup 阶段不得 close；async rejection 必须被捕获。

## 2026-10-26 · 从神经纤维瘤病 0.1.11 回收：「装上了但不出现」的三层判据

工作台在 DSH Desktop 里消失，可能是三层各自独立的问题，必须按顺序查完：

- **L32 · 市场层禁用最隐蔽**：profile 下 `.dsh-market/state.json` 的 `disabled` 数组会整包禁用插件；
  日志只有 `toggle: <pkg>: no loader entry matched`。此时 cordis.patch.yml 干净、包与 bundles 都在、
  代码也修好了，但 loader 根本不挂载 → 启动段"无错误"、界面永远不出现。
  核对：`cat <profile>/.dsh-market/state.json`，把本包从 disabled 移除（关应用后改，或走市场 UI 启用）。
- **L33 · 客户端 register 引用未定义变量**：描述符里写了只存在于组件内部的 state（如 healthVersion），
  register 每次抛错；症状同"没注册"。smoke-activate 能抓到，但它默认测 **profile 里已安装的拷贝**——
  改仓库后要先重装（或显式传目录）再跑 smoke，否则测的是旧包（本轮即因此漏报两小时）。
- 三层排查顺序：① `.dsh-market/state.json` disabled → ② profile `cordis.patch.yml` 的 `disabled: true` →
  ③ 本次运行段 `<plugin-id>` error / `no loader entry matched` → ④ node_modules 版本 + bundles → ⑤ 人眼。
## 2026-10-26 补 · 从急性髓系白血病 0.3.2 回收（真机加载不起来）

7. **`ctx.<any> = …` 必须先 provide，否则整个插件不激活**。小橙宝把诊断信息挂到
   `ctx.amlWorkbench`，`inject` 里没有、`provide` 也没声明；本地 `smoke:activate`
   **全绿**（桩件不校验 provide），装进 Desktop 后宿主日志只有一行
   `cannot set property "amlWorkbench" without provide`，界面上就是"加载不起来"。
   **切法（两条，都已落地）**：
   - 诊断信息别挂 ctx：走 `bootstrap` 响应的 `source` 字段、事件回调或 return 值；
   - 静态断言 `templates/check-ctx-provide.mjs`：扫 `ctx.<key> =` 是否都在
     `export const provide` 里（框架键白名单），正负例各一条。
8. **"桩件通过"是装机面最危险的假绿**。这条与 0.2.4 的"截图文案"、GBM 的"register 七条"
   同类：凡是**只有真宿主才走到**的校验，必须在开发期静态化或用真宿主探针，
   不能拿桩件全绿当装机通过。判据：桩件只验"我调用了什么 API"，不验"宿主允许什么"。

## 2026-10-27 · 从神经纤维瘤病 0.1.14 回收：degraded 字段早就说了实话，别只看 200

- **L36 · npm `files` 与运行时读路径的第二变体**：L27 是 schema/，这次是 **demo 唯一源文件**
  （`prototypes/v0.1/demo-data.js`）。凡代码里 `new URL('../…', import.meta.url)` 读的文件都要进 files；
  装机后EN OENT 会让 openStore **降级**（degraded=true + STORE_UNAVAILABLE），界面全空但不报错、
  health 仍 200——极易被当成"装好了只是没数据"。对策：health 的 `degraded`/`storeError` 字段
  是一等信号，装机验证先 `curl /health` 看这两个字段；check 断言"运行时读的每个相对路径都进 files"。
- **L37 · 真机空库注入演示数据是 M5 家族惯例**：空库（subjects=0）时 seedDemo（demo_meta 标记
  `demo=true`），客户端顶栏/看板明示「演示数据，与原型同一份 demo-data 唯一源」；已有真实数据
  （subjects>0）绝不注入。这样 M5 真机界面与原型逐像素同源，v0.2 写入闭环再引入真实数据。

## 2026-10-26 · 从多发性骨髓瘤小浆宝 MyeloPal 回收：临床快照要逐字段比对 JSONL 与 SQLite

症状：manifest 与 JSONL/SQLite 均显示 257 条、摘要 hash 均匹配，SQLite `integrity_check=ok`，但 49 条 CTV 记录的 sponsor 在 JSONL 有值、SQLite 为 NULL。只验总数和文件摘要无法发现映射遗漏。

**L40 · 临床快照核验必须把主键映射字段逐行对齐**：按 `record_id` 比较 JSONL 与 SQLite 所有共享业务字段（含 JSON 序列化列），并同时核对 manifest 计数/hash、SQLite integrity、重复主键和 source_statuses 数量/重复项。检查器只读打开数据库；不得通过重采或重建快照来代替复核。

- 新增 `templates/check-trial-snapshot.mjs`，初始化后下发为 `scripts/check-trial-snapshot.mjs`；新项目 `check` 链对无快照项目显式 SKIP，已有临床快照逐字段核对。
- 回归夹具分别验证完整映射通过、JSONL sponsor 丢失映射时报错、无快照只有 `--if-present` 可跳过。
- 本次原项目数据保留未改；检查发现 M4 未通过， sponsor 缺失仍待单独获授权修复或新版本采集。

## 2026-10-27 · 从神经纤维瘤病 0.1.16 回收：Desktop 侧 UI 的正解是「原型即 iframe」

- **L38 · 手写第二套 React 界面必被用户打回**：Desktop 模式下家族标准是 customFrame 客户端 +
  服务端 `/api/<slug>/ui/` 静态承载**已签认原型**（index/style/app/demo-data 进 files），
  客户端只做：顶栏（AI 对话按钮/版本/说明）、iframe 业务区、原生会话挂载、splitter 25–45%、
  收起不卸载。照抄同 profile 兄弟包（如 narcolepsy）的 client.js 做字符串级移植最快，
  主题色/文案/消息类型（如 `nf:agent-draft`）替换干净即可；iframe 内用
  `window.parent.postMessage({type:'<pkg>:agent-draft', prompt})` 把草稿交给原生会话。
- **L39 · 批量替换必须 assert**：python/脚本对源码做字符串替换时，替换目标不存在会让修复
  静默失效（本轮 imports 替换漏掉 → ReferenceError → 条目 did not activate → 路由 404）。
  规矩：每个 replace 后 assert 变化确实发生；装机验证用带鉴权 curl 对比 401（存在）/404（未挂载）——
  全站 auth 中间件下 401 恰恰证明路由已注册。

## 2026-10-27 · 从乳腺癌 / 食管癌 / 甲状腺的 36 号回补回收：开发版接入四问

- **L40 · 顶栏「?」必须手写，自动挂载会被看板按钮抢走**：`disease-primer.js` 的 `mount()` 逻辑是
  「DOM 里已有 `[data-primer-open]` 就接管它，没有才插一颗」。而 §2.6 状态卡的出口按钮排里本来就有一颗同名文字按钮，
  业务 `app.js` 又先于模块的 `DOMContentLoaded` 把看板渲染完 —— 结果自动挂载接管的是**状态卡里那一颗**，顶栏永远空着。
  更坏的是 **P1 照样 PASS**（`querySelector('[data-primer-open]')` 拿到的正是状态卡按钮，text / aria-label 都对），
  只有打开页面肉眼看顶栏才发现少东西。规矩：顶栏触发钮一律手写在 `.top-actions` / `.tb-actions` 里，
  让它成为 DOM 里第一个触发钮；状态卡那颗继续用文字，两处入口并存是 §2.6 允许的。
  **交付前必须看一张首屏截图**确认顶栏右侧真有「?」，只跑 P1 会漏。
- **L41 · 开发版的 `index.html` 要与原型逐字符一致，别自作聪明补 aria**：多数仓的检查链里有一条
  ui-parity 断言「index.html 与原型只允许差 title / 版本号 / favicon / noindex」。给触发钮补
  `class="dp-trigger"` + `aria-controls` + `aria-expanded`、或换一版更长的 `aria-label`，都会判红 ——
  因为 `mount()` 接管时自己会补齐这些属性，页面不该写。要真需要改骨架，就同步改原型，两边一起动。
- **L42 · §2.6 状态卡与业务首卡冲突时，定「通用骨架首卡在上、业务首卡在下」**：食管癌 `SPEC.md` 原写
  「吞咽卡为首卡」，体检 / 看板类项目容易都有一张「这就是我这病最要紧的那件事」的业务卡。两卡回答的不是同一个问题
  （位置感：我在第几天、下一步谁排的 vs 业务重点：今天能吃什么），并列会打架，串行才成立。
  改 SPEC 时把理由写进去，避免下一个人又改回去。状态卡出口按钮排的**主按钮进当前阶段核心页、副按钮开疾病概要**。
- **L43 · primer 模式件版本漂移别批量覆盖**：25 个仓里 23 个的 `primer.js` 比 starter 落后，但差距往往就是
  `s.entry`（官方入口页）那 10 行，而这些仓既没有同源检查闸、数据里也没用到 `entry` —— 批量覆盖只是制造 churn。
  正确顺序：先 grep 该仓 `scripts/build-primer-data.mjs` 有没有把「模式件与源一致」写进 `npm run check`；
  有闸的仓才必须同步（否则 check 恒红），没闸的仓等它下次动 primer 时顺手带上。

## 2026-10-27 · 从小肺宝临床试验模块（0.1.2-rc.19）回收：分数怎么才不骗人

用户对 G2 demo 的原话是「好多了，按照这个开发」，交付后又补了一句「临床查询做的特别好」。
真正值钱的不是夸，是这中间实测暴露的四个缺陷——它们都**不报错、不崩、看起来很正常**，只是悄悄把结论说错。

- **L44 · 跨侧比较的字符串必须来自同一份词表**：档案侧写 `'晚期转移'`、登记侧写 `'晚期/转移'`，
  于是 `facts.scope === '晚期转移'` 恒为 false，每一类都落到「待确认」。症状极具欺骗性：分数偏低、
  待确认项多到像用户资料不全，但代码一个字都没报错。规矩：跨侧比较不许两边各写一份中文字面量，
  提到常量表（或先 `normalize` 再比）；写完立刻用「两边答案都已知」的样本跑一遍，确认能出 `met` 而不是清一色 `unknown`。
- **L45 · 反向条件不显式反转，就把阳性档案判成「对得上」**：登记标题写 `EGFR Wildtype`，原实现只要见到 `EGFR`
  就给 `met`，`EGFR L858R` 被判「位点对得上」——方向正好反了，而这类误判最容易被当成「匹配上了」。
  规矩：抽条件前先判极性，`wildtype｜野生型｜未突变｜阴性｜negative` 出现时，语义是「不得有该变异」。
  可断言的测试：同一份阳性档案，对「EGFR 突变入组」与「EGFR 野生型入组」两条登记，必须一案 `met` 一案 `unmet`。
- **L46 · 「一条判据对上」不能变成 100%**：快照读不出疾病范围时分母只剩病理一条，`1/1 = 100%`，用户看到的是
  「完全符合」。三条守则：`crit.length < 2` 不给百分数（只给「需补充信息」）；病理未确认时整页不排名；
  读不出的字段记「待确认」，不要为了凑分母把「不适用」算成「符合」。检查法：只有病理记录的档案
  + 标题读不出场景的登记，断言页面**不出现任何百分数**。
- **L47 · 断言整棵虚拟 DOM 的文本会连 `<style>` 一起匹配**：`textOfTree(tree)` 把样式文本也拼了进来，
  CSS 里有 `width:100%`，于是 `assert.doesNotMatch(text, /\d+%/)` 永远失败，而页面其实没有百分数。
  反方向同样成立：`assert.match` 可能因为 CSS 里恰好有同名字符串而**假通过**。规矩：比对页面文案前先按类名过滤节点
  （`flatten(tree).filter(n => /wb-trial-card/.test(n.props?.className))`），或让 `textOfTree` 跳过 `style` / `script`。
- **L48 · 假 React 测试不执行 effect：写在 effect 里的逻辑等于零覆盖**：自建假 React 只跑 render，
  `useEffect` 只登记不执行。好处是 effect 里可引用后面才 `const` 定义的函数（真实执行在 render 之后，TDZ 已过），
  坏处是 effect 里的判定（请求去重 key、`Esc` 关浮窗、焦点回收）一条都没被测到。规矩：把 effect 的业务判定抽成
  纯函数（`trialRequestKey(caseFile, hist)`）单独测，effect 只留接线。另：hook 顺序按索引钉死，插一个新 `useState`
  会让后面全部平移——改完先 `grep -c "React.useState"` 数实际个数，再同步 `HOOK` 映射与 `hookCount`。
- **L49 · 原型增量生成脚本必须断言「唯一命中」并核对 base64 段数**：从冻结基线生成新原型靠字符串替换，
  某段出现两次就会换错位置；整段水印 `data:image/png;base64` 会在大段替换中被连带删掉 296 KB。
  规矩：每个 replace 后 `assert s.count(old) == 1`，改完核对 `data:image` 出现次数不变、文件大小变化量在预期内；
  **生成脚本本身要入仓**——本轮它差点漏提交，就因为没人看未跟踪文件列表。
- **L50 · 发布资产回验用 `gh release download`，不要 `curl` 直连**：`curl -sL .../releases/download/...`
  在本机代理环境下拿到的是 9 字节 `Not Found`，sha256 自然不符，会被误判成「资产损坏」。
  规矩：`gh release download <tag> -D <tmp>` 再 `shasum -a 256`，与本地包逐字节比。

## 2026-11-04 · 从小宁宝 TTP 工作台（ttp-workbench v0.2.1 装机迭代）回收：三处「不报错、只坏一半」

一轮无人值守夜班跑完 M0–M9，装机闸口抓到三个**检查链全绿但装机即坏**的坑，全部可断言化：

- **L51 · 生成代码里的注入令牌禁止挂在 `window` 上**：`migrate-public` 生成 `window.__API_BASE__`，
  宿主把令牌替换成挂载前缀后变成 `window./api/ttp` → 业务帧**整帧脚本语法错误**，界面只剩外壳、
  主区空白，且 harness.log 没有任何指向本包的报错行（四个激活失败全是别的仓）。独立启动 API_BASE=''
  时同样看不出。规矩：令牌只以字符串字面量 `"__API_BASE__"` 形态出现在生成物里；断言器
  `check-public-tokens.mjs`（ttp 仓首例）扫 `window.__API_BASE__` / `window.__VERSION*`。
- **L52 · 双形态字段名必须同源取自一行代码**：fetch 脚本 jsonl 写 `sponsor`、SQLite 插入读 `r.sponsors`，
  库内全 null，`check-trial-snapshot` 一口气报 179 处 field mismatch——检查器红得很对，
  但 AML 底本带着同款 bug 存活至今，说明**这条检查没进底本的 check 链**。规矩：采集脚本的
  jsonl 行与 insert 行从同一个变量取值；snapshot 一致性检查进每仓 check 链。
- **L53 · pack 白名单缺目录 = 装机激活四连挂**：`dsh/demo.js` import `../demo/build-demo-data.mjs` 而
  `files` 缺 `demo/`，同一晚 esophageal / gastric / gist / colorectal 四个仓在宿主里集体
  `ERR_MODULE_NOT_FOUND` 激活失败（ATTR 0.2.1 踩过的同款坑，第五、六、七、八次）。
  规矩：dsh 内相对 import 的每个目录都必须出现在 `files`；装机后 `harness.log` 本次运行段
  grep 本包 id 必须 0 报错（`verify-desktop-load` 已脚本化，装机后必跑）。

回流落点：ttp 仓 `scripts/check-public-tokens.mjs`（建议升进 starter templates）；`check-trial-snapshot.mjs`
已在 starter check 链，补「每仓必须含」断言；L53 建议在 `check-conformance` 加「dsh/*.js 相对 import 目录 ⊆ files 白名单」断言（待实施清单）。

## 2026-11-05 · 从小宁宝 TTP 工作台（ttp-workbench v0.2.8 Inspector 轮）回收：三处「界面说了假话」

独立 Inspector 按 A–I 清单审出 16 项失败，其中三类是**界面自述与数据层不一致**，都可断言化：

- **L54 · 界面里的通道终态必须从状态表生成，不许手写**：设置页写「ictrp 两次 FAILED」，而快照
  `source_statuses` 实为 `SUCCESS ×3 + NO_RESULTS ×3`、0 FAILED——用户看到的是「外部服务坏了」，
  实际是「查过、没有命中」。规矩：任何「哪个通道成功/失败/无结果」的文案必须由
  `SELECT source_id, state, COUNT(*) FROM source_statuses GROUP BY 1,2` 的结果渲染（或构建期生成常量），
  禁止在 UI 文案里凭记忆写 FAILED/成功次数。检查法：设置页文案与 sqlite 查询结果逐来源对账。
- **L55 · 检索关键词的医学缩写歧义会直接把无关试验推给患者**：`\bTTP\b` 同时命中
  「thrombotic thrombocytopenic purpura」与「transversus thoracic plane (TTP) block」——检索页第一条
  推的是乳腺手术麻醉研究。规矩：病种快照过滤只认**全称/病名/罕见病目录名**（如
  thrombotic thrombocytopenic purpura、血栓性血小板减少性紫癜、Upshaw-Schulman），缩写只在标题同时
  含病名语境时才算；生成脚本把筛选口径写进文件头注释，并保留「全部载入 N 条」的卡头口径。
- **L56 · 掩码方向与文案必须同源，表单草稿跨 tab 不得丢**：Token 掩码显示 `sk-8f2c****`（露前缀）却写
  「只显示后 4 位」；且切换设置 tab 后已输入的 Token 草稿被清空。规矩：掩码由真实值派生（`****` + 末 4 位），
  文案与实现同一处生成；设置页 tab 切换只换内容区，表单草稿存 state（或切 tab 前落草稿），不许重建整个表单。

回流落点：ttp 仓 `scripts/check-trial-matching.mjs` 增加试验线触发与扫描面（prototypes 也扫）、
`scripts/build-trial-demo-data.mjs` 的严格筛选口径与文件头声明；L54 的「UI 文案 ↔ 状态表」对账断言
列入检查器待实施清单（当前靠 Inspector C4/E10 人工对账）。

## 2026-11-05 · 从小弓宝大动脉炎工作台（takayasu-workbench v0.2.0 首夜 M0–M6）回收：parity 与探针四课

- **L57 · 手写 demo 数据的可选键 null 两态并存，parity 必须走 canonical JSON**：demo-data.js 里
  同一结构有的行写 note: null、有的行直接省键——读模型固定键集输出后逐字节比对必炸。
  规矩：parity 测试用 canonical（递归删 null/undefined 键）比对 + 读模型输出固定键集；
  「形状一致」以语义等价定义，写进测试头注释。检查法：test/demo-parity.test.mjs（takayasu 仓可抄）。
- **L58 · profile 指标数组顺序 = metric_def ord**：readBootstrap 按 def 顺序聚合、demo 手写顺序
  随意 → 数组顺序逐字节不一致。规矩：唯一源 demo-data.js 的 metrics 数组按 metric_def 顺序写；
  readBootstrap 跳过零点数组。来源：takayasu demo-parity 三轮返工。
- **L59 · 事实列命名要预判判读词钝正则**：diagnosis_date（确诊日期，事实）撞上 /diagnosis/i
  判读列断言。规矩：日期/原文类事实列命名避开判读词根（diagnosis/risk/severity/grade/verdict…），
  确诊日期用 first_confirmed_date。检查法已模板化：templates/check-schema.mjs（判读列 0 命中 +
  freeze-contract sha256 同源），首夜即断言。
- **L60 · 视口锁定 + scroll-behavior:smooth 让程序化滚动异步化**：#main smooth 滚动下
  scrollTop = 140 赋值立刻读回是 0，A5「滚动恢复」假红。规矩：探针滚动用
  scrollTo({top, behavior:'instant'}) 或等待 ≥250ms；同族教训——异步 history.back() 会污染
  后续 history.length 断言，history 类验收用「hash+state 进出」行为学证明或 fresh goto 隔离。

回流落点：starter templates/check-schema.mjs（L59 检查器模板化，首例来自 takayasu）；
demo-shape 0002 迁移模式（冻结后 ALTER TABLE ADD COLUMN 可空补列）写入 14 号数据合同待办。
- **L61 · 残留检查器自扫自爆**：check-derivative-leftovers.mjs 的词表、doc 示例与自测脏样本
  （小莲宝/CerviPal 字样）会被它自己的 SCAN_DIRS 扫到，新项目首夜 check 必假红 37+ 处。
  规矩：scanProject 自排除 `resolve(f) === fileURLToPath(import.meta.url)`；错误来源 aatd-workbench
  2026-11-05 首夜（M0 起 EXIT 读取被管道截断掩盖了三天假红）。检查法：starter scripts/ 与
  project-template/scripts/ 双份都已修，`node scripts/check-derivative-leftovers.mjs .` 应 0 命中。
- **L62 · 事件委托分支与 data-* 缺一对，点击静默无效**：按钮只写 data-range 不写
  data-action，委托处理器 `closest('[data-action]')` 永远不命中，UI 不报错但功能死的。
  规矩：新增委托动作时 data-action 与取值属性成对出现；探针必须「真点击后断言 DOM 变化」
  而不是查控件存在（aatd C8 探针先红后修的真实案例）。
- **L63 · 窄时间窗空序列把 render 炸断，UI 静默不更新**：lastPos 对 pts=[] 取
  `last.x` 抛 TypeError → render 中断 → innerHTML 不替换 → 界面停留在旧状态，无任何报错。
  规矩：读模型/视图层对「窗口内 0 点」显式分支（跳过该序列或整图空态），空态必须带下一步按钮。
- **L64 · 私密改写链口径**：私密记录被更正为公开后，旧私密原文仍不得出现在看板/导出/AI
  三出口。过滤函数按 corrected_by 链溯源：链上任一版本 is_private=1，则该链旧原文一律不出口；
  最新公开版本可出口。演示数据要有「旧私密→新公开」改写链示例供断言（aatd 独立评审 P1④）。
- **L65 · 探针操作 render 后的 DOM 必须重查节点**：innerHTML 替换后旧引用是脱节点，
  对它 click() 不会冒泡到 document 委托器，动作静默无效且探针会误报「功能失效」。
  规矩：每次 render 后重新 querySelector 再交互；探针内连续两步操作同一容器时尤其注意。

## 2026-11-05 · 从小宁宝 v0.2.9 回收：路由与装机验证的两处「归属错误」

- **L57 · UI 路由禁止写死字面量，必须从 API_PREFIX 派生——否则多仓互撞**：takayasu-workbench（大动脉炎）
  从 ttp-workbench 复制模板后，`dsh/index.js` 仍写死 `path: '/ttp'`（客户端 iframe 却加载 `/takayasu/`）：
  ① 与 ttp-workbench 的 `/ttp` 相撞 → 宿主 `duplicate prefix route`，一个插件激活失败；
  ② 即使不撞，客户端请求自己的路由也 404（SPA 兜底把 index.html 当 JS）。
  规矩：`path: '/' + API_PREFIX`；断言器 `templates/check-route-prefix.mjs`（API_PREFIX ↔ 包名 slug ↔
  客户端 UI_ENTRY ↔ dsh 注册路由 四者同源，禁写死前缀字面量）进每仓 check 链。
- **L58 · 「本次运行有 N 个插件失败」不等于「本包失败」**：装机校验脚本只按 `did not activate`
  一刀切时，profile 里 4 个兄弟仓缺 `demo/` 打包的失败会把本包判成激活失败（2026-11-05 实测，
  `verify-desktop-load` 直接给出 ✗ 结论）。规矩：按包名/插件 id 归属失败行；只有别人的失败 → 警告并列出 id；
  只有不带包名的计数行 → 按失败处理（保守），不许放行成通过。
  `templates/verify-desktop-load.mjs` 已按此规则更新（归属正则同时认 `(pkg): failed to import` 与
  `id-main: Error`，并过滤 `web-server`/`llm-*` 这类非插件错误）。
- **L66 · 升版重装必须先 remove 旧 tgz**：Desktop profile 的依赖是
  `file:…/<包名>-<旧版>.tgz`，重打包删了旧文件后直接 `pnpm add` 新 tgz 会报
  ENOENT（pnpm 先按旧 file: 引用校验）。规矩：`pnpm remove <pkg>` → `pnpm add -w <新tgz>`。
  错误来源：aatd-workbench 0.6.0 重装实测。
- **L67 · 迁移加可空列，`SELECT *` 的 deepStrictEqual parity 立刻红**：bootstrap 用
  `SELECT *`，新列（值为 NULL）会出现在读模型行里，而唯一源 demo-data 的旧行没有这些键。
  规矩：迁移加列时同一提交里给唯一源补同名字段（值可为 null），并把 migrate 测试的
  `executed` 断言更新到新账本。错误来源：aatd 0002 visits.hospital。
- **L68 · 检查器词表也会误伤注释**：T2 类「命名禁词」与 eligible 不同，最初直接扫原文，
  doc 注释里写「不设 suitability 字段」即假红。规矩：与 eligible 的「只认结构形态」同思路，
  扫前 stripComments；自测加「注释提及不算命名」回归例。错误来源：aatd 实测误报 + 修复。
- **L69 · 批处理脚本用相对路径 + 持久 shell cwd 漂移 = 补丁打到别的副本**：同仓两份
  同名文件（templates/ 与 scripts/）时，`python3 - <<EOF` 里的相对路径按当前 cwd 解析，
  上一条命令的 `cd` 会让补丁落错文件还不报错。规矩：Agent 批处理一律绝对路径或先显式
  `cd` 并在同一条命令里完成；改完 diff 校验两份副本一致。

## 2026-11-06 · 从软骨发育不全小苗宝 GrowPal（achondroplasia-workbench v0.2.0）回收

### L61 · 演示数据的业务 id 在**档案内**唯一，不是全库唯一

demo-data 里 documents/candidates/surgeries 的 id（doc1/c1/s1）在两个演示档案里重复出现
（A、B 档案都有自己的 doc1）。schema 若把它们当全库主键（INTEGER 或 TEXT PK），
播种第二步就撞 UNIQUE / datatype mismatch（`test/demo-parity.test.mjs` 当场抓到）。
修法：表用代理主键 `id INTEGER` + 业务列 `doc_id/cand_id/surg_id TEXT`（`UNIQUE(profile_key, 业务id)`），
读模型对外形状还原业务 id。0 修正两次 schema 才落对——**先数一遍演示数据的 id 语义再写 PK**。

### L62 · 数据层的可变绑定：`const DATA` 会让 api 态静默退回演示态

原型与开发版共用的渲染代码里，`loadBootstrap()` 成功后 `DATA = data`。
`DATA` 若是 `const`，赋值抛 TypeError，被 loadBootstrap 的 catch 吞掉返回 'demo'——
界面不报错、横幅写「离线演示数据」，看起来像"没连上服务"，实际是代码 bug。
修法：`let DATA`；且 loadBootstrap 的 catch 里 console.warn 真实错误（别静默）。
浏览器双形态实测（dev-server /ui/ vs file://）是唯一能抓住它的闸口。

### L63 · 检查器的正则要先剥注释（L28 的延伸，已模板化）

`check-host-contract.mjs` 的 customFrame 正则不剥注释时：
build 头注释「面板 customFrame=true · 业务 left 0.65」被当成代码值，报
"不是 true/false 字面量：true · 业务 left 0.65"。本次已在
`templates/check-host-contract.mjs` 落 `stripLineComments` 修复并随 init 下发。
**通用规则：任何"从源码里抠值"的断言，先剥 `//`、`*`、`/*` 行再匹配。**

### L64 · `overflow:hidden` 在 3D 翻转内层会把 preserve-3d 拍平（镜像前脸，探针却不红）

指标卡 `.mcard-inner` 上为了裁圆角加了 `overflow:hidden`——它是分组属性，
强制 `transform-style` 按平坦处理：180° 后浏览器画的是**前脸的镜像**（背面元素都在、
computed style 全对：backface-visibility:hidden、preserve-3d、matrix3d(-1,...)），
肉眼看到"翻过去了但内容是反的"。探针只断言 transform 字符串与 aria-pressed，抓不到。
**出处**：2026-11-06 小苗宝 GrowPal 看板对齐轮，重摄截图时肉眼发现。
**修法**：内层不加 overflow（圆角由 `.mface` 双面各自的 border-radius 承担）；
检查器加固方向：对翻转后的卡截图/像素采样，或断言 `.mcard-inner` 无分组属性
（overflow/clip-path/filter/mask 均会拍平）——见 templates 待实施清单。

### L65 · 用默认参数「重置状态」的弹窗：`openSettings(tab = 'ws')` 每次无参调用都把 tab 拍回首页

设置三 Tab（C1：切换互不丢状态）改用模块级 `cfgState` 后，把无参调用写成了
`openSettings(tab = 'ws')`——`case 'cfg-tab'` 里 `openSettings()` 一调，默认参数又把
tab 拍回「工作区」，勾选看似丢失。computed style 与 DOM 都"对"，纯逻辑回归。
**出处**：2026-11-06 小苗宝 GrowPal AI 按钮/设置轮，浏览器实测抓到。
**修法**：默认参数用 `null`（=保持现状态），只有显式传参才切换；
tab 切换时同步 `cfgState.tab` 再重渲。**规则：有状态容器的弹窗，无参调用语义必须是"保持"，不是"重置"。**
- **L70 · 检查器跑在参考页上 ≠ 跑在你的页面上**：probe-disease-primer 10/10 全绿，
  但它打的是 starter 的 examples/disease-primer.html 参考实现——项目原型里 ? 按钮
  从未接线（dpOpen 无任何调用方），面板模块写了却永远打不开，闸口看不见。
  规矩：每个 P/A/X 组探针除了参考页，必须至少一条「在项目原型上点真按钮」的断言
  （aatd 已把 primer 接线断言固化进 probe-m2-extra 的 P-home 条目）。
  错误来源：aatd-workbench 2026-11-07 用户实测「? 打不开」。

### L66 · 越级相对路径（`../assets/...`）在装机态必 404：UI 挂在 `/api/<slug>/ui/`

小宁宝（ttp-workbench 0.2.9）用户实拍：装机后顶栏「?」与状态卡「疾病概要」两处点击无效。
根因不是点击逻辑：`primer.js` 用 `../assets/patterns/disease-primer.js`（原型 `../../assets/...`）引用，
装机态 UI 由 `/api/ttp/ui/` 提供，`../` 解析成 `/api/ttp/assets/...` → 静态层不服务 → 脚本 404 →
`window.DiseasePrimer` 未定义 → 所有 primer 入口哑掉（页面无报错，纯静默）。
**修法**：primer.css/primer.js（及一切共享资源）**同目录化**——原型目录与 public/ 各放一份、
引用写 `primer.css`，file:// 与 /ui/ 两种形态同一路径（aml/小苗宝同款）。
**可断言**：`check-static-refs.mjs` 增加规则——本地引用不得含 `..` 段（0.2.10 起 ttp 已进链，模板同步）。

### L67 · 聚合数字也是隐私出口：sharedOnly 必须喂进派生计算源，不能只过滤明细列表

**现象**：明细列表（最近报告、化验表）都走了 sharedOnly，但「近 90 天发作 N 次 / 当前状态 /
起始日期」这类聚合与派生数字直接用了未过滤数组——私密发作的时间与次数从状态卡、导出预览、
AI 上下文三处泄漏。探针全绿（demo 数据里没有私密发作，路径没被触发）。
**出处**：2026-11-07 复发性心包炎工作台首夜，独立 Inspector 静态审查抓到（探针未覆盖）。
**修法**：派生函数（derivedStatus 等）一律以 sharedOnly(原始数组) 为输入；页内标注「私密 N 条未计入」。
**检查器方向**：探针 demo 数据固定含 1 条私密事件，断言聚合数字与共享计数一致、页面含「未计入」
标注（pericarditis-workbench probe-pericarditis-m2.mjs 的 Q35c 可直接模板化）。

### L68 · 整页视图关闭后焦点回不到触发元素：history 导航会重置焦点 + 重渲染会拆掉触发元素

**现象**：applyPvClose 里同步 trigger.focus() 无效——history.back() 之后浏览器把焦点重置回 body；
且关闭触发 hashchange → 全页重渲染，原触发元素已脱离 DOM（isConnected=false，focus() 无声失效）。
**出处**：2026-11-07 复发性心包炎工作台首夜，probe-page-view A4b 实测。
**修法**：① 关闭时按 data-open 特征重定位触发元素再 focus；② 导航落定后（≈60–250ms）补一次 focus；
③ 探针在读焦点前等稳态（pericarditis 仓 probe-page-view A4b 加了 250ms settle，判据未弱化）。

### L69 · 一图秀只拼 svg 子元素、忘包 `<svg class="chart">` 根：页面「看着有内容」，fill=none 探针全空

**现象**：chartPanel 的字符串拼了 rect/path/text 但没有 `<svg>` 根标签，浏览器把子元素当未知标签
丢弃；IP2 非空断言仍绿（页面文字多），只有 C1a 的 path 断言红。
**出处**：2026-11-07 复发性心包炎工作台首夜。
**规则**：任何手写 SVG 的渲染函数，第一行开根标签、最后一行闭根标签；探针必须先断言 path 数 > 0。

### L70 · 窄宽断点里 `grid-template-columns: 1fr`（无 minmax(0,1fr)）是 390 横向溢出的头号根因

**现象**：900 断点把 workspace 改单列用了 `1fr`，grid item 的 min-width:auto 被 673px 的导航撑破，
documentElement.scrollWidth=701；逐元素排查时溢出源在 grid 容器不在内容。
**出处**：2026-11-07 复发性心包炎工作台首夜（30 号规则第二次实锤）。
**修法**：所有断点改列的 grid 一律 `minmax(0, 1fr)`；flex 侧栏加 `min-width: 0`。

### L71 · check-probe-coverage 的 ROUTES 对象式解析要求值必须是 `pageXxx` 函数名

**现象**：顶层 `const ROUTES = { 'dash': true, ... }` 正则能匹配但 0 条路由被解析（值不匹配
`page[A-Za-z0-9]+`），报「找不到 ROUTES」。检查器故意只认 page 函数值，防把其它字面量当路由。
**出处**：2026-11-07 复发性心包炎工作台首夜。
**修法**：渲染函数挂 window 后按名引用（`'dash': pageDash`）；模板项目第一天就要这样写，不是检查器 bug。

### 待实施⑧（下轮进检查器）

- `probe-m2-aggregate-privacy.mjs`（模板化 pericarditis Q35c）：demo 数据固定含 ≥1 条私密事件 +
  ≥1 条私密发作，断言：状态卡聚合数 == 共享计数、导出预览与 AI prompt 不含私密原文、页含「未计入」。
- `check-ui-parity.mjs` 上收为家族模板（pericarditis-workbench 已实现：public 与 prototypes 同名文件
  逐字符 diff + 白名单替换点还原断言），进 ZERO-TO-DEV 交付清单挂钩。
- probe-page-view 契约的「触发元素重定位 + 焦点 settle」写进 32 号文档附录。

### L72 · 构建注入的布尔常量要「裸占位直注」，检查器捕获要 trim 尾分号

**现象**：mds-workbench 首夜，`build-client.mjs` 注入后生成物里是
`const CUSTOM_FRAME = 'true' === 'true'`（表达式形态，检查器判"非常量字面量"）；
改成裸占位后捕获又带出 `true;`（行尾分号被 `[^,}\n]+` 一起吃掉）。
**出处**：2026-11-07 骨髓增生异常综合征（MDS）工作台首夜（L28 的续集）。
**修法**：src 里写 `const X = __X__;`（不加引号），构建注入纯字面量 `true/false`；
检查器提取后 `.replace(/;+$/, '')` 再判。mds-workbench 的 scripts/check-host-contract.mjs
已带 trim，可上收进模板。

### L73 · 生成器写演示 sqlite 必须先删后建

**现象**：`demo/build-demo-data.mjs` 第二次运行报 `table profiles already exists`——
`DatabaseSync` 打开已存在文件后再跑一遍 `CREATE TABLE` 直接炸。
**出处**：2026-11-07 MDS 工作台首夜。
**修法**：写库前 `rmSync(path, { force: true })`；sqlite 产物永远全量重建，不做增量。

### L74 · check-version 的 FROZEN_PROTOTYPE 是「每仓自己的原型签认版本」

**现象**：模板默认 `0.1.0`，MDS 原型签认在 v0.2.0，8 处版本核对全红在快照。
**出处**：2026-11-07 MDS 工作台首夜。
**修法**：init 之后第一步就把 FROZEN_PROTOTYPE 改成本仓原型实际签认版本；
它是「快照冻结点」不是通则常量。

### L75 · probe-disease-primer 不带 --url 打的是 examples 参考页（假绿）

**现象**：探针 10/10 全绿，但页面是脚手架的 `examples/disease-primer.html`，
本仓原型 primer 是否真实现完全没被测到（无 #disease-primer、无 DP 模块也绿）。
用户在任务里实指过一次的坑，模板化成本条。
**出处**：2026-11-07 MDS 工作台首夜（用户预警 + scripts/probe-disease-primer.mjs L91 默认值）。
**修法**：验收命令固定写 `--url http://127.0.0.1:<port>/prototypes/v0.2/index.html`；
check-probe-coverage 可追加断言：探针文件里必须出现 `prototypes/v0.2` 字样。

### 待实施⑨（下轮进检查器，来自 MDS 首夜）

- check-host-contract 上收「裸布尔直注 + 尾分号 trim」规则（mds-workbench 副本已验证）。
- check-probe-coverage 追加：全量探针文件必须包含 `prototypes/v0.2` 路径字样（防探针打空气）。
- `check-primer-links` 现只查 prototypes/*/primer-data.js；M5 后应同时查 `public/primer-data.js`
  与原型逐字符（ui-parity 已测，双保险可并入）。

### 待实施⑩（下轮进检查器，来自 GCA 首夜）

- check-trial-snapshot 反向断言：存在 research/<slug>/manifest.json 时，package.json 的 check 链不得含 `--if-present`（L117）。
- check-trial-snapshot 正向断言：sqlite 必含 `source_statuses(query, source_id, state)` 表且 `manifest.sourceStatusRows` 一致（L116；新版 fetch 模板已闭环，旧仓可补）。
- 机械移植锚点断言：成对禁词 grep=0 且事件通道 `grep -o "[a-z]*:agent-draft" | uniq -c` 恰为 1（L118，check-derivative-leftovers 或新 checker 收编）。

### L76 · 陈旧端口服务别的仓副本（探针绿在别人的页面上）

**现象**：egid 夜班对 8151 端口跑 primer 探针 10/10「全绿」，随后发现 8151 是上一夜遗留的
http-server，服务的是 pericarditis 装机副本——绿的是别人的页面。同夜还叠加 L75（默认 URL 打 examples）。
**出处**：2026-11-08 egid-workbench 首夜。
**修法**：①起服务的命令与探针 --url 必须同一条 shell 里写死同一端口；②探针已加身份防呆
banner（无 --url 打参考页时醒目提醒，probe-disease-primer/probe-page-view 两处）；
③汇报「探针通过」必须带实际 --url，机审不了的写明目标 URL；④长期解法（待实施）：
探针启动时输出 `TARGET: <url>` 并在报告汇总行回显，防复制粘贴错行。

### L77 · 私密过滤函数返回类型分叉 = P0 泄露温床

**现象**：filterPrivate 带 `withNote` 时返回字符串、不带时返回对象。看板「最近一条」直接取
`slice(-1)[0]` 不走过滤 → 「改为私密」后回看板即泄露私密正文（短肠综合征首夜独立评审 P0-1）。
**出处**：2026-11-08 short-bowel-workbench 首夜（评审 docs/PROTOTYPE-REVIEW.md P0-1）。
**修法**：三出口过滤函数签名固定返回 `{kept, note}`，禁止按调用点分叉返回类型；
回归断言：「看板 textContent 不得含私密记录正文子串」进探针（short-bowel probe Q35-看板私密）。

### L78 · public/ 不是覆盖目标：从原型直拷 app.js 会炸掉整条开发版链路

**现象**：M5 移植完成后，主线把 prototypes/v0.2/app.js 直接 cp 到 public/app.js「同步版本号」，
结果 apiBase 契约、agent-draft postMessage、MinerU 六部件全部消失，8 个用例红。
**出处**：2026-11-08 short-bowel-workbench 首夜。
**修法**：public/app.js 的全部差异必须住在 `DEV-BRIDGE-BEGIN/END` 注释对里（ui-parity 测试
逐字节保护其余 6 文件）；同步原型改动用补丁不是覆盖。ui-parity 测试本身就是这个坑的检查器。

### L79 · primer 唯一源放 demo-data 里过不了审计

**现象**：primer-data.js 委托 `window.DEMO.primer` 单行；audit 要求四段 id
（definition/evidence/landscape/trend）可静态解析 → 1 失败 + 1 待人工。
**出处**：2026-11-08 short-bowel-workbench 首夜。
**修法**：疾病概要内容唯一源直接放 primer-data.js（自持四段 + landscape 用 points 数组
承载固定出口句）；demo-data 不复制。模板已回写 starter（见 templates/primer-data 模式）。

### L80 · 升版必须一次走完十处同源，半途状态会连环红

**现象**：VERSION 单独 bump 到 0.2.1 → check-version-literal 4 处红、audit version/pkg 红。
**出处**：2026-11-08 short-bowel-workbench 首夜。
**修法**：升版固定顺序：VERSION → npm run build:version → npm run build:client →
public/index.html 与原型 index.html（两份逐字）→ public/app.js 回退值 → 原型 APP_INFO/demo
标签 → README 徽章 → CHANGELOG → 截图改名重拍 → check-version-literal 收口。

### L81 · 「?」按钮在 ≠ DP 模块在：家族探针合同必须逐字对齐

**现象**：原型顶栏有 `data-primer-open`、点击也能开一个自造的 `.primer-overlay` 面板——但家族
探针 probe-disease-primer.mjs 的合同是 `.dp-overlay#disease-primer` + `.dp-panel` +
`.dp-section[data-dp-section]` + `[data-dp="back"]`/`[data-dp="close"]` + `[hidden]` 语义 +
window.DISEASE_PRIMER 的 brand/name/sections[{id,title,intro,points,groups,table,sources}]。
自造面板打家族探针 = 9/10 全挂 P1–P9。此前家族两夜「探针跑的是 examples 参考页不是原型」
掩盖了这类合同漂移（L75/L76）。
**出处**：2026-11-08 short-bowel-workbench（用户晨审点名复核「首页病情介绍与 ? 号」）。
**修法**：①原型直接复制 starter `assets/patterns/disease-primer.{js,css}` 为 primer.js/primer.css，
不自己实现浮层；②primer-data 按 DP 数据合同重写（sources 带 https 深链，禁域名首页——
L1/L3 会拦 clinicaltrials.gov/ 这种裸域名）；③验收必须「双探针」：仓内探针（断言面板真开、
四段非空）+ 家族探针 `--url http://127.0.0.1:<port>/prototypes/v0.2/index.html` 显式指本仓，
汇报必须带实际 URL；④短肠仓探针新增 L81-DP模块挂载 断言（DOM 级 .dp-overlay#disease-primer
+ 数据四段 id 逐字），回归 `scripts/probe-prototype.mjs`。

### L70 · 脚手架生成的探针覆盖检查器把全量探针名写死成上一仓的名字（`probe-aml-m2.mjs`）

- **来源**：2026-11-08 夜班 thymic-workbench（胸腺癌小橡宝）首夜，M2 起跑 `check-probe-coverage` 直接红：`全量探针 scripts/probe-aml-m2.mjs 不存在`。
- **现场**：starter 生成的 `scripts/check-probe-coverage.mjs` 里 `ALL_ROUTE_PROBES = ['scripts/probe-aml-m2.mjs']` 是模板残名；新病种仓必须 ①改成本仓名 ②真的写这份探针。删掉检查器"让它别响"等于把孤儿页保护拆了。
- **修法**：探针默认目标=**本仓原型**（`prototypes/v0.2/index.html`，不得回退 starter examples——L81 同款教训）；探针内嵌 `COVERED` 叶子清单并与 app.js `ROUTES` 逐项比对（新增路由漏改探针 → R0 直接红）；`--self-test` 注入空页证明探针能 FAIL。参照实现：thymic `scripts/probe-thymic-m2.mjs`（35 叶子 15 断言 + self-test 反向）。

### L71 · 构建注入布尔参数带引号会骗过宿主合同检查（`'__X__' === 'true'`）

- **来源**：2026-11-08 夜班 thymic-workbench M5，`check-host-contract` 报 `customFrame 不是 true/false 字面量：'true' === 'true'`。
- **现场**：`build-client.mjs` 用 `String(...)` 注入 + 模板写 `const CUSTOM_FRAME = '__CUSTOM_FRAME__' === 'true'`，运行时语义没错，但**检查器读的是源码字面量**——字符串比较表达式在它的判据里不是 boolean。
- **修法**：布尔占位符直注布尔字面量：占位符表 `__CUSTOM_FRAME__: PANEL.customFrame === true`，模板 `const CUSTOM_FRAME = __CUSTOM_FRAME__`。判据类检查器看源码不跑运行时，生成物必须让"看"与"跑"同真。

### L72 · 临床库四件套必须按 `check-trial-snapshot` 的家族合同出，别自造 manifest 形状

- **来源**：2026-11-08 夜班 thymic-workbench M4，自造 manifest 两轮返工后才对齐。
- **现场**：家族快照合同是：manifest={files:{<jsonl/sqlite>:sha256+bytes}, recordCount, dbCount, sourceStatusRows}；JSONL 行键 recordId/mergedSources/sponsor(键名单数)/registryNumbers/dates…；SQLite 表名 `trials`（列 merged_sources/sponsors/registry_numbers/dates…）+ `source_statuses(query,source_id,state)`。
- **修法**：新仓 fetch 脚本第一步先 `sed -n '8,15p' scripts/check-trial-snapshot.mjs` 抄字段表；jsonl↔sqlite 逐字段深度相等由检查器兜底。参照实现：thymic `scripts/fetch-thymic-trials-2026.mjs`（53 条 CT.gov，PASS）。

### L73 · 夜间 `/claim` 机器人可能不在线：限时等待→按权限自查补标签→留痕待追认

- **来源**：2026-11-08 夜班 thymic-workbench 领取 issue#50，评论 /claim 后 2 分钟无回执（对照同夜其他 issue 亦无）。
- **修法**：等待上限 2 分钟→有 admin 权限则自查补 `claim,claimed` 标签→在 DEV-PLAN 与晨审报告记录时间、原因、补标签动作，表述为"自查补签（待追认）"，不写"维护者已确认"。白天有人在时仍以机器人回执为准。

### L74 · 整页视图焦点回归三件套：显式触发元素 + 多轮补焦 + 探针先滚到再点

- **来源**：2026-11-09 夜班 cold-agglutinin-workbench M2，probe-page-view A4b 两轮假红。
- **现场**：①macOS/无头 Chrome 鼠标点击不聚焦按钮 → `pvState.trigger = document.activeElement` 捕到 body，关闭后「焦点回触发元素」必失败；②mini 图按钮在首屏折叠线下（y>视口高），探针 `mouse.click` 点在空处，`waitForSelector` 传了 `.catch` 静默吞掉，后续断言全在测空气；③Chrome 的 history 导航焦点恢复时点不定（实测 >60ms），单次补焦竞态。
- **修法**：①`openPvLayer(title, html, isDeep, triggerEl)` 显式收触发元素，`closest('button,[role=button],a,input,select,textarea')` 兜底；②`applyPvClose` 补焦改 `[60,200,500,1000].forEach` 多轮重试（判据 `activeElement===body` 才补）；③探针 A4b 先 `scrollIntoView` + `waitForFunction` 等按钮入视口再量坐标点，检查焦点用 `waitForFunction` 轮询落定而非 t=0 抢跑。判据类断言等"落定"不等"时刻"。

### L75 · migrate-public 的版本基准段是第二处版本真源：原型改日期必须两处同改

- **来源**：2026-11-09 夜班 cold-agglutinin-workbench M5，ui-parity 测试「原型缺基准段」红。
- **现场**：`migrate-public.mjs` 的 `FOOT_OLD/APPINFO_OLD` 等常量写死原型当前版本字面量；原型 `index.html` 页脚 build 日期与 `app.js` APP_INFO 不同步时，migrate 生成物与 ui-parity 基准两头红。
- **修法**：版本构建日期改动时同步三处：`prototypes/v0.2/index.html` 页脚、`app.js APP_INFO`、`migrate-public.mjs` 的 `*_OLD` 常量（+ui-parity 测试基准段）。能断言的写进 ui-parity：它已经在断言「原型含基准段」，别删断言，改齐事实。

### L76 · 裁剪试验线也要实跑一次 M4 采集：快照量级是裁剪理由的唯一证据

- **来源**：2026-11-09 夜班 cold-agglutinin-workbench M4。
- **现场**：罕见病种（CAD）候选池小，试验线按 35 号裁剪；若只写「池小」不实跑，裁剪理由不可核验，也不满足「未查或服务失败不能写零结果」。
- **修法**：照常跑 fetch 脚本（四在线通道终态如实入库），在 research/<slug>/README 写「与试验线关系」一节：43 条量级 → 支持裁剪、快照留存备未来版本启用 35 号链路；设置·临床数据库 tab 与 DEV-REQUIREMENTS §三 同口径声明。若实跑结果量级大，改为保留试验线而不是硬裁。

### L82 · 工作台内新建 AI 会话：`newSession(workspaceId)` 才是当前宿主合同，`ensureSession({})` 会「点了没反应」

- **来源**：2026-11-10 小暖宝（cold-agglutinin-workbench）用户点名复核；0.2.1 修复。
- **现场**：customFrame 下宿主即使没有会话也会传一个 `display:none` 的 `conversation` 容器，用 `Boolean(conversation)` 判「已有会话」必然误判；没有会话时又调 `ensureSession({})`，宿主 `ensureSession` 要求 `folder` 为非空字符串，空参数直接 reject——按钮点了既没面板也没报错。2026-11-10 读 io.dsh.desktop 工作台服务源码确认：工作台内创建会话走 `newSession(workspaceId)`；`workspaceId` 缺省时取 `defaultWorkspace()?.workspaceId`，仍没有则走 `newWorkspaceSession → pickDirectory`，用户取消返回 `undefined`，宿主不留目录/工作区/会话/绑定。
- **修法**：①判会话归属仍用 `currentSession()` + `ownsSession()` + `subscribe` 重渲染（L40 既有口径）；②创建走 `service.newSession(service.defaultWorkspace?.()?.workspaceId)`，显式传入；③返回假值 = 用户取消，提示「没有创建会话，可再点重试」，失败在 `note` 写原因；④`creatingRef` 防快速连点/iframe 连发造成双会话；⑤草稿仍只 `setDraft` 不 `submit`。
- **可断言化**：starter `scripts/check-agent-pane-contract.mjs`（rc.29 引入，L82 修正）静态判 7 条：禁 `Boolean(conversation)`、禁 `ensureSession({})`、必须有 `newSession(`/`defaultWorkspace`/订阅钩子/agent-draft 桥、生成物无未替换占位符。占位符判据按「先收集已声明标识符再查剩余」实现——直接搜 `__[A-Z]+__` 会把构建器正常生成的 `const __VERSION__ = ...` 判红（本轮实测假阳性）。
- **仍未自动覆盖**：面板是否真的出现、取消目录后是否留空会话、失败提示是否可见，必须装机后人工走查（V3）；静态检查器只挡反模式，不冒充 UI 验收。

### L83 · 首页第二个「疾病概要」入口关闭后丢焦点：动态节点必须带稳定标识 + 多轮补焦

- **来源**：2026-11-10 cold-agglutinin-workbench P1b 探针首跑失败（secondOpened=true，secondFocusBack=false）。
- **现场**：顶栏 `?` 在 `#main` 外，关闭后 focus 正常；首页文字入口在 `#main` 内，primer 关闭走 `history.back() → hashchange → app.render()`，旧按钮节点被替换，primer.js 对已脱离 DOM 的 `state.trigger` 调 `focus()` 等于没调，焦点掉回 body。
- **修法**：①每个入口加稳定 `data-primer-entry`（顶栏 `top` / 首页 `home`）；②primer.js 关闭时按 key 重定位（旧节点在 DOM 就用旧节点，否则 `querySelector('[data-primer-open][data-primer-entry="…"]')`），并做 `[0,60,200,500]ms` 多轮补焦；③只在 `activeElement` 仍是 body 时接管，避免抢走用户新点的位置；④探针 P1b 必须验「可见入口 ≥2 + 第二个能开四段 + Esc 后焦点回该入口」，不能只验顶栏 P1。
- **可断言化**：cold-agglutinin `scripts/probe-cold-agglutinin-m2.mjs` P1b（双形态 35/35）；starter `assets/patterns/disease-primer.js` 已带重定位实现，`docs/36-DISEASE-PRIMER.md` §4.1b 写明合同。

### L84 · Desktop 真实装机 profile 是 harness/profiles/web,不是 ~/.dsh/profiles/desktop

- **来源**:2026-11-11 bone-cancer-workbench 0.2.0 M6 装机实测(verify-desktop-load.mjs 头部注释 L14)。
- **现场**:本机有两个「profile」——`~/.dsh/profiles/desktop` 属 DeepSeek Harness.app(0 个工作台),真实 DSH Desktop(io.dsh.desktop)加载的是 `~/Library/Application Support/dsh-desktop/harness/profiles/web`(50+ 兄弟工作台,file: tgz 形态依赖 + dsh.profile.bundles 登记)。装错前者后 verify-desktop-load 报「装机目录:未安装」,重启十次也不会加载。
- **判据**:先看目标 profile 的 package.json dependencies 里有没有 `@xyb-community/*` 的 file: 条目;没有的就是错的对象。verify-desktop-load.mjs 的「宿主工作台清单」一行是权威信号。
- **附带坑**:对含 github tarball 依赖的 profile 直接 `pnpm add <tgz>` 会 ERR_PNPM_TARBALL_INTEGRITY(codeload 的 gz 字节不稳定,与你的包无关)。现行可行路径:解包进 `node_modules/@xyb-community/<pkg>/` + package.json 写 `file:<本仓>/release/<tgz>` + bundles 追加,不重写 pnpm-lock(代价:下次全量 `pnpm install` 会剪掉,需重跑本路径)。
- **可断言化**:待实施——probe-profile-target.mjs 断言「目标 profile deps 含 ≥1 个 @xyb-community file: 条目,且 bundles 含本包」;verify-desktop-load 已断言「宿主工作台清单含本包」。

### L84 · 整页视图 A4b 是竞态不是缺陷：探针要等「焦点已回位」事件，不要等固定毫秒

- **来源**：2026-11-11 pemphigus-workbench probe-page-view 首跑 A4b 失败（pericarditis 同代码同天通过）。
- **现场**：app.js 关闭整页视图后有 60ms 补偿定时器做焦点回位（hashchange 重渲染会顶掉第一次 focus）。探针在 `overlay hidden` 后立刻读 activeElement，实测 +50ms 还是 BODY、+120ms 已回位——跟定时器赛跑，结果随机器快慢漂。
- **修法**：探针加 `waitForFunction(() => document.activeElement?.dataset?.open === 'chart', { timeout: 1000 })` 等「焦点已回位」这个真实事件就绪（家族纪律「测试等实际加载与事件就绪」的又一实例）。修的是探针时机，不是 app.js 行为。

### L85 · Desktop profile 的 file: 依赖会随姊妹仓清理而失效：装机前先盘 stale tgz，修复走「同版本重打包」

- **来源**：2026-11-11 pemphigus M6 装机：profiles/web/package.json 51 个 file: 依赖中 24 个指向已被清理/升版的姊妹仓 release/*.tgz，pnpm add 对**未改动的依赖**也重解析 → ENOENT 整次安装失败。
- **修法**：①装机前脚本盘一遍 file: 引用的存在性；②失效项从 Desktop node_modules 已装副本 `npm pack` 出**同版本** tgz（放到本仓 release/rebuilt/，不写姊妹仓），再把 profile 依赖路径改指新位置——零版本升级副作用，Desktop 当前行为不变；③装完跑 check-install.mjs 复核登记。
- **教训**：profile 是机器本机状态，修复它属于装机恢复操作，不是业务变更；但要在签认表里如实记录动了哪些路径。

### L86 · init 生成的检查链是 M0 精简版：probe 探针名硬编码 aml + 缺 M5 脚本，第一晚必踩两坑

- **来源**：2026-11-11 pemphigus M2/M5：check-probe-coverage 硬编码 `probe-aml-m2.mjs` 直接红；check 链缺 build:public/check-ui-parity/check-wording/check-schema-words 等，需从上一仓手工搬 7 个脚本。
- **修法（已回流进 starter）**：①project-template/scripts/check-probe-coverage.mjs 改为按目标仓 slug 自动探测 `probe-<slug>-m2.mjs`（读 package.json name 去 -workbench），回退 aml，两者皆缺报红并给应建文件名；②init.mjs 计划补发 7 个脚本（check-schema-words/check-wording/check-ui-parity/check-public-tokens/migrate-public/build-client/build-version）并把 M0 安全项（schema-words、wording）接入检查链，build 系脚本随包待 M5 使用；③test 脚本统一加 `--disable-warning=ExperimentalWarning --test-concurrency=1`。

### L87 · 静态契约检查器会被「误插的 subscribe」骗过：光有字样不算订阅，要验它落在 Panel 里且在 return 之前

- **来源**：2026-11-11 全家族 AI 面板收敛（第二/三轮）。prostate-workbench 上一轮所谓「已加会话订阅」实际是把三行 subscribe 塞进了 `PrimerPanel` 的 `useEffect`，而且插在 `return () => {...}` **之后**——那段代码永远不执行，还因为引用了未声明的 `setPaneTick`/`setNote` 把 primer 的 pushState/popstate/焦点回收/滚动恢复一起变成死代码。检查器只查「文件里有没有 subscribe 字样」，于是判绿；实机表现是 primer 整页视图深链全坏。
- **同批第二个假绿**：ovarian / lung 的 CHANGELOG 写着「订阅会话变化触发重渲染」，代码里 subscribe 计数为 0；四条里三条根本没有订阅，一条是有害误插。**写着改过不等于改过，字符串出现在源码里不等于被执行。**
- **修法（已回流进 starter 的 check-agent-pane-contract）**：①订阅断言要求 `subscribe` 出现在 Panel 组件体内、且排除掉 `return` 之后的行（简写法：取 Panel 起止区间再判，找不到区间就报红）；②`agent-draft 只填不发` 要求判 `send` 是否被真正传给宿主通道，不看注释；③任何「已修复」的 CHANGELOG 条目必须附 grep 数字（`subscribe=1 ensureSessionCall=0 BooleanConv=0`），复跑检查器 `--self-test` 仍须能红。
- **教训**：检查器越容易满足，越容易变成装饰。反模式检查器的每条断言都要问一遍「怎么用一行无害文本骗过它」，能骗过就加结构条件。

### L88 · 业务界面不一定叫 `public/`：判"装了空白"前先看 `dsh/index.js` 服务的是哪个目录

- **来源**：2026-11-11 装机层全量核验脚本首版，把 `fshd-workbench 0.1.6` 判成「包里没有业务界面」。用户当时正在看这台工作台，界面好好的。
- **现场**：fshd 的 `dsh/index.js` 写的是 `const UI_DIR = join(..., '..', 'assets', 'ui')`，界面在 `assets/ui/{index.html,app.js,primer*}`，包里也确实带着——只是不在 `public/`。同批还有 ovarian(347KB)/lung(864KB) 把界面**内联在 `lib/client.js`**，也没有 `public/`。
- **修法**：判据从「有没有 public 目录」改成「有没有能打开的业务页」，认三种形态：`public/index.html`、任意被服务的静态目录（包内两层内找 `index.html`，跳过 docs/examples/prototypes 等）、内联视图（client.js 体积过百 KB）。检查器同时把「界面在哪」打印出来，人能一眼复核。
- **教训**：目录名是最脆弱的判据。三个仓三种放法，说明"家族约定"只覆盖了多数派；闸门一旦写死路径，少数派会被误判成缺陷，而误判比漏判更贵——它会让人去"修"一个没坏的东西。

### L89 · 模板里的「上一病种」字面量会被 init 原样带进新仓：build-client 模块 id、migrate-public 日志 tag
- 现场（2026-11-12 acquired-hemophilia-workbench）：init 后 `scripts/build-client.mjs` 里 `id: "@xyb-community/pemphigus-workbench"`——新仓打包产物以别人的 id 注册；`migrate-public.mjs` 日志 tag 也是 [pemphigus]。
- 修复：模板不再写死 id（从 package.json 派生）；日志 tag 去病种化；check-derivative-leftovers 词表累积 + 自病种排除（命中词是本仓 name/slug 子串时忽略，否则词表每加一组、对应仓自己必红）。
- 判据：`node scripts/build-client.mjs && grep -c "pemphigus" lib/client.js` = 0。

### L90 · init 骨架与自家检查链不自洽：新仓第一天基线必红（已回流修复）

- **来源**：2026-11-12 cidp-workbench 夜班 M0：dsh-wb-cli rc.37 init 出的 `lib/client.js`（42 行骨架）没有原生 AI 面板会话接线，而 rc.37 把 `check-agent-pane-contract`（要求 newSession/defaultWorkspace/订阅/草稿桥）接进了 init 的 check 链——新仓基线 `npm run check` 必红，M0「基线绿」闸口无法过。
- **修法（已回流进 starter，rc.39）**：`project-template/lib/client.js.tpl` 从 42 行骨架扩为约 320 行**带真实接线**的原生面板骨架（ownedSession 归属判定 / `service.newSession(defaultWorkspace?.()?.workspaceId)` / 订阅触发重渲 / 草稿只填不发 / 取消与失败提示 / 25–45% 可拖 splitter / `@@SLUG@@:agent-draft` 桥），模板化自 cidp-workbench 骨架实现（其静态 7/7+双形态实测）。
- **判据**：fresh init 后 `npm run check` exit 0（夜班实测 /tmp 冒烟仓通过）；检查器 10 条断言里「禁止 Boolean(conversation)」连**注释里的字面量**都会抓——模板注释措辞要用「conversation prop 的真值判断」绕开词面。
- **教训**：给检查链加新断言时，必须同步验「init 的产物能不能过自己的链」——门禁的起点是自家模板。

### L91 · 定点移植的 OLD 常量会静默失配：replace 不命中不报错，ui-parity 双假绿

- **来源**：2026-11-12 cidp-workbench M5 移植：`migrate-public.mjs` 的 `TITLE_OLD` 是上游 pemphigus 时代字面量（「小愈宝 HealPal · 天疱疮工作台」），对本仓原型 `.replace()` **静默 no-op** → public/index.html 保留原型标题；ui-parity 测试因 `expected()` 走同一个 no-op replace 而两侧相等——**两道闸门同时假绿**。同批发现 `APPINFO_OLD` 引号形态（单引号 vs 原型双引号）也不匹配。
- **修法（建议，cidp 已手改常量；模板化待下一轮）**：migrate-public 的每个 OLD 常量在 build 时断言「替换真的发生」——`if (!src.includes(OLD)) problems.push(...)`；替换后 `assert(!out.includes(OLD))`。ui-parity 的 revert 链同理：把 revert 结果与原型 diff，若 revert 没还原出原型原文立即红。
- **教训**：靠 `.replace()` 的定点移植，任何 OLD 写错都是**静默失配**；「expected() 与产物相等」这种自洽断言只证明「没改过字符」，不证明「该改的改了」。凡 replace 类契约，必须有「命中数 = 预期数」断言。

### L92 · perl 单行改码时 `@` 要转义：`s/"@xyb\//...` 会把 @xyb 当数组插值静默吞掉

- **来源**：2026-11-12 cidp-workbench M5：`perl -pi -e 's/id: "@xyb-community\/pemphigus-workbench"/...'` 里 `@xyb` 被 perl 当数组插值（空），pattern 实际变成 `id: "-community/..."`，**匹配不到也不报错**，命令「成功」但没改任何东西。
- **修法**：写 `s/"\@xyb.../` 转义，或改用 python/node 脚本改码；改完必须 grep 验证目标串已变，不靠命令退出码。
- **教训**：单行改码工具的静默失配与 L91 同类——「命令成功」不等于「改动落地」。

### L93 · 「配置目录」做成说明弹窗也能全绿：两个仓同天翻车，说明这不是偶发

- **来源**：2026-11-12 两个新开发仓（acquired-hemophilia / cidp）同一天同一处失手——顶栏「配置目录」点开只有一段话，正文自己写着「本原型为示意，目录未真实挂载」。
- **为什么既有检查抓不到**：语法过、包清单过、面板契约过、文案红线过。它不报错、也不违反任何字符串规则——它只是**不做**。所有"查字符串"的闸门对"假入口"天然失明。
- **修法**：新增 `templates/check-data-dir.mjs` 并随 init 下发、入 `npm run check`。四条判据：①有真实选择动作（`pickDirectory`/`showDirectoryPicker`/`webkitdirectory` 至少一个）②拒绝清单命中 ≥3（主目录/桌面/下载根/tmp）且有判定函数 ③patch 有 `config.root: dshHomePath(...)` 且 dsh 读 `config.root` ④「未真实挂载」这句存在但没有任何选择动作 → 直接红。`--self-test` 内置反例（说明弹窗）必须能红。
- **教训**：**"写了这句提示"不等于"实现了那个功能"**。凡是界面上的入口，闸门要判"动作存在"，不能判"文案存在"。

### L94 · 用推断裁掉整条功能线：两个仓都说「候选池个位数」，实测 30 条，而且包里本来就躺着快照

- **来源**：2026-11-12 同上两仓。裁剪理由三条：候选池个位数、召回不可靠、字段不对齐；前端只剩「裁剪说明页」，后端 `trialMatch` 却还在，包内 `research/*/*_trials_2026.{sqlite,jsonl}` 也在。
- **代价**：用户看到的是"这病没有临床试验线"，实际有 30 条可检索（多数登记研究、非干预试验）；而且"数据在、入口是假的"比"没数据"更糟——它让后续开发以为没东西可做。
- **修法**：新增 `templates/check-trial-chain.mjs` 入链。判据：有快照或有 `trialMatch` → 前端必须四段齐（建档/检索/匹配/呈现收藏），有数据但只有裁剪说明页直接红；无数据无后端 → 裁剪理由必须带实测 N 条 + 快照口径，纯推断词（个位数/极少/不可靠）直接红。
- **教训**：**裁剪也是要被审计的决定**。"我们评估过所以不做"必须附实测证据与日期，否则就是拿推断换工期。


### L95 · 「只能看 demo」能过所有闸门：用户拿到手没法记录自己的事

- **来源**：2026-11-12 全家族体检（用户点名"这是共性错误，大部分项目只有 demo 数据，无新建入口"）。抽查 4 个仓，`check-patient-create` 全红；全家族只有 7 个仓有某种形式的档案入口。
- **为什么既有闸门抓不到**：两套合成档案让首屏有内容、截图好看、`check`/`audit` 全绿；"能不能新建"既不是字符串规则也不是布局规则，所有检查都对它失明。
- **修法**：新增 `templates/check-patient-create.mjs` 随 init 下发并入链。四判据：①患者/档案级新建入口（"新建一条记录"不算）②`POST /subjects` + `INSERT INTO subjects/profiles` 真写库 ③多档案列表 + 当前档案状态 ④demo 有 `is_demo`/种子标记，新建档案与 demo 并存。`--self-test` 内置"只有 demo"反例。
- **教训**：**"演示能跑"不是可用性判据**。凡是"用户要长期往里写东西"的产品，闸门必须查"新增链路"，而不是查"首屏有内容"。

### L76 · file: tgz 重装时 pnpm 会判「Already up to date」不重解包

**现象**：mds-workbench 0.2.0→0.2.1 重装 profiles/web，`pnpm add -w --save-exact file:…tgz`
输出 Already up to date、added 0——package.json 钉到了新 tgz，但 node_modules 里的解包内容
还是 0.2.0 的旧文件（grep 新代码特征 = 0）。判定法被"看起来装了"骗过。
**出处**：2026-11-12 MDS 工作台试验线真实可用改造（用户指正后重装机实测）。
**修法**：重装先 `rm -rf node_modules/<pkg>` 再 `pnpm add -w --save-exact --force file:…tgz`；
装完必须 `grep -c <本次新代码特征>` 安装副本（06 号「装机副本 grep 新代码特征」的强制化）。

### L96 · check-trial-chain 与 L76 冲突：「裁剪线也实跑 M4」在 rc.46 检查器下无合法状态
**教训**：rc.46 的 check-trial-chain 在 research/ 下见到 `trials*.{jsonl,sqlite}` 就走 hasData 分支要求前端 35 号四段；而 L76（cold-agglutinin）要求「裁剪线也实跑 M4」。裁剪+实跑的组合被逼到改名 snapshot-* 绕开文件名匹配（primary-immunodeficiency 2026-11-13 夜班实测）。
**修法**：check-trial-chain 新增「裁剪+实测证据」合法分支——research 下 manifest.json `trimmed:true` + `snapshot.records>0` + 前端无检索入口/无 trialMatch 后端 + 文案含实测 N 条 → 通过；带自测反例（trimmed 但有检索框 / 0 条样本 / 无实测数字 = 红）。回落来源：primary-immunodeficiency-workbench。

### L97 · probe-page-view A4b 抢跑：关闭走 history 导航，焦点重置是异步的
**教训**：整页视图关闭后 Chrome 异步把焦点重置回 body，应用在 60–1000ms 内多轮补焦；探针在 t=0 断言「焦点回到触发元素」必红（假红）。cold-agglutinin 修过一次，primary-immunodeficiency 用同一模板又踩（2026-11-13）。
**修法**：A4b 断言前加 `waitForFunction(activeElement.dataset?.open==='chart', {timeout:1500})` 轮询等待，语义是「焦点最终回到触发元素」。

### L98 · 模板头注释截断 :root 令牌块：页面照渲染、样式全丢，探针测不出
**教训**：sed 替换原型 style.css 首行注释时把三行注释截成两段，`*/` 后残句成为非法语句，CSS 错误恢复吞掉下一个规则块（正好是 `:root` 令牌）。结果：布局还在（结构规则独立）、品牌变量全空、无报错、探针全绿——只有截图目检能发现（primary-immunodeficiency 2026-11-13 实测）。
**修法**：migrate/替换脚本改模板注释时保持注释块完整；验收加一条运行态断言：`getComputedStyle(document.documentElement).getPropertyValue('--brand')` 非空。


### L101 · /claim 机器人要求 issue 自带 `claim` 标签：发帖时就要加

- **来源**：2026-11-13 PSC 认领（issue #73）。`gh issue create` 不带标签，机器人首答「这个 Issue 没有 claim 标签」并拒绝登记；`gh issue edit --add-label claim,triage` 补挂后重发 `/claim` 才过。
- **修法**：认领发帖一步到位：`gh issue create --label claim,triage --title "[认领] …" --body-file …`，不要等机器人打回再补。
- **教训**：**认领流程的"发帖→机器人确认"是一条链**，链上任何一环缺参数都会吃掉一次重试轮次（无人值守下就是几分钟排队）。

### L102 · starter init 生成的接线件缺 config.root：check-data-dir ③ 红在第一晚

- **来源**：2026-11-13 psc-workbench init 产物。`cordis.patch.yml` 无 `config.root: !!js dshHomePath('<slug>')`，`dsh/index.js` 的 `Config` 不声明 root、`apply` 不读 `config?.root`——资料目录闸门 ③（patch 有 dshHomePath · dsh 读 config.root）直接红；装机后表现是服务去默认目录找库、404/空档案。
- **修法**：两处补齐（patch 的 insert 项内嵌 `config: { root: !!js dshHomePath('<slug>') }`；dsh/index.js `Config` 声明 root 列并在 apply 里 `config?.root`）。模板侧应内置。
- **教训**：**「配置了 config.root」≠「服务端声明并读取该目录」**——两半都要有，缺哪半都是静默错位。

### L103 · 家族底本移植时消息命名空间残留：`<前仓>:` 前缀必须整体换

- **来源**：2026-11-13 psc 自 pbc 移植。bridge.js/app.js 的 `pbc:agent-draft`/`pbc:ui-ready`/`pbc:agent-open` 残留，与 lib/client.js 监听的 `psc:agent-draft` 不匹配——独立评审判 P1，桥穿断言会红。
- **修法**：移植底本后全仓扫 `grep -rn "<前仓 slug>:"`，消息类型、localStorage key（`<slug>.agentWidth`）、导出文件名一并换成本仓 slug；探针 stub 的事件类型也要同步。
- **教训**：**协议前缀是"看不见的病种语义"**——禁词 grep 只扫中文病种词抓不到它，要单独一条移植检查。

### L104 · git 直连 443 抖动（DNS 到失活 IP）：换路径不计入重试上限

- **来源**：2026-11-13 夜班，`git clone/push` 连续 75s 超时，但 `gh api` 与 codeload 均通；默认解析 IP 失活、备用 IP 可达。
- **修法**：依次试——① 直连重试循环（当晚克隆第 5 次、push 第 2 次成功）；② 本地 Node CONNECT 中继 + `git -c http.proxy=http://127.0.0.1:<port>` + `http.version=HTTP/1.1`；③ codeload tarball（只读仓）。
- **教训**：**判"任务错"还是"路径错"**：同命令重试 2 次仍挂但其他端点活着 → 路径错，换路径不计上限。

### L105 · 非肿瘤底本移植的发作—缓解线：episode_events 是可复用形状

- **来源**：2026-11-13 psc（首发作—缓解线）。`episode_events`（end_date IS NULL=发作未记缓解）+「近 90 天发作次数读时算」+ 折叠卡 details.phase-fold 单元=一次发作，可平移到复发—缓解型非肿瘤病种。
- **去向**：templates/ 候选；与 L95 的 subjects 写入闭环一并复用。

### L106 · 可选链对「未声明标识符」不生效：`bridge?.` 从未声明时首渲染即炸，静态闸门全拦不住

- **来源**：2026-11-13 ampullary-workbench 0.1.6 装机后「启动无内容」——业务区整片空白。Panel 与 effect 里 30 处引用 `bridge`，但工厂里既没有 `let bridge` 声明也没有 `apply(ctx)` 里的 `bridge = ctx` 赋值（attr-workbench 同款两连击只学了一半）。`check-agent-pane-contract`（正则找字符串）与 `smoke-activate`（apply/register 层）双双全绿，因为 Panel 函数体从未被执行过。
- **修法**：业务仓补 `let bridge = null` + `apply(ctx)` 首行 `bridge = ctx`（0.1.7）；starter 侧 `smoke-activate.mjs` 升判据 6「Panel 真渲染一遍」（conversation 两种形态 + effect/清理函数同步执行），桩件补齐浏览器全局。
- **教训**：**检查链的覆盖终点必须落到「组件真渲染一次」**——只验到 register 描述符的烟测，等价于只验了「装得上」，验不了「打开始终有内容」。凡宿主回调（Panel/组件/effect 回调）都要在桩件里真调用一次；`useEffect: () => {}` 这类空操作桩等于把最危险的一层跳过了。

### L107 · 探针全绿，量的却是别人的页：项目原型从来没被查过

- **来源**：2026-11-12 夜班 myeloma-workbench。`probe-disease-primer.mjs` / `probe-page-view.mjs` 打的是 **starter 的 examples 参考页**（断言绑 `.dp-*` / `.pv-*`），项目原型有自己的 `#pageView` 外壳与 `primer.js`。不带 `--url` 跑出来 10/10、13/13 全绿，而**首页「疾病概要」按钮点了根本不开**。
- **为什么既有闸门抓不到**：绿灯来自另一个页面。探针只报「通过」，报告里没有目标 URL，看的人不会怀疑它量的不是本项目。
- **修法**：① 探针报告必须打印**实际目标 URL**，没有 URL 的通过按未测处理；② 项目侧另建 `probe-page-view-contract.mjs` 这类「按本项目真实选择器」的契约探针；③ 两个探针都带 `--self-test` 反例，证明能红。
- **教训**：**「探针绿」不等于「我这项功能对」**。先问一句：它打开的是哪个 URL、选中的是哪个 DOM？

### L108 · 两套演示档案写反了：命名成「刚确诊」的那套记录最多

- **来源**：2026-11-12 夜班 myeloma-workbench。A 套（本该刚确诊、记录少、多处未知）指标 5 点 + 2 条治疗线 + 移植记录；B 套（本该多年随访）只有 1 条治疗线、其余全空。结果「新患者」路径看起来满满当当，长期随访路径反而是空壳。
- **为什么既有闸门抓不到**：两套数据都「存在」，页面都能打开，语法与文案全绿。缺陷是**数值分布反了**，只有量出来才知道。
- **修法**：`probe-profile-switch.mjs` 这类探针必须出数字：① A/B 在至少 3 个维度（指标点数/治疗线/移植/骨事件/感染/疫苗）上明显不同，② 每套自己的日期在对应视图里都能找到（页面数字确实来自同一份 DEMO_DATA），③ **另一套独有的日期不得出现在当前页面**（不串档），④ 切回 A 后残留为零。
- **教训**：两套数据不是「有没有」的问题，是「谁多谁少」的问题；不写数字断言就等于没验。

### L109 · `html{scroll-behavior:smooth}` 会让 scrollY 断言读到动画中间值

- **来源**：2026-11-12 夜班 myeloma-workbench 的 A5 断言（关掉整页视图后主页停在原滚动位置）。实测报 `0 → 233`，看起来像「关掉后跳回顶部」的严重缺陷，实际是探针自己读早了：`window.scrollTo(0,240)` 在 smooth 模式下是动画，紧接着读 `scrollY` 得到 0；应用归位也是动画，读完立刻读又得到中间值。
- **修法**：探针里用 `window.scrollTo({ top: 240, behavior: 'instant' })` 并等两个 `requestAnimationFrame` 再读；关闭后等 300–400ms 再读终态。
- **教训**：**断言失败先怀疑测量**。把「测量方法」写进脚本注释，下一个人不用再踩一遍。

### L110 · schema 换了结构、领域层没跟着改：装上了，接口一调就 400

- **来源**：2026-11-13 夜班 myeloma-workbench。G3 把结构换成冻结的 `profile` / `workspace`，但 `dsh/workbench.js` 还在读写旧的 `subjects` / `app_setting`。`npm run check`、`npm test`、`dsh-wb-cli audit` 全绿（它们只查语法、包结构、文档与模式），装机后 `/api/subjects` 直接 `400 no such table: subjects`。
- **为什么既有闸门抓不到**：静态检查看不出「表名不再存在」，而探针只打原型（不跑服务端）。
- **修法**：① `migrate()` 用 ledger 里的 sha256 校验历史迁移，改结构后旧库会被当场拒绝而不是等到某个 SELECT 报 `no such table`；② 新增 `scripts/smoke-installed.mjs`：**直接 import 已安装副本** run 一遍路由（health / 静态资源 content-type / 档案 CRUD / 建库），把「装上了但接口 400」这类缺陷挡在装机那一步。
- **教训**：装了不等于能用；**每个写库入口都要有一次端到端调用**，哪怕只是桩 ctx 跑一遍。

### L111 · 闸门靠符号名认模块：匹配纯函数换个导出名就让闸门失明

- **来源**：2026-11-14 psc-workbench 0.2.1 验收加固轮。匹配模块 `trial-match.js` 导出 `matchTrial/matchAll/matchCriterion`，不含 `trialMatch/matchTrials` 字面量；`check-trial-matching.mjs` 的 TRIGGER 只认符号名，于是 hasMatch 只剩调用方（app.js 有 `t.pct` 百分数、档位词在模块里）→ 误报「有百分数但缺档位词」。
- **为什么既有闸门抓不到**：模块与调用方拆成两个文件后，"分数在哪显示"和"档位词在哪定义"分家；闸门按文件合并评估时没把模块文件名算进触发面。
- **修法**：模板触发面加 `MODULE_FILE = /(^|\/)trial-match\.m?js$/`（文件名也算匹配实现）；仓内同时给模块加 `export { matchTrial as trialMatch }` 别名，让家族合同符号稳定存在。两道保险：闸门认文件名，代码留合同符号。
- **通用教训**：凡是"靠符号/字符串名识别被测对象"的检查器，触发面必须包含"实现本体文件名"而不只是符号字面量；否则实现侧一次无害重命名就能让闸门只看见调用方，报出的错指向错误文件。


### L112 · rc.52 自带检查器自相矛盾：placeholder-free 与注入令牌/公共令牌检查打架

- **来源**：2026-11-14 gpp-workbench M0/M5。starter 下发的 `check-placeholder-free.mjs` 把 `__API_BASE__` 等**设计上的注入令牌**当"未替换占位符"报红，而 `check-public-tokens.mjs` 与 `version-inject` 测试又**要求** public 恰好含这些令牌——同一链路自相矛盾，仓里被迫给 placeholder-free 加"家族注入面白名单"（`__API_BASE__/__VERSION__/__VERSION_DISPLAY__/__BUILD_DATE__/__PANEL_LAYOUT__/__AGENT_PANE__`，白名单外 `__NAME__` 仍报红，--self-test 仍红）。
- **为什么既有闸门抓不到**：两个检查器分属不同轮次下发，没人跑过"同仓同链路"的组合。
- **修法**：starter 的 check-placeholder-free 模板应直接内置这份白名单；下发新链前先在样板仓跑一遍完整 check。
- **通用教训**：检查器新增时必须与既有检查器跑"合链冲突测试"——两条闸门对同一产物给出相反结论，等于没有闸门。

### L113 · starter 检查器缺 import / 裸插值：rc.52 两处直接 ReferenceError

- **来源**：2026-11-14 gpp-workbench。`check-ui-parity.mjs` 用了 `existsSync` 却没 import（首跑即 ReferenceError）；`build-client.mjs` 模板里 `id: ${pkg.name}` 裸插值进生成物（产物语法错误）。家族仓各自修在仓内（gpp：加 import / JSON.stringify），未回传底本。
- **修法**：starter 两个模板各补一行；检查器与构建器模板自身也要过 `node --check` 与一次真实构建。
- **通用教训**：检查器/构建器是代码不是配置，纳入与业务代码同级的最小验证（语法检查 + 一次端到端产物断言）。

### L114 · 验证工具对 harness/<包名> 目录开库，会伪造 dshHomePath "宿主已加载"判据

- **来源**：2026-11-14 gpp-workbench M6/V3。`verify-desktop-load.mjs` 以 "harness/<包名>/（dshHomePath 目录）出现 = 服务端 store 真跑过一次" 为宿主加载证据；而独立体检/测试若以 `root=harness/<包名>` 实例化 Workbench（开库+播种），会凭空造出该目录与 sqlite，令 verify 报出「宿主已加载」的假阳性（gpp 实测：01:41 体检代理开库 → verify 02:05 误判已加载；宿主工作台清单实际不含本仓）。
- **修法**：①体检/测试一律用 tmpdir 或仓内 dev 目录，禁止指向 harness 真目录；②verify-desktop-load 增强判据：数据目录 mtime 必须 ≥ 装机 mtime 且 **晚于本次 harness 启动时刻**，否则降级为「疑似验证产物」；③发现痕迹先查创建者（`fs.stat` birthtime 对比装机时间线）再下结论。
- **通用教训**：任何"痕迹=发生过"类判据，都必须排除验证工具自身的写副作用；证据产生者与证据检查者不能共用同一写入面。

### L115 · pnpm 换装 file: tgz 前先改 dependencies 里的旧绝对路径

- **来源**：2026-11-14 gpp-workbench 0.2.0→0.2.1 重装。`pnpm add` 只改 lock，`dependencies` 里的 `file:/…0.2.0.tgz` 仍指向已删除的旧包，下次解析直接报 ENOENT。
- **修法**：重装前先 JSON 改写 profiles/web/package.json 的对应依赖 spec 指向新 tgz，再 pnpm add；或 pnpm add 后立即核对 dependency spec 与磁盘包一致。
- **通用教训**：file: 依赖是"路径即版本"，删旧包前先检查是否有 profile/lockfile 还引用它。
- **复发记录**：2026-11-21 neuroblastoma-workbench rc.1→rc.2 重装再次命中（spec 仍指 rc.1 旧 tgz，pnpm add 直接 ENOENT）——重装脚本必须先 JSON 改写 spec。

### L116 · 快照对账表 source_statuses 必须由 fetch 脚本同轮落库（新库 no such table）

- **来源**：2026-11-14 gca-workbench M4。`check-trial-snapshot.mjs` 按 `SELECT … FROM source_statuses` 对账，但现行 fetch 模板只建 `source_states`+`query_log`——旧仓（psc 等）的 sqlite 是历史版 fetch 产物、带这张表，新病种第一次真采集就报 `no such table: source_statuses`。表口径：`(query, source_id, state)`，state 为映射后的六值有效终态，`manifest.sourceStatusRows` 同轮写入。
- **修法**：fetch 模板在建表段补 `CREATE TABLE source_statuses (query TEXT, source_id TEXT, state TEXT)` 并在逐 query×source 落 query_log 时同轮 INSERT；勿事后手补（哈希要三处一致）。
- **通用教训**：检查器断言的表 = 采集器必须产出的表；对账字段在模板内闭环，不许靠"历史库恰好有"。

### L117 · 快照到位后必须摘除 check-trial-snapshot 的 --if-present

- **来源**：2026-11-14 gca-workbench。移植期无快照，check 链临时挂 `--if-present` 保 SKIP；M4 真快照落库后若忘摘除，"有快照必须对账"的闸门就空转。家族禁令：`check-trial-snapshot.mjs .` 不许带 `--if-present`（ONESHOT §1.4）。
- **修法**：采集完成后 sed 摘除 package.json 里的 `--if-present`；`npm run check` 必须在带快照的严格形态下 exit 0。可断言：有 research/*/manifest.json 时 package.json 不得含 `--if-present`（待实施⑩）。
- **通用教训**：为"还没有"降级的门禁，在"有了"之后必须恢复严格，否则闸门只对空仓有效。

### L118 · 跨仓机械改名的三个工程坑（BSD sed \b / cp -R 嵌套 / 事件通道字面量）

- **来源**：2026-11-14 gca-workbench←psc-workbench 全仓移植。
- **坑与修法**：① BSD sed 不支持 `\b`（静默不替换），跨仓改名用 `perl -pi -e 's/\bpsc\b/gca/g'`；② `cp -R src dst/src` 在 dst/src 已存在时会复制成 `dst/src/src/` 嵌套并漏拷冲突文件——目标目录已存在一律 `rsync -a src/ dst/`；③ 事件通道等拼出的字面量（`<slug>:agent-draft`）分散在 bridge/app/client 三处，改名后必须 `grep -o "[a-z]*:agent-draft" | uniq -c` 验证唯一值，不一致=草稿桥静默断链。
- **通用教训**：机械移植的收尾不是"没报错"，是"成对锚点 grep=0 且 uniq=1"。

### L120 · 断点续跑三层教训：仓库断点实测过关、会话续传此前从未接、正常退出未完成无接续（2026-11-18）

- MPN（2026-11-15）被 magpie 宕机打断时只推了 M0，靠逐里程碑 commit+push＋PROGRESS.md 换路续派后完成 v0.2.0——仓库层断点是实测有效的真断点。
- Codex 自带 `codex exec resume <session-id|--last>` 原生会话续传（zhuanz 0.162.0 与 sam 0.160.0 均实测有此子命令；codex.log 头部有 session id 行可抓取落盘），但全部 runner 此前一律新开会话＋续跑提示词重建上下文，从不保存 session ID：能用但更费 token，且跨工具才成立。定版：runner 落盘 session.id、续跑优先 resume、失败再退回提示词续跑。
- 睾丸癌（2026-11-17）Codex 以 EXITCODE=0 正常退出但任务未完成（G2 待确认＋快照未入仓），看守的自动续跑只管「进程异常死亡」，这类「活着退出但没干完」无人接续、无限期等人工。定版：未完成先分类——纯未完成自动续跑，人工决定类（缺仓外产物、待确认闸口）停住报用户。
- zhuanz NLRP3 第二轮（2026-11-15）：包装脚本随远程会话一起死，EXITCODE 未落盘、无心跳、无人接，整轮丢失。定版：长任务一律走带心跳＋EXITCODE 落盘＋可重拉的包装（zhuanz D:\dev\longtask\run-task.ps1）。

### L119 · 单会话一次跑完 M0–M9 只花 58 万 token：省的不是模型，是派单与脚手架

- **来源**：2026-11-17 sam 上 Codex 跑 TRAPS 工作台（罕见病 R2 #81，认领 Issue #85）：06:39 启动、07:27 收尾，48 分钟、11 个提交（M0–M9 逐里程碑一个）、306 个文件、五项门禁全绿，codex.log 实测 tokens used 580,744。对照：睾丸癌同日同机 713,320 token 未完成——差的不是模型效率，是 M4 快照文件缺失、原型 G2 待人确认两个外部阻塞在烧上下文。
- **做法（可复用清单）**：①派单一次写全：目标/仓库/认领号/starter 版本/参考实现/M0–M9 定义/硬规则/收尾格式全在 prompt 里定死，单会话零往返、零等问；②有已完成的同框架参考实现（mpn-workbench v0.2.0）在本机，结构照抄改造，不从零设计；③验证全走脚手架现成检查链（npm run check 内含检查+测试、audit、pack、探针脚本），模型不靠反复读代码自证；④里程碑小步切分、完成即 commit+push，上下文始终只装当前里程碑；⑤边界预先裁定：Desktop 实机标未验证不尝试、M7/M8 只备草稿、公开数据只取种子快照并标注非穷尽——不为"完备"无限检索；⑥诚实停损：哈希类既有失败如实记录不凑绿，不在死路上烧 token。
- **通用教训**：token 账主要由"派单完备度 × 参考实现 × 检查链脚本化 × 边界预裁"决定。派单前把这四项备齐，比换更强的模型更省；外部阻塞（缺文件、等签认）出现时先停损上报，不要让 agent 在阻塞上空转。
### L121 · 批量改名脚本会把「键→标签」错位，探针必须有内容对位断言

- **来源**：2026-11-15 neuroblastoma-workbench M2。把 `diagnosis` 批量改 `dx` 时，VIEWS 表的键改了但标签行错位（`dx:` 挂上了「标志物随访」，真正的「诊断与分期」行被删）。路由渲染探针只查「非空」时全绿——加了「每路由必含本页关键词」的内容对位断言（probe-<slug>-m2.mjs R2）才抓到。
- **修法**：全量渲染探针每条路由断言 1 个本页特有关键词（来自页面自身文案，不是 starter examples）；改名类脚本跑完必跑该探针。
- **通用教训**：「渲染非空」证明不了「内容对位」；改名/移植类变更的对位断言是唯一能抓错位的闸门。

### L122 · check-placeholder-free 与 check-version-literal 的占位符约定互相冲突（双闸打架）

- **来源**：2026-11-16 neuroblastoma-workbench M5。check-version-literal 规则 A 要求页面用 `__VERSION_DISPLAY__` 占位符、由服务端响应时注入；check-placeholder-free 却禁止随包文件含 `__NAME__`（package.json files 白名单 + dsh/ + lib/）。两条各自都"对"，同时接进 check 链必有一红。
- **修法**：新仓走**字面量约定 B**——migrate-public 生成 public/ 时直接从 VERSION 读值替换（版本字面量必须全等于 VERSION），服务端不做响应期注入；`window.<slug>App` 这类运行时钩子不用双下划线命名。PF-ILD 的占位符形态是历史存量，新项目别照抄。
- **通用教训**：接新检查器前先跑一次全链；两个"对"的规则打架时，选能同时满足的那条约定并写进家族文档。

### L123 · 「相关条数」要在 slice 之前算（口径被截断成摘录数）

- **来源**：2026-11-16 neuroblastoma-workbench M4。builder 先 `slice(0,48)` 取摘录再算 relevantCount，界面卡头把 159 条相关写成 48。
- **修法**：`relevantAll = filter(...)`；`relevantCount = relevantAll.length`；摘录 `trials = relevantAll.slice(0,48)`。
- **通用教训**：统计口径先全量计数、后截断展示；卡头数字必须来自计数变量而非展示数组。

### L124 · 子代理并发限额下的夜间降级路径

- **来源**：2026-11-14 neuroblastoma-workbench 开工。后台子代理连续 2 次（并发限额 / 套餐 busy）失败。
- **修法**：按额度类错误纪律立即停用子代理、主线自写；体检轮用「静态断言 + 探针 + 四态报告」替代第二 Agent 独立审查，并在报告注明替代方式。
- **通用教训**：无人值守任务的降级路径要事先写死，不临场试错。

### L125 · 宿主 exact route 按「路径」去重，不区分 method

- **来源**：2026-11-19 mpn-workbench Desktop 装机实测。`/api/mpn/root` 的 GET 与 POST 各注册一次 `kind:'exact'`，宿主报 `webserver: duplicate exact route "/api/mpn/root"`，整包激活失败。
- **修法**：同路径多方法合并注册一次，handler 内按 `req.method` 分发（小脑补 405）。
- **通用教训**：宿主路由契约以路径为唯一键；`kind:'prefix'` 每基础路径也只注册一次、内部分发（psc 范式）。静态桩与单测都测不到——只有宿主真注册才触发。检查器：`templates/check-host-route-dedupe.mjs`（变量简写 path 记待人工）。

### L126 · 静态占位符注入必须覆盖外链 JS，不只 .html

- **来源**：2026-11-19 small-bowel-workbench Desktop 装机实测。页面报「Cannot read properties of null (reading 'currentProfileKey')」：`public/app.js` 携带 `__API_BASE__`，注入只对 .html 做，app.js 永远带占位符 → `fetch('__API_BASE__/bootstrap')` 打到宿主 SPA fallback 返回 200 HTML → 前端 `boot=null` 静默崩。
- **修法**：静态服务对 `.js` 与 `.html` 同样调用 injectTokens。
- **通用教训**：SPA fallback 让错误路径返回 200，坏在「JSON 解析失败」而非 404——凡占位符替换，先列全携带占位符的文件类型再写注入条件。检查器：`templates/check-static-token-inject.mjs`。

### L127 · 装机验证是三级漏斗，前级绿 ≠ 后级绿

- **来源**：2026-11-19 mpn / small-bowel 双仓实测。`smoke:activate`（静态桩）全过 ≠ 宿主激活（mpn 死于 duplicate route）；宿主日志 0 报错 ≠ 页面可用（small-bowel 死于占位符，宿主根本不知道）。
- **修法**：三级各自跑：① 静态桩/单测；② `verify:desktop` 宿主侧（本次段日志、数据目录、清单）；③ 真机新会话点开页面走 bootstrap。V2 写「通过」必须三级都有证据。
- **通用教训**：每一级只能证明它自己那一层；跨层推断按虚报处理。

### L128 · 头部档案菜单必须同步含「创建新档案」直达入口

- **来源**：2026-11-19 用户验收反馈（small-bowel 顶栏档案下拉只有切换；mpn 建档藏在档案管理弹窗两层跳）。
- **修法**：头部/侧栏档案区旁常驻「＋ 新建档案」按钮，复用同一建档弹窗；small-bowel 0.2.2 / mpn 0.2.2 均已落。
- **通用教训**：患者高频动作（建档案）不许只存在于某个次级页面里；入口常驻、两跳以内。

### L129 · 沙箱 iframe 外链白名单必须含 allow-popups，且壳层要有 open-external 兜底

- **来源**：2026-11-19 small-bowel / mpn Desktop 真机验收。试验详情「打开官方登记页 ↗」（target=_blank）点击无反应：A 家族外壳 iframe 的 sandbox 白名单只有 allow-scripts/same-origin/forms/downloads，**沙箱 iframe 里弹窗被静默拦截**，宿主与页面都无报错。
- **修法**：① 外壳 iframe sandbox 补 `allow-popups allow-popups-to-escape-sandbox`；② 业务页外链点击先 `window.open`，返回空就 `parent.postMessage({type:'<pkg>:open-external', url})`；③ 壳层监听同一消息 `window.open(url,'_blank','noopener')` 代开（宿主 setWindowOpenHandler 仍把关）。small-bowel 0.2.4 / mpn 0.2.3 均已落。
- **通用教训**：sandbox 白名单按「页面实际要做的动作」列全，弹窗能力缺失不报错——外链、下载、表单逐一真机点一遍；规范见 docs/40-A-FAMILY-PANEL-STANDARD.md §1.4。

### L130 · 带 scope 的包名在 build-client 里必须 JSON.stringify，不能裸插值

- **来源**：2026-11-19 cancer-policy-workbench（本夜）首次 `node --check lib/client.js` 直接 SyntaxError：模板 `templates/build-client.mjs` 写的是 `id: ${pkg.name},`，包名 `@xyb-community/cancer-policy-workbench` 被插成 `id: @xyb-community/...`，宿主加载必然失败。
- **修法**：`id: ${JSON.stringify(pkg.name)},`；本夜已改 templates/build-client.mjs。
- **通用教训**：任何把 package.json 值插进 JS 源的地方都按字面量编码（JSON.stringify），不要假定包名无 scope；`node --check lib/client.js` 是最便宜的拦截点，新仓第一天必须跑。

### L131 · check-placeholder-free 与家族注入面自相矛盾（L839 的模板落地）

- **来源**：2026-11-19 cancer-policy-workbench。L839 已记录“设计注入令牌被当漏替换”，但 starter 的 `templates/check-placeholder-free.mjs` 仍无白名单：`public/app.js` 的 `"__API_BASE__"`、`lib/client.js` 的 `__PANEL_LAYOUT__` 全被报红，而 `check-public-tokens` 又要求这些令牌必须存在。
- **修法**：模板加 `FAMILY_TOKENS`（`__API_BASE__/__VERSION__/__VERSION_DISPLAY__/__BUILD_DATE__/__PANEL_LAYOUT__/__AGENT_PANE__`）扫描前剔除；白名单外 `__NAME__` 仍红，`--self-test` 仍红。
- **通用教训**：两条门禁互相矛盾时，先按已登记口径修检查器（并补 self-test），不要删门禁或改断言；本夜已回流 templates/check-placeholder-free.mjs。

### L132 · 业务页 API 令牌的注入面：字符串字面量 + 外链 JS 都要覆盖

- **来源**：2026-11-19 cancer-policy-workbench。先写成 `window.__API_BASE__`（注入后 `window.` 语法错），又只对 .html 注入（app.js 永远带占位符）；两次都是 dev 在跑旧进程时看不出，重启后才暴露。
- **修法**：`var apiBase = "__API_BASE__"`；服务端对 `.html` 与 `.js` 都调用注入；`check-public-tokens` + `check-static-token-inject` 双闸。
- **通用教训**：改服务端注入逻辑后必须**重启 dev server** 再验；dev 全绿可能只是进程没换代码（本夜实际踩到）。

### L133 · CloudBase 默认域名会强制 attachment，demo 公网链接要走 `tcb app deploy` + 中间页/自定义域名

- **来源**：2026-11-19 cancer-policy-workbench 发布 demo。`tcb hosting deploy` 与 `tcb app deploy` 都成功、`curl -I` 200，但浏览器打开默认域名（`*.tcloudbaseapp.com` / `*.webapps.tcloudbase.com`）时：navigate 请求落到「风险提醒」中间页（等待 3 秒点“确定访问”后才能进），非 navigate 请求被强制加 `Content-Disposition: attachment` 直接下载；把对象元数据改成 `Content-Disposition: inline` 也被网关覆盖。
- **修法**：默认域名只做开发自测；对外 demo 用 `tcb app deploy --framework static` 发布并接受首访中间页，或绑已备案且有有效证书的自定义域名（`tcb domains add --certid`）。子路径挂静态托管时优先做**单文件 HTML**（内联 CSS/JS，`</script` 转义为 `<\/script`），再用 `tcb routes add` 挂 `STATIC_STORE` 路由，避免子路径资源 404。
- **通用教训**：发布前用无头浏览器 `goto` + 等待 + 断言 h1，而不是只 `curl -I`；curl 200 不等于浏览器能渲染。检查器：无（平台行为，需人工/浏览器验证）。

### L134 · 新增一级页必须“六处同步”，且逐路由探针要断言页面专属内容

- **来源**：2026-11-20 cancer-policy-workbench 新增「费用与报销」页：NAV/ROUTES/VIEW_META/探针都同步了，render map 漏了 `expenses: renderExpenses` —— `check-probe-coverage` 全绿、逐路由探针也全绿，因为路由映射错误时 `#view=expenses` 渲染的是 home 的内容，而探针只断言“有 h1 / 内容够长”。
- **修法**：新增一级页同步六处（NAV / ROUTES / VIEW_META / render map / probe ROUTES / 文档计数），并把同步做成检查器：`templates/check-route-map.mjs`（断言四处键集合一致 + probe 覆盖，带 self-test）。逐路由探针在通用断言外，必须补一条**页面专属 selector** 断言（如费用页 `.stat` 汇总卡数量、病友社区页 `.community-card` 数量）。
- **通用教训**：路由级探针只断言“h1/长度”会假绿；“页面能打开”不等于“打开的是这一页”。

### L135 · 集合类测试断言用下限 + 关键项，不写精确总数

- **来源**：cancer-policy-workbench `test/handling` 写死 `>=40` 条，随后基金会在同一轮里增删条目，测试连环红；`test/psych-support` 的 `>=13` 同样在补条目后失效。
- **修法**：数据会持续增补的集合（政策库/基金会/病友社区/热线），断言写成 `>= N` 并点名必须存在的关键项（如“红十字/白求恩/荣基金/9958”“熊猫/086/四叶草/肺腾/妍康”）；精确计数只用于“防多/防漏”语义必要的场景。
- **通用教训**：测试跟随语义（这些必须存在），不要跟随当天的条数。

### L136 · init 交付物与 starter templates 已分叉：续跑仓开工先做「模板差异对账」，健康检查 URL 纳入路由前缀断言

- 现场（traps-workbench 2026-11-20 夜班续跑轮）：2026-11-16 init 下发的骨架与 starter templates 最新版已有三处漂移——
  ① `check-placeholder-free.mjs` 无 `FAMILY_TOKENS` 白名单，而 `check-version-literal` 约定 A 要求页面必须含 `__VERSION_DISPLAY__`，两闸门互斥红；
  ② init 的 client.js 健康检查 fetch 写死 `/api/<slug>-workbench/health`，与 `lib/identity.js` 的 `API_PREFIX`（`/api/traps`）漂移，装机后版本 chip 永远「连接中」；
  ③ 壳层消息命名空间用 `<pkg>:agent-draft`，业务页发的是 `<prefix>:*`，双方监听不到对方的 postMessage。
- 规则：续跑仓（init 后隔夜再开工的仓）动手前先 diff 仓内 `scripts/*.mjs`、`lib/client.js` 与 starter `templates/` 对应文件；分叉处按模板最新版对齐，不许按旧骨架续写。
- 可断言化：`templates/check-route-prefix.mjs` 新增断言④——client.js 里 `fetch('…/health')` 的 URL 必须含 `/api/<API_PREFIX>/`，写死旧 slug 直接红。
- 安装配方同步修：`project-template/scripts/check-install.mjs` 的 pnpm 示例从 `./release/…` 改为「仓库绝对路径」（pnpm `--dir` 的相对路径以 profile 目录解析，相对写法 ENOENT，本夜实测两次）。
- 回收自：traps-workbench M5/M6。

### L137 · 续跑第一动作 = fetch 远端并对齐，再读本地 PROGRESS（traps 双线教训）

- 现场（traps-workbench 2026-11-20 夜班）：本地克隆停在 M0（11-16 早上），但同一认领线的 11-16 深夜 runner 已把 M0–M9 推上 origin/main。夜班只读了本地 PROGRESS/git log，未 `git fetch`，在过期断点上独立重建了 M2–M5，结果 origin/main 与本地出现两条完整实现线。
- 规则：被续跑时第一步 `git fetch origin && git log HEAD..origin/main --oneline`；远端领先即按其 PROGRESS/MILESTONE-EVIDENCE 对齐，禁止在旧基线上重做已完成里程碑。本地与远端分叉已发生时：不 force-push、不互相覆盖——本地线推成命名分支（如 night-<日期>），报告里并排写清两线差异，合并决策交用户。
- 断言化建议：init/续跑提示词第 0 步固定为 fetch 对齐；`PROGRESS.md` 头部加「最近一次 origin/main 对齐时间」字段，检查器可断言该时间不晚于最近 fetch。
- 回收自：traps-workbench 收尾（night-20261120 分支 vs origin/main）。


### L138 · 相关计数与匹配判据里，缩写词必须大小写敏感+词边界（TRAPS→extracellular traps 两连坑）

- **现场**（traps-workbench 2026-11-20 续跑轮）：快照「相关条数」用 /(TRAPS|…)/i 按标题统计得 78 条，实际相关仅 9 条——「Targeting neutrophil extracellular traps」的字面 traps 被命中；同日改判据时又把 TRAPS 整体加了 /i，小写 traps 再次命中非本病登记并产出「诊断」判据（单测抓出）。
- **修法**：缩写词（TRAPS/TNFRSF1A 等全大写缩写）单独一组**大小写敏感**正则（TRAPS，不加 /i），英文短语与中文才用 /i；相关数、匹配判据、池过滤三处同规则，并在 manifest.relevantRule 里写明词边界口径。相关数虚高会写进界面「相关 Y 条」，是患者可见的假话。
- **回收自**：traps-workbench M4/M5（check-trial-matching 自测 + test/trial-line）。

### L139 · 「模块写好了没人调用」：server.js UI 分支必须真调静态注入（api-ready + 版本占位）

- **现场**（traps-workbench 2026-11-20 续跑轮）：dsh/static.js 里 createStaticHandler（含 api-ready 注入与 __VERSION_DISPLAY__ 替换）已写好，但 server.js 的 UI 分支自己 readFileSync 裸发文件——静态检查全绿，装机后 host-bridge 永远拿不到 api-ready 标志，业务区永远停在「原型预览 · 未连接本机资料库」降级稿，读写全挂且无报错。
- **修法**：注入逻辑抽成 static.js 的 injectHtmlFlags(html, uiVersion) 单一来源，server.js UI 分支对 .html 统一调用；验收不是「函数存在」而是「服务出来的 HTML 里真的有注入物」（curl UI 入口 grep 注入标志 + 版本号）。
- **通用教训**：接线层的「 import 了但没用」不会红任何闸门；服务端形态验收必须打到 HTTP 响应体。
- **回收自**：traps-workbench 装机副本实测（0.2.0）。

### L136 · 升级重装前，profile 的 file: 依赖钉着旧 tgz——删旧 tgz 会让 pnpm add 整体 ENOENT

- **来源**：2026-11-20 cancer-policy-workbench 0.2.2 重装。profile `package.json` 的依赖是 `file:…/…-0.2.1.tgz`；打包新版前 `rm` 掉旧 tgz，`pnpm add <新版.tgz>` 在解析既有依赖时就 ENOENT 失败，且 node_modules 里的包目录被留成缺失——工作台直接从 Desktop 消失（用户感知即"没有安装成功"）。
- **修法**：先改 profile 依赖指向新 tgz（或保留旧 tgz 文件），再 `pnpm install`；`pnpm add` 用 `set -o pipefail` 看真实退出码。
- **通用教训**：file: 依赖与磁盘文件是硬绑定；"装机 OK"的判断必须落到 `node_modules/<pkg>/package.json` 的 version，而不是 pnpm 的成功输出。

### L137 · 客户端 INJECT 必须声明 `sessions`——currentSession 回退路径读 ctx.sessions 会炸激活

- **来源**：2026-11-20 cancer-policy-workbench 装机。INJECT 只声明 desktopWorkbenches；Panel 渲染时 `currentSession()` 回退路径读 `host.sessions.list.getSnapshot()`，Cordis 守卫对未声明服务抛错 → "web boot: 1 entry did not activate"（且日志无插件名归属行，只有恢复循环里反复 "loading"）。Node 桩件（smoke-activate）用普通对象复现不出来。
- **修法**：`INJECT = ['desktopWorkbenches', 'sessions']`（与 cervical/takayasu/cidp 家族基线一致）；新检查器 `templates/check-inject.mjs`（含 self-test）断言"读了 ctx.sessions 就必须声明"。
- **通用教训**：Cordis 守卫在属性**访问**时即抛错，懒调用只在"不在激活路径上"时才安全；凡 Panel 渲染路径能触达的 ctx 服务，必须进 INJECT。

### L140 · 跨仓同机续跑：shell cwd 会被重置——无 `cd` 的 ls/grep/wc 落在错误仓，会"看到"另一个仓的文件并误判质量

- **现场**（gastrointestinal-bleeding-workbench 2026-11-20 晨间续跑）：会话在 myeloma-workbench 里启动，续跑另一仓时部分验证命令没带 `cd`，`ls prototypes/v0.2/`、`wc -c`、`grep <title>` 全部落回 myeloma 目录——于是"读出" myeloma 的原型（小浆宝标题、骨髓瘤 demo 数据、14/14 测试），据此判定续跑仓原型是"跨仓复制、缺三件套、check 全绿"，险些整页重写一份本来合格的产物。
- **修法**：① 跨仓每条验证命令显式 `cd <目标仓绝对路径>`（或全部用绝对路径参数）；② 续跑第一动作先打「目标仓绝对路径 + git log -1 + 文件清单」三件套，结论挂在这三件上，不以单条命令输出为准；③ 判断"原型是否跨仓复制"前，用 `grep -c <本病种专名>` 与 `grep -c <其他病种专名>` 在**确认路径**下各跑一遍再下结论。
- **通用教训**：目录推断类证据（ls/相对路径 grep）在多仓环境里是易错的；检查器与探针应打印自己的作用绝对路径，让"验的是哪个仓"永远可见。
- **回收自**：gastrointestinal-bleeding-workbench 续跑轮（误判被复核纠正，未产生错误改动）。

### L141 · 初始化器下发的 `serve-artifact.mjs` / `check-install.mjs` 可能停留在旧 server 签名——M5 换服务层后必须同批重写

- **现场**（gastrointestinal-bleeding-workbench 2026-11-20）：家族新架构是 `createHandler({apiBase, publicDir, services}) + Workbench`，但 init 下发的 `scripts/serve-artifact.mjs` 仍按 `createHandler(store, {version, uiPrefix})` 与 `openStore({path})` 调用——按原样跑直接报错/白屏。它是「装机副本验收」的唯一入口，坏了就只剩源码树自测。
- **修法**：M5 完成服务层时同批重写 `serve-artifact.mjs`：从包目录 import `createHandler`/`Workbench`/`lib/identity.js`，起 127.0.0.1 服务器；验收时必须用它服务**装机副本**再跑探针（源码树 13/13 不能替代）。
- **通用教训**：模板脚本与服务层是同一批产物；换架构却不换验收脚本，等于把最关键的证据口关掉了。

### L142 · 试验详情补全：只补相关记录、逐条 10s 超时、失败记账而不是猜

- **现场**（同仓 M4）：`search_trials` 只回登记摘要，匹配要的年龄/性别/适应症在 `get_trial_detail`；对 250 条全量拉详情既慢又多无关记录。实测 61 条相关里 55 条成功、6 条 `ictrp` 超时——若把超时当空值继续算，会把「不知道」伪装成「不符合」。
- **修法**：`scripts/enrich-*-trials-detail.mjs`：只遍历相关记录（与 manifest 同一 `lib/relevance.js`），逐条 `Promise.race` 10s，失败写 `manifest.detail.failedRecords`，字段留 NULL；计数不变、只回填哈希。重跑幂等。
- **通用教训**：外部详情接口是「慢且会失败」的；匹配判据宁可少一项（待确认），不可把超时静默成阴性。

### L143 · hash 路由项目也必须显式声明 ROUTES——否则 check-probe-coverage 判「找不到路由」，新页无人扫

- **现场**（同仓 M5）：app.js 用 `VIEWS` 数组 + `showView()` 切页，没有 `ROUTES` 字面量；`check-probe-coverage.mjs` 解析不到路由直接红，且无法知道「新页有没有被探针覆盖」。
- **修法**：顶部声明 `var ROUTES = ['home', 'records', 'clinical/match', ...];` 与 `ROUTE_PAGES` 映射，路由切换统一走 `goto()`；探针文件里逐条出现这些字符串并真实渲染断言（R1–R7），再加档案切换/八类/新建/记录/窄宽（R8–R12）。
- **通用教训**：路由表不是给框架看的，是给闸门看的；没有它，探针全绿只说明它没扫到新页。

### L144 · Cordis 守卫对**未声明服务的读取**也抛错，且发生在 apply 构建期——检查器不得给"懒访问"留豁免

- **现场**（cancer-policy-workbench 0.2.2 → 0.2.3，2026-11-20）：客户端新增"配置目录"后，`buildPanel()` 入口写了 `const uiWorkspace = host?.uiWorkspace`，但 `INJECT = ['desktopWorkbenches','sessions']` 没声明 `uiWorkspace`。Cordis 守卫在 `apply()` 里直接抛 `cannot get property "uiWorkspace" without inject` → 客户端条目**不激活**；宿主 boot 审计只报一行 `web boot: 1 entry did not activate`（后面跟 `包名: loading`），界面照常打开、只有红字，工作台不进 dock。
- **为什么检查器没拦住**：`check-inject.mjs` 当时把 `uiWorkspace` 未声明判为"懒访问（仅在交互回调读取）可接受"直接放行；而实际是**构建期读取**。同时正则 `(?:host|ctx|bridge)(\?\.)?\.` 抓不到 `host?.uiWorkspace`（`?.` 后没有第二个点）。
- **修法**：`INJECT` 必须覆盖**实际读取的服务全集**（`desktopWorkbenches` / `sessions` / `uiWorkspace`）；`check-inject` 改为"任何 `host/ctx/bridge.<service>` 读取都必须声明"，修正 `?.` 正则，self-test 增加 `uiWorkspace` 反例并入 check 链。
- **通用教训**：① 守卫是**读**也炸，不只是写；② 检查器里任何"这个可以豁免"的分支，都要问一句"真机抛错时它会不会放过去"；③ 这类激活失败在宿主侧只留一行 `包名: loading`，定位靠"同构复现"——用 Desktop 同版本 node + 完整 profile 副本 + Desktop 的 `--patch` 起一个无头宿主，把诊断打进 `globalThis` 再读。

### L145 · 首次启动不能替用户猜患者资料目录；选择失败必须保留旧库

- **来源**：factor-vii-deficiency-workbench 0.2.0-rc.2（2026-11-20）。首启若自动创建 `patient-data/`，用户会误以为已经在受保护目录写入；目录切换若先关闭旧库再打开新库，选择失败会把当前工作台一起打空。
- **修法**：`Workbench.open(configRoot)` 首启只创建 `settings.sqlite`，患者库保持未选择；`setDirectory()` 先打开并迁移候选库，成功后写 `app_setting` 并切引用，失败关闭候选、保留旧库。测试同时断言首启无 `patient-data/`、重开回显、失败后旧根不变。
- **回收自**：factor-vii-deficiency-workbench `test/write-api.test.mjs`。

### L146 · 路径拒绝要查 realpath 与每一段符号链接，大小写之外的“同目录”绕行

- **来源**：同仓目录闸门。只比较用户输入字符串时，主目录内指向桌面、下载根或 tmp 的符号链接可以绕过拒绝清单。
- **修法**：先拒绝主目录、桌面、下载根、tmp/系统临时目录，再对输入路径和最近存在祖先做 `realpath`，逐段检查 `lstat().isSymbolicLink()`；客户端与服务端各跑一次。负控必须真注入 symlink 并报红。
- **回收自**：factor-vii-deficiency-workbench `workspaceProblems()` 与 symlink 单测。

### L147 · 私密出口必须覆盖主记录及其 source 镜像，每次状态变更都留 revision

- **来源**：同仓隐私写库闭环。仅改 `patient_record.is_private` 而漏掉 `source_document`，导出/AI/看板三条出口就可能出现“记录私密、来源公开”的分叉。
- **修法**：同一事务中同步主记录、来源、专属表的隐私位，递增主记录 revision，并写入 `record_revision` 快照；测试逐表核对，不只断言 API 返回值。
- **回收自**：factor-vii-deficiency-workbench `setPrivacy()` 与 `privacy updates persist a revision and mirrored source state`。

### L148 · 备份名必须含毫秒并在碰撞时追加序号，不能只信“同一秒不会两次”

- **来源**：同仓备份恢复。秒级时间戳在同一操作链中连续创建两次会得到同名文件，后一次覆盖前一次；恢复入口也可能找不到刚创建的安全副本。
- **修法**：名称形如 `patient-YYYYMMDD-HHmmssSSS.sqlite`，若仍存在则追加 `-NN`；恢复前再存安全副本，测试创建两次并分别恢复。
- **回收自**：factor-vii-deficiency-workbench `createBackup()` / `restoreBackup()` 回归。

### L149 · 运行期需要 `demo/` 就必须进 package files；演示数据和真实快照分开

- **来源**：M4/M5 反复出现的“本地能跑、tgz 装了找不到 demo builder”。运行期 import 的 `demo/` 不在 `files` 白名单时，宿主激活阶段才会失败。
- **修法**：package `files` 显式包含 `dsh`, `lib`, `public`, `schema`, `demo`, `research`, `assets`；pack 内容测试逐项断言。界面中虚构示例、真实快照、自建患者记录分别标注，禁止混表。
- **通用检查**：tgz 解包后核对且未替换占位符为 0。

### L150 · 离线时禁用范围必须按能力细分：本机读写不应被网络状态一起关掉

- **来源**：同仓临床检索与 MinerU。浏览器 `navigator.onLine=false` 时只应禁用官方外链和云端解析；本机 SQLite 检索、记录、目录和收藏仍应可用，否则离线首先失去患者最需要的回顾能力。
- **修法**：UI 按动作判定能力来源；在线通道失败返回独立 `FAILED` 对象，不覆盖本地快照结果。探针断言离线文案、禁用控件集合和本机路径仍可达。
- **回收自**：factor-vii-deficiency-workbench `runTrialSearch()` / 在线通道分离测试。

### L151 · 原生 AI 面板检查要落在 Panel 内且在 return 前；“有 subscribe 字样”不算订阅

- **来源**：同仓面板修复与全家族 2026-11-11 教训。把订阅放进其他组件或主 `return` 之后是死代码，还可能连带破坏原本的焦点/滚动恢复。
- **修法**：`templates/check-agent-pane-contract.mjs` 增加两项静态反例：订阅位置必须在 `function Panel` 与主 `return h('main'...)` 之间；无会话时按钮只在宿主缺 `newSession` 能力时 disabled。两项都带 `--self-test` 负控。
- **回收自**：factor-vii-deficiency-workbench 面板修复，已同步 starter 模板。

### L150 · BSD sed 不支持 `\b`：跨仓机械改名会静默漏改

- **来源**：glanzmann-thrombasthenia-workbench 2026-11-21 夜班。flare→bleed 机械改名用 `sed -e "s|\bflares\b|bleeds|g"`，macOS BSD sed 把 `\b` 当字面量，`profile().flares` 数据访问点漏改——测试没红（路由键 `flares` 合法保留），探针 E0 才抓到 `reading 'length'`。
- **修法**：机械改名后必须 grep 复核目标 token 归零；数据字段访问点（`profile().X` / `p.X`）与路由键（`data-page` / SUBTITLES.X）分开处理——路由键可保留，数据字段必须随 schema 改名。
- **通用检查**：改字段名后 `grep -rn "profile()\.<old>\|p\.<old>"` 必须为 0。

### L151 · 移植仓的 BOOT 块/探针断言可能残留上上仓身份（两层漂移）

- **来源**：gpp-workbench 的 migrate-public.mjs BOOT 块里是 pericarditis 的 `__PERI_APP__`/CRP picked 表（gpp 自己被 guard 掩盖没炸），GT 移植时再被带上。残留在构建注入块里，check-derivative-leftovers 的静态词表扫不到（符号名不在禁词表）。
- **修法**：移植后 grep 注入块与探针里的 `window.__*_APP__`、picked 表键名，必须与本仓 identity slug 同源；check-derivative-leftovers 建议加规则：BOOT 块内 `__<X>_APP__` 必须匹配 `<slug>_APP__`。
- **回收自**：glanzmann-thrombasthenia-workbench（M5 修复记录）。

### L152 · 「模块占位」是用户红线：设置页每个 tab 都要真链路，检查器必须能扫出来

- **来源**：2026-11-21 用户在真机点「设置 → 文档解析（MinerU）」填 Token，得到 toast「本原型未接入 MinerU，Token 表单为占位」——gpp 时代就把 MinerU 六部件只做成了纯函数（dsh/mineru.js），路由/服务/UI 全没接，还通过了全家族检查链：**检查器只扫"模板占位符"，不扫"功能占位文案"**。
- **修法**：① 六部件全链接通（token 落盘 ~/.gt-workbench/0600 → 状态掩码回显 → 导入登记 → 本机抽取/云解析 → 候选 in_use=0 → 核对入库 + duplicate 进 conflicts）；② check-placeholder-free 新增第二段「UI 功能桩文案」扫描（表单为占位 / 本仓未接入 MinerU / 模块没有开发…），命中即红，降级说明行用 `placeholder-allow` 注释逃生；③ 设置三 tab 的探针断言逐 tab 走真实动作（有 API 形态保存成功回显），不许只看 tab 名存在。
- **回收自**：glanzmann-thrombasthenia-workbench 0.2.0（MinerU 六部件 E2E：本机抽取 3 候选→核对→事实层+1；重复 3 条进 conflicts；云链真实调用 mineru.net 且 401 分类 UNAUTHORIZED）。

### L153 · node:sqlite 与 better-sqlite3 的 API 面差两处：无 db.transaction() 助手、索引列不允许 rowid

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench（CSCC 夜班）——dsh/store.js 用 node:22 内置 `node:sqlite`，`db.transaction(fn)`（better-sqlite3 API）直接 TypeError；0001 迁移里 `CREATE INDEX ... ON entries(profile_key, kind, rowid)` 被 SQLite 拒绝（rowid 不可作索引列），迁移中断导致服务起不来。
- **修法**：① 事务改 `db.exec('BEGIN') / COMMIT / ROLLBACK` 手工包（catch 里 ROLLBACK）；② schema 审一遍「索引列含 rowid」的写法；③ migrate 的 ledger（name+sha256）继续保留——本次缺陷在**任何装机库应用之前**发现，按「前向透明修正」处理：修 0001 + freeze-contract 补记（未发布、无用户库），另开 0002 补充索引；**发布后**一律只加迁移不改历史。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.1（store.test 断言「改坏 hash 必须拒绝开库」）。

### L154 · dev-server 必须按宿主同款「全前缀」挂 API；裸路径只能当 curl 副入口

- **来源**：CSCC 夜班 PR2：页面 fetch 走全前缀 `/api/<slug>/subjects`（与宿主一致），dev-server 却把 handler 挂在根路径 → 404，浏览器侧表现为「创建失败：HTTP 404」，curl 测裸路径却全绿——两形态不同源，静默分叉。
- **修法**：同一 services + 同一 handler 双前缀分发：`url.startsWith('/api/<slug>') → prefix 版 handler；否则裸前缀版`。禁止复制一份业务逻辑给 dev-server。
- **回收自**：squamous-cell-skin-cancer-workbench scripts/dev-server.mjs。

### L155 · mind/情绪类 kind：服务端必填字段（type）必须在 UI 载荷同源携带；「默认私密」必须写进服务端载荷

- **来源**：CSCC 夜班 PR4 两轮返工——感受表单只提交 {mood, detail}，服务端 addEntry 校验 kind=mind 必填 data.type → 400；且本地乐观 push 带 isPrivate:true、服务端载荷没带 → refreshBootstrap 用服务端 is_private=0 覆盖本地，用户看到「没存上」，私密形同虚设。
- **修法**：① UI 组载荷时补 `data.type='feelings'|'behaviors'`；② 「默认私密」在**载荷层**写 `data.isPrivate=true`（本地 push 与 POST 同一对象）；③ 服务端校验失败必须 400 可读（缺字段报字段名），前端失败分支保留表单并 toast，禁止静默。
- **回收自**：squamous-cell-skin-cancer-workbench（PR1–PR4 探针抓到）。

### L156 · 静态服务 MIME 表按扩展名查表要点号统一；宿主 SPA 兜底用 content-type 区分

- **来源**：CSCC server.test 抓到：`types[ext]` 查 `.html` 键传了 `'html'` → index.html 以 octet-stream 下发，宿主 HEAD 探活判「非 text/html」直接把界面判死。
- **修法**：查表前统一 `ext.startsWith('.') ? ext : '.'+ext`；宿主形态 UI 探活 = HEAD 200 且 content-type 含 text/html（SPA 兜底也是 text/html，同族口径：非 text/html 即坏）。
- **回收自**：squamous-cell-skin-cancer-workbench test/server.test.mjs。

### L157 · pack 三件套（public/schema/research）必须在 package.json `files` 里点名

- **来源**：CSCC pack-contents.test：`files` 数组只有 dsh/lib/assets → public/index.html 没进 tgz，装进去就是「服务活着、业务区空白」的静默空库。
- **修法**：`files` 点名 public、schema（迁移要在装机库上跑）、research（快照是临床线的包内事实源）；真打一次包断言清单（pack-contents.test 已随 init 下发，别删）。
- **回收自**：squamous-cell-skin-cancer-workbench（starter check-workbench-package 的源码树规则⑦看不进 tgz）。

### L158 · apply 的 config 是第二个参数：apply(ctx, config)，不写 ctx.config

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench 真机——DSH Desktop HMR 日志 `Error: cannot get property "config" without inject`，插件激活失败、业务区打不开。修复前装机副本已在 profile 里安静地失败（dshHomePath 目录都不生成）。
- **修法**：`export function apply(ctx, config = {})`，从第二参读 `config.root`；behcet dsh/index.js 注释里早有此教训（2026-10-25 家族实测），但写新入口时最容易从零手写再踩。verify-desktop-load 的日志判据能抓到这类激活失败——装机后必跑，不能只信 smoke-activate（桩件环境给得了 config）。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.3。

### L159 · 原型/public 静态资源必须挂版本 cache-busting，否则「标签页开着不刷新」静默停在旧样式

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench——用户标签页从 rc.4 一直开着，`#view=` 都是同文档跳转不重拉 CSS；rc.5 按钮系统、rc.6 keycap、变体钩子全部对用户不可见，直到截图对比才发现（用户以为功能缺失，实际是旧样式缓存）。`#hash` 跳转、bfcache、python http.server 无 Cache-Control 三者叠加，静默分叉无报错。
- **修法**：原型 index.html 的 2 css + 5 js 全挂 `?v=<版本>`；public 由 migrate-public 改写为 `?v=__VERSION_DISPLAY__`（server 注入版本）——**升版即自动失效缓存**。升版固定动作：index.html 的 ?v= 与 VERSION/lib/package 四处同步。参考实现：squamous-cell-skin-cancer-workbench `prototypes/v0.2/index.html` + `scripts/migrate-public.mjs`（CACHE_OLD 白名单规则）。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.8。starter 模板 migrate-public 的同款规则待实施（各自仓资产名不同，按参考实现移植）。

### L160 · 装机 tgz 不含 prototypes/——demo 种子必须读随包副本，否则激活 ENOENT

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench 真机——用户重启 Desktop 后激活失败 `ENOENT .../prototypes/v0.2/demo-data.js`：store 种子从源码树 prototypes/ 读，而 npm files 没打 prototypes/ → 服务路由没注册 → 外壳健康检查 404（用户看到的「服务连接失败 (404)」）。
- **修法**：loadDemoData 读取顺序 public/demo-data.js（migrate-public 逐字节副本，随包）→ prototypes/（源码树兜底）；缺失时抛可读错误。npm files 打 public 即闭环。
- **更深一层**：smoke-activate 桩件在源码树跑，永远抓不到这类；**装机核验必须跑 verify-desktop-load 读宿主日志**。激活失败的两个真凶（ctx.config 误用 / 源码树路径 ENOENT）都是它抓出来的。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.12（装机副本直测 store 打通）。

### L161 · 静态 UI 入口测试必须用外壳真实 iframe URL（含尾斜杠形态）

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench 真机——激活成功、健康检查 200，但业务 iframe 404：外壳 src=`/api/<slug>/ui/`（带尾斜杠），静态处理器只映射了裸 `/ui`，`rel=''` 把 publicDir 当文件。
- **修法**：`/ui`、`/ui/`、`/ui/**` 三态统一落 index.html/子目录；test/server.test 直接用外壳真实入口 URL 断言 200——**测试不造形态，测外壳实际会请求的 URL**。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.13。

### L162 · `String.replace` 替换串里的 `$$` 会变成 `$`——往页面注入代码必须用函数 replacement

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench——真机症状「UI 样式在、**所有按钮全无反应**」，控制台 `$(...).addEventListener is not a function`。自查实锤：组装/注入代码时用 `html.replace(re, '<script>' + 源码 + '</script>')`，replacement 是**字符串**，JS 语义把 `$$` 解释成一个字面 `$` → app.js 里 `function $$(sel, root)`（querySelectorAll）被改写、并顶掉真正的 `$()` → 全局 helper 错位 → 脚本 boot 前抛异常 → 整站未初始化。
- **修法**：凡把源码/配置拼进 HTML 的 `replace`，一律用**函数 replacement**（`html.replace(re, () => code)`）；再加一条组装自检：产物里 `function $$(sel, root)` 的定义与 `$$(` 用法计数必须与源一致，不一致直接抛。
- **顺带纠正一个错误归因（重要，避免传染）**：同一轮我曾把「子资源只到 3 个」判为「宿主 iframe 丢子资源请求」并据此把 public 改成单文件内联。实际是另一处 cache-busting 正则 `[^"]*"` **吃掉了 href 的闭引号** → HTML 属性串错乱 → 后续标签不被解析。**反证：GT 仓用 7 个普通子资源（无查询串）在真机 Desktop 正常渲染（L152 记录）**，家族 69 个兄弟仓也都是多文件形态。结论：宿主不丢子资源；单文件化不是家族必需，已回退为多文件默认。
- **诊断纪律**：「请求数比预期少」先查自己的 HTML 是否被正则改坏（改完 assert 属性串完整），再怀疑宿主；同类归因反转要留反例证据。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.19（多文件回退 + 函数替换 + 组装自检；装机形态同源 http 验证 nav 9 / 导航切换 / 大字 / 档案切换 / 疾病概要面板全通 · 0 pageerror）。
- **已落闸（starter）**：`templates/migrate-public.mjs` 内置三道闸，任何项目 `npm run check`（check-ui-parity 调 `expected()`）都会走到：① `sub()` 函数 replacement + **替换未命中直接抛**；② `assertHtmlIntegrity()`（属性缺闭引号 / 标签内嵌 `<` / script·style 开闭不平衡）；③ `assertCodeIntegrity()`（源里 `$$(` 在产物里必须一个不少）。反向自检：`node scripts/migrate-public.mjs --self-test` 8/8（5 条反例全红）。

### L163 · 「记录少」的演示档案 ≠ 零化验：否则默认档案一打开一图秀/指标卡全空

- **来源**：2026-11-21 squamous-cell-skin-cancer-workbench 用户反馈「一图秀无模拟数据、无效果展现」——A 套（刚确诊）按字面理解做成 `labs: []`，而 A 是默认档案，用户第一次打开看到的就是空态；当时把「零条覆盖」（Q11）错当成「零化验」。
- **修法**：演示档案的「少」要有下限——**≥2 时间点 × ≥2 指标**的基础化验（本仓 A 套补 6 条 WBC/HGB/PLT × 术前/术后），保证一图秀、指标卡、趋势卡有可渲染内容；「零条覆盖」由 docs / symptoms 等**不影响首屏主视图**的空集合承担。图表视觉参考 breast-cancer-workbench v0.4 `chartSVG`（固定画布/网格/日期轴/Catmull-Rom/末点避让/治疗条 lane + 轴外标记）。
- **检查**：store/demo parity 测试断言默认档案化验 ≥4 条且 ≥2 时间点；一图秀数值断言（C1 各序列满格归一化、C2 单点不连线、C4 computed fill=none）只统计 `path.chart-line[data-metric]` 与 `circle.chart-dot[data-metric]`，装饰元素不计入。
- **回收自**：squamous-cell-skin-cancer-workbench 0.2.0-rc.21。

### L164 · 随包资产注释禁裸 `<slug>`、`.gitignore` 模板需内置 `.secrets` 与 `!research/**/*.sqlite`、六道门禁 `--self-test` 参数位置无关化

- **来源**：2026-11-22 vwd-type3-workbench（血管性血友病 3 型，小友宝 VwfPal）全周期实测：
  1. `assets/tokens.healing-paper.css` 头注释写着 `.wb-<slug>`，`init` 整目录原样复制 `assets/` 后，一旦 `package.json` `files` 含 `assets`，`check-placeholder-free.mjs` 即报 `assets/tokens.healing-paper.css: 初始化占位符 <slug>`。
  2. `project-template/.gitignore` 漏写 `.secrets`（致新仓首次跑 `npm run audit` 即报 `✗ mineru/忽略密钥`），且 `*.sqlite` 未豁免 `!research/**/*.sqlite`（易把 M4 临床试验快照 sqlite 漏提交）。
  3. `templates/mineru-cloud-extract.mjs` 第 323 行调用 `readZip(buffer)` 却未顶部 `import { readZip } from '../lib/zip.js'`。
  4. `check-placeholder-free.mjs` 取 `process.argv[2]` 未过滤 `--self-test`，不带 `.` 直接跑 `--self-test` 会把 `--self-test` 当目录报 `ENOENT`；`check-trial-snapshot.mjs` 缺少 `--self-test` 自检分支。
- **修法（已落 starter）**：① `assets/tokens.healing-paper.css` 注释改 `.wb-{slug}` 并更新 `assets/manifest.json` sha256；② `project-template/.gitignore` 内置 `.secrets` 与 `!research/**/*.sqlite`；③ `templates/mineru-cloud-extract.mjs` 补 `import { readZip } from '../lib/zip.js'`；④ `check-placeholder-free.mjs` 过滤 flag 参数，`check-trial-snapshot.mjs` 增补 `--self-test` 坏快照注入自检（坏 sha256 + 条数失配 → 抓出 7 条错误）。
- **回收自**：vwd-type3-workbench 0.1.2。

### L165 · 肿瘤相关骨软化症（TIO）「澄净冷青 Clinical Sage」母题首发、口服中性磷酸盐每日多剂次服药流水与 33 号截图模版

- **来源**：2026-11-22 tio-workbench（肿瘤相关骨软化症，小磷宝 PhosPal，slug: `tio`）全周期实测：
  1. **首发澄净冷青母题（Clinical Sage）**：清冷纸底 `#f4f7f6` + 冷青主色 `#1f5f5b`（对比度 5.36:1 AA），在非肿瘤代谢性骨病（TIO 肾性失磷、低磷骨软化）场景下表现优异，专业感与抚慰感兼备，并通过 WCAG 2.2 AA 校验。
  2. **每日多次分散服药流水**：TIO 患者口服中性磷酸盐（Joulie 溶液）需每日 4–6 次频服以防渗透性腹泻并维持血磷，治疗记录模型需支持剂次流水而非单日一条；副作用（腹泻/腹胀）单列字段，不与剂量混杂。
  3. **33 号规范 10 张实渲截图自动化**：过往工作台需人工改写截屏脚本；本次将标准截屏器收敛为 `templates/capture-shots.mjs`，包含 puppeteer-core 路径自适配、标准 1280×860 2x 分辨率、A/B 档案切换与 10 大关键界面全自动捕获，开箱即用。
- **回收自**：tio-workbench 0.1.0（M0–M6+D1–D4 42/42 单测 · 44/44 audit · 三探针 58/58·10/10·13/13 全绿）。

### L166 · 恶性高热（MH）与神经营养性角膜炎（NK）双轨 6 人小队并行开发、MCP 握手多轮检索合并与底本残留防护

- **来源**：2026-11-22 至 2026-11-23 恶性高热（MH · 小温宝 HeatPal · slug: `mh` · #46）与神经营养性角膜炎（NK · 小角宝 NeuroPal · slug: `nk` · #56）双轨并行实测：
  1. **Swarm 双轨 6 人小队模式**：将 3 人协同扩展为两个 3 人战队（Analyst + Builder + Auditor × 2），在独立工作目录与 GitHub 仓库中全自主推进，实现高并发无冲突。
  2. **unified-trial-mcp 多轮检索合并与排重**：封装标准的 `McpClient`（必须显式发送 `initialize` 握手与 `notifications/initialized`，否则 stdio 管道静默不响应），支持英文标准名、中文病名、关键药物名等多轮检索并按 `recordId` 自动排重，在 MH（87条/46相关）和 NK（91条/77相关）中均实现 100% 对账一次性通过。
  3. **底本移植残留词表防护体系**：新仓复制脚手架后，易在注释、内部变量、副标题及未清脚本中残留往期病种词汇；将 `check-derivative-leftovers.mjs` 模式库扩充至 48+ 条强特征词表（覆盖 TIO/FHL/LSCD/PhosPal/LimbalPal/噬血/角膜缘等），并在构建流程中加入定点移植覆盖校验，根绝串病种风险。
  4. **Task B 原生 AI 面板 12 项契约常态守卫**：保持面板创建走 `newSession`、会话订阅在组件体顶层、按钮状态不依赖真值等关键规则，双仓均实现 12/12 PASS 零代码反工。
- **回收自**：mh-workbench v0.1.0（Issue #99）与 nk-workbench v0.1.0（Issue #100）。

### L167 · NCCN W6 妇科收口（阴道癌/外阴癌）双轨零反工交付：starter 净起、小粉宝一图秀对齐与多模型配额避险

- **来源**：2026-11-23 阴道癌（Vaginal Cancer · 小兰宝 VagiPal · NCCN #58 · Issue #102）与外阴癌（Vulvar Cancer · 小槿宝 VulvaPal · NCCN #59 · Issue #103）双轨 6 人 Swarm 实测：
  1. **用 `xyb-workbench-starter/scripts/init.mjs` 干净起盘（先删 `project.config.json` 未知扩展键再回填）**：相比直接拷贝上一代病种仓，用 `init.mjs` 起盘从根源杜绝跨病种残留——双仓在首次独立审计中 `check-derivative-leftovers.mjs`（58 词表 79 文件 / 46 词表 80 文件）即取得 **0 命中一次过**，全程零反工。
  2. **一图秀全面对齐小粉宝（PinkyPal）曲线与节点契约**：数值曲线采用全期独立归一化 + 单调三次样条/Catmull-Rom `smoothPath` + 白边立体节点；单点样本与分类自评（如 `PELVIC_NRS`、`VULVAR_PAIN_ITCH`、`RT_SKIN_GRADE`）严格只画节点不连线；顶部独立泳道渲染手术菱形虚线与放化疗色带，开关治疗节点开关后数值曲线 `path[d]` 与坐标字节 100% 不变。
  3. **本地 MinerU 解析指南直出权威临床参数**：妇科放疗本地 MinerU JSON（《妇科肿瘤放射治疗管理指南》）可由 Analyst 直接检索核验 OAR D2cc 限量、EQD2（α/β=10/3）、蛙形腿与 Bolus 放疗细节，避免写死未经核验的医学数值。
  4. **Swarm 异构高配额模型分工防 429**：主协调器切换至高配额模型并按角色分层指派（Analyst 用 Hydrogen High、Builder 用 Neon High、Auditor 用 3.8 Flash High），全流程耗时约 48 分钟即完成双仓 M0–M9 全量闭环且零配额中断。
- **回收自**：vaginal-cancer-workbench v0.1.0（Issue #102）与 vulvar-cancer-workbench v0.1.0（Issue #103）。

### L168 · 默克尔细胞癌（MCC）与葡萄膜黑色素瘤（UM）双轨交付：探针命名覆盖、36 号出口段落与私密断言多源校验

- **来源**：2026-11-23 默克尔细胞癌（Merkel Cell Carcinoma · 小默宝 MerkelPal · NCCN #44 / 罕见病 #19 · Issue #105）与葡萄膜黑色素瘤（Uveal Melanoma · 小瞳宝 UveaPal · NCCN #43 · Issue #106）双轨交付实测：
  1. **探针文件命名与包名对齐规则（`check-probe-coverage.mjs`）**：`check-probe-coverage.mjs` 中的 `detectRouteProbes()` 会根据 `package.json` 的包名去除 `-workbench` 后缀探测 `scripts/probe-<slug>-m2.mjs`。若包名为 `merkel-cell-carcinoma-workbench` 或 `uveal-melanoma-workbench`，探针文件名必须匹配 `probe-merkel-cell-carcinoma-m2.mjs` 与 `probe-uveal-melanoma-m2.mjs`（通过软链接 `ln -s probe-mcc-m2.mjs scripts/probe-merkel-cell-carcinoma-m2.mjs` 可同时兼容简写与全名），避免静态门禁报出“未配置全量探针”。
  2. **36 号规范固定出口提取器段落扫描规则（`check-primer-links.mjs`）**：36 号规范 L13 要求“治疗全景段末尾必须有一句固定出口”，其校验提取器仅扫描 `land.intro`、`land.points` 与 `land.groups`。若将固定出口仅放在 `landscape.closing` 对象属性或使用自定义的 `subsections`，提取器不会提取该段文字，导致出现假红。固定出口原话（“不代表任何一项适合你。选哪一个，这一句需要问你的医生。”）必须置于 `points` 或 `groups` 数组中。
  3. **私密记录多源性对探针断言强度的要求**：在验证“私密记录在看板摘要与复诊导出中严格隔离（0 泄露）”时，导出的隔离条数统计包含私密感受（feelings）、门诊准备问题（visitPrep 标记私密）、私密专护日记等多源 bucket。探针不应硬编码写死单一数字（如仅感受的 2 条），而应与 `countPrivateRecords()` 动态计算结果一致，或采用模式匹配断言 `/已自动隔离 [23] 条私密记录/`，确保断言强度的同时避免因档案字段扩充引发假红。
- **回收自**：merkel-cell-carcinoma-workbench v0.1.0（Issue #105）与 uveal-melanoma-workbench v0.1.0（Issue #106）。

### L169 · 基底细胞皮肤癌（BCC）与隆突性皮肤纤维肉瘤（DFSP）双轨交付：双下划线占位符白名单、36号表格结构规范与真实装机事实闭环

- **来源**：2026-11-23 基底细胞皮肤癌（BCC · 小基宝 BasePal · NCCN #45 · Issue #109）与隆突性皮肤纤维肉瘤（DFSP · 小隆宝 FibroPal · NCCN #48 / 罕见病 #22 · Issue #110）双轨交付实测：
  1. **双下划线占位符严格扫描白名单（`check-placeholder-free.mjs`）**：门禁采用 `/__[A-Z][A-Z0-9_]{2,}__/g` 严格扫描发布包全部文件，白名单仅限定为 6 个官方占位符（`__API_BASE__`, `__VERSION__`, `__VERSION_DISPLAY__`, `__BUILD_DATE__`, `__PANEL_LAYOUT__`, `__AGENT_PANE__`）。禁止使用形如 `__PERI_APP__`、`__BCC_APP__`、`__DFSP_APP__` 或 `__DFSP_API_BASE__` 等临时变量命名，代码中一律规范采用标准无包围下划线全局挂载：`window.BCC_APP` / `window.DFSP_APP` 与 `window.BCC_API_BASE` / `window.DFSP_API_BASE`。
  2. **`check-conformance.mjs` 门禁与 `package.json` 串联脚本合规**：一致性审计的 `check/单测` 规则强制要求 `package.json` 的 `scripts.check` 字符串显式匹配 `/--test|node --test/`，因此必须在所有质量门禁尾部串联 `&& node --disable-warning=ExperimentalWarning --test --test-concurrency=1 test/*.test.mjs`；文档集必须严格包含匹配当前日期的 `docs/DEV-REQUIREMENTS-YYYY-MM-DD.md` 以及 `docs/DIFF-MATRIX.md` 和 `docs/DEV-PLAN.md` 才能达成 44/44 满分。
  3. **36 号指南证据表格（`table`）数据结构守卫**：在 `public/primer-data.js` 的 `evidence` 节点中，`table` 字段必须严格遵循 `{ head: [...], rows: [...] }` 对象结构，绝不能写成对象数组 `[{ org, title, status }]`。若格式写错，`primer.js` 内部 `tableHtml` 无法解析导致 `.dp-table` 缺失，会触发 `probe-disease-primer.mjs` P9 断言“可比元素不足（3/4：缺少 .dp-table）”挂起。
  4. **DSH Desktop 宿主环境原生装机与事实证据闭环（M8 落地）**：宿主实际加载路径为 `~/Library/Application Support/dsh-desktop/harness/profiles/web`。装包必须使用 app 自带的 `$DSH_HOME/.desktop-bin/pnpm --dir "$DSH_HOME/profiles/web" add <绝对路径>/release/<包名>.tgz`，并同步在 `dsh.profile.bundles` 中写入包名；运行 `node scripts/verify-desktop-load.mjs` 自动从当前运行日志切片、已安装版本 mtime、`dshHomePath` 数据目录（如 `bcc_workbench.sqlite`）与宿主工作台清单四重事实核验，彻底实现“代码本地全绿 + Desktop 原生加载就绪”的双重闭环。
- **回收自**：basal-cell-carcinoma-workbench v0.1.0（Issue #109）与 dfsp-workbench v0.1.0（Issue #110）。

### L170 · 基底细胞皮肤癌（BCC）与隆突性皮肤纤维肉瘤（DFSP）v0.1.1–v0.1.3 真机返工四连坑：UI 路由前缀漏挂、desktopWorkbenches 服务直挂与空白右栏、bootstrap/demo-data 同源、35 号符合度评分与分母行不可裁

- **来源**：2026-11-23 小基宝（BCC `v0.1.1`–`v0.1.3`）与小隆宝（DFSP `v0.1.1`–`v0.1.3`）真机装机返工实录：
  1. **`dsh/index.js` 漏挂 `'/' + API_PREFIX` UI 静态前缀路由，装机直接白屏**：`v0.1.0` 仅注册了 `kind: 'prefix', path: API_BASE_HOSTED`（`/api/<slug>`）而漏注册 `kind: 'prefix', path: '/' + API_PREFIX`（`/<slug>`）及 `uiReady()` 导出，导致 Desktop iframe 加载 `/<slug>/` 时宿主 404；而此前 `templates/check-route-prefix.mjs` 未入默认 `init` 检查链、`scripts/check-conformance.mjs` 仅查了 `files` 是否含 `public/` 未核对服务端路由。**已回流**：`check-route-prefix.mjs` 增加 M0 兼容跳过与 `--self-test` 并默认串联进 `init.mjs` `npm run check`，`check-conformance.mjs` 新增 `ui/服务端路由` 硬断言。
  2. **原生 AI 面板两大隐形失效——`desktopWorkbenches.service` 误写与 `paneOpen || hasConversation`**：DSH Desktop 渲染进程把 `newSession / ownsSession / currentSession / subscribe` 直接挂在 `host.desktopWorkbenches` 上（非 `.service` 子属性），仅写 `host?.desktopWorkbenches?.service` 会导致真机 `service` 为 `undefined`、「AI 对话」按钮永久禁用；同时 `paneOpen` 初始为 `true` 时若写 `paneVisible = paneOpen || hasConversation`，无会话时右侧 35% 空白面板也会常驻。**已回流**：在 `templates/check-agent-pane-contract.mjs` 新增判据 13（兼容 `|| host?.desktopWorkbenches`）与判据 14（禁止 `paneOpen || hasConversation`）及对应 `--self-test` 反例。
  3. **`demo-data.js` 必须由 `dsh/readmodels.js` 同源生成，并与宿主 `/api/<slug>/bootstrap` 字段严格对齐**：手写 `demo-data.js` 与 `readBootstrap()` 字段结构分叉（如 DFSP `subjects`/`records`/`derived` 结构错配），会导致浏览器原型自跑绿而真机请求 `/bootstrap` 时 `TypeError`/`undefined`。
  4. **35 号临床试验匹配评分方块 `.score` 与分母行 `.denom` 不可因误解禁词而裁掉**：部分 Agent 见 `check-wording.mjs` 提示「禁匹配指数/百分比」后，直接删掉了 35 号 §六 要求的左侧 `.score`（`pct%` +「登记字段符合度」）与 `.denom`（`n / m 项对得上 · k 项待确认`），或把 `'?'` 待确认项混入分母、未在可对照 `< 2` 时置 `pct = null`。**规范澄清**：35 号禁止的是「匹配度/匹配指数/匹配百分比/入选概率」，展示层受控计算「登记字段符合度 `pct%` + `n / m 项对得上` 分母行」为必选项，非禁词。**已回流**：澄清 `templates/check-wording.mjs` 提示文案，收紧 `templates/check-trial-chain.mjs`，并在 `templates/check-trial-matching.mjs` 新增 `T2c`（`trial-match.js` 必含 `pct` 与 `< 2` 守卫、卡片必含「登记字段符合度」与「项对得上」）。
- **回收自**：basal-cell-carcinoma-workbench `v0.1.1`–`v0.1.3`（commits `7f84796`、`ca7c02e`、`0743a7e`）与 dfsp-workbench `v0.1.1`–`v0.1.3`（commits `b341c8a`、`95cf08f`、`49eb4dc`）。

### L171 · Windows 真机接手：17 条哈希假红、init 两处硬崩、装机验收假绿，而"第一天全绿"其实早就不绿了

- **来源**：2026-11-25 Windows 11 + Git for Windows（`core.autocrlf=true`）干净 clone `cc620a5` 实机审计本仓。接手时的真实状态：`npm run check` **fail**（13 条 Asset hash + 4 条 Official snapshot hash + 4 条 Broken local link）、`node scripts/init.mjs` **跨盘直接拒跑 / 同盘 `.toString()` 崩**、全新生成的项目 `npm run check` **4 道门禁红**、`npm test` **58/76**。修后：`npm run check` 通过（265 文件）、`npm test` **82/82**、生成项目 `npm run check` **当日全绿**（SKIP 逐条写明原因）。
  1. **哈希门禁按原始字节算 + 仓库没有 `.gitattributes` = Windows 上全员假红**：`assets/manifest.json` 与 `reference/sources.json` 的 sha256 是按仓库内容（LF）登记的，Git for Windows 默认 `autocrlf=true` 把检出转成 CRLF，字节一变全红。**修法两层**：仓库根加 `.gitattributes`（`* text=auto eol=lf` + 二进制白名单）定死口径；同时把校验和改成"文本按 LF 归一化、二进制按原始字节"（`scripts/lib/portability.mjs` 的 `sha256Of`），让已存在的 CRLF 检出也能正确判定。**只做其中一层不够**：只加 `.gitattributes` 救不了已克隆的工作区，只归一化会在二进制上误判。
  2. **豁免写成 `!p.includes('/reference/')` 在 Windows 上永不生效**：`walk()` 用 `join()` 产出反斜杠路径，`/reference/` 永远匹配不上，于是抄自上游发布仓的官方快照里那些 `../data/categories.json` 跨仓相对链接被当成断链（4 条）。**修法**：判定前先归一成正斜杠（`toPosix`）。教训是通用的：**凡是用字符串片段判断路径归属，必须先归一分隔符**。
  3. **`within()` 只用"relative 结果不以 `..` 开头"判归属，会被跨盘骗过去**：Windows 上 `path.relative('E:\\starter','C:\\Users\\x')` 返回的是**绝对路径** `'C:\\Users\\x'`，既不是空串也不以 `..` 开头 → 判成"在脚手架内" → 目标在 C: 盘、脚手架在 E: 盘时 `init` 直接报「Target must be outside the starter directory」。**修法**：`isAbsolute(rel)` 直接判否。**这类缺陷在 macOS 上永远复现不了**，只能靠平台矩阵或显式反例。
  4. **plan 的表键用 `join()`（反斜杠）、回查用正斜杠字面量 → `undefined.toString()` 崩**：`collect()` 往 `Map` 里塞的是 `assets\manifest.json`，后面 `plan.get('assets/manifest.json')` 拿到 `undefined`，`init` 在 Windows 上**一个文件都写不出来**（只报 `Cannot read properties of undefined (reading 'toString')`，栈还被 `catch` 吞了）。**修法**：所有内部键统一 `toPosix`，并在测试里断言"生成物真的出现了"——只断言退出码会漏掉这类崩。
  5. **"默认检查链第一天就该是绿的"这条承诺早就被 4 道门禁打破**：`check-data-dir` / `check-trial-chain` / `check-patient-create` 在 M0 骨架上把"功能尚未实现"判成缺陷，`check-ui-parity` 更直接 `ENOENT: prototypes/v0.2/style.css` 崩。**修法**：四道门禁各加**阶段感知跳过**（照 `check-route-prefix` 的 M0 范式），条件是"功能面完全不存在"，且 **`--self-test` 必须排在跳过之前**、跳过要打印原因 —— 不许把 SKIP 写成绿，也不许拿"骨架阶段"放行半成品。
  6. **`verify:desktop` / `smoke:activate` 只读 `process.env.HOME`**：Windows 只有 `USERPROFILE`，`HOME` 为空 → `join('','Library/Application Support/…')` 变成相对路径 → `existsSync` 恒假 → "Desktop 真加载"这条唯一闸门**永远 exit 2**。**修法**：`HOME || USERPROFILE`，harness 位置按平台分派（`%APPDATA%\dsh-desktop\harness` / `~/Library/Application Support/…` / `${XDG_CONFIG_HOME:-~/.config}/…`），保留 `HN_HARNESS` 覆盖。
  7. **`probe:artifact` 找不到装机副本时静默回落源码树 = 假绿**：macOS 专有的 profile 路径在 Windows 上恒假，`pkgDir` 就悄悄变成 `PROJECT`（源码树），脚本照样打印"产物服务""页签全 PASS"。这是最危险的一类——**它把"源码树绿"伪装成"装进去的能干活"**。**修法**：找不到装机副本 `exit 2` 并说明"拒绝用源码树冒充"，只有显式传包目录才降级；顺带把默认 `--db` 从 `/tmp/…` 换成 `tmpdir()`（Windows 上 `/tmp` 解析成 `C:\tmp\`，目录不存在即 `SQLITE_CANTOPEN`）。
  8. **测试自身的 POSIX 假设会把产品缺陷藏起来**：`new URL(...).pathname` 在 Windows 给出 `/E:/…`，交给 node 解析成 `E:\E:\…`（两条 self-test 因此失败）；`startsWith(target+'/')`、`/src\/fixture\.js/` 同样只认正斜杠；创建目录符号链接未开开发者模式即 EPERM。**修法**：`fileURLToPath` 取真实路径、比较用 `sep`、正则接受两种分隔符、symlink 用例在无权限时 `t.diagnostic` 跳过并写明原因。**修前 58/76、修后 82/82**——注意基线里那 18 条失败，一大半是这些测试假设在报假警。
  9. **"是否被直接执行"别用字符串拼 `file://`**：`import.meta.url === \`file://${process.argv[1]}\`` 在 Windows 上是 `file:///E:/…` vs `file://E:\…`，永不相等 → `apply-theme` / `migrate-public` 的 CLI 分支整段不执行，**退出码 0、什么都没改**（静默假成功）。**修法**：`pathToFileURL(process.argv[1]).href`；`file://` 导航同理（`file://` + Windows 绝对路径会把盘符当 host）。
  10. **同一文件里判据口径必须自洽**：`check-trial-snapshot` 解析 JSONL 时容忍 `\r?\n`，却对同一份 JSONL 的哈希不容忍 CRLF —— 口径矛盾就是缺陷信号。凡"存哈希 + 存文本"的地方，哈希那一侧必须和解析那一侧用同一套换行口径。
- **不要顺手改的**：`split('/')` / `includes('/xxx/')` 在**路由、URL、包名、HTML 引用**这些本就是正斜杠语义的字符串上是正确的，**不要**为了"跨平台"把它们改成 `sep`——那是把 bug 修成另一个 bug。
- **回收自**：本仓 Windows 真机审计与修复（PR：Windows portability + 首日检查链）。

### L172 · 把"检查链"做成可机读闭环时踩到的七个坑（CHG-002）

- **来源**：2026-11-25 本仓实现 `gates.registry.json` + `scripts/audit-loop.mjs` + 标准索引时的实录。目标是把"一行 23 段 `&&` 拼接"变成"人/Agent 都能判断的三态结论"。
  1. **门禁表必须单一真源**：策展表放 `scripts/lib/gates-table.mjs`，生成器与 `check-starter` 都 import 它。若注册表与策展表各写一份，`audit-loop` 会按**过期集合**执行 —— 表现为"明明有 21 条，只跑了 18 条"，且不报错。断言要写成"注册表 == 策展表"而不是"注册表里字段合法"。
  2. **`--json` 时 stdout 只许有 JSON**：人读摘要一旦混进 stdout，Agent 侧 `JSON.parse` 直接炸；摘要走"非 `--json` 模式"或写文件。这条要用测试反向验证（`JSON.parse(stdout)` 必须成功）。
  3. **`skip` 的判定是"退出码 0 + `^SKIP` 行"，不是"把门禁改成 exit 0"**：`audit-loop` 从 SKIP 行提取 `reason`；门禁若静默 exit 0，会被记成 `pass` —— 那是把"没做"伪装成"做了"。
  4. **幂等的关键是把易变字段挪出 `checks[]`**：`generatedAt`/耗时只进 `meta`；否则同一项目连跑两次 JSON 不同，"结论可复现"就是空话。
  5. **`--out` 必须做 `within(root)` 校验**：`--out ../x.json` 会写到项目外；用 `portability.within` 判，越界 `exit 2`（这既是安全，也是"报告属于本项目"的口径）。
  6. **生成物文档要带 `--check`，且相对链接层级不同**：`docs/STANDARDS/20-GATES.md` 里链 `docs/xxx` 要 `../xxx`、链 `prompts/xxx` 要 `../../prompts/xxx`；一律按 `../` 加前缀会产出 `docs/prompts/...` 死链（本项目 `check-starter` 当场就会报 `Broken local link`）。这正是"生成物必须被门禁覆盖"的实证。
  7. **在脚手架仓里跑 `audit-loop` 会误判成"门禁全坏"**：注册表里的脚本只存在于生成项目（`scripts/check-*.mjs`），脚手架仓对应的是 `templates/`。解法是先判"注册表里有没有任何一个脚本存在"，全都缺就 `exit 2` 并提示"这里不是工作台项目，脚手架自身请用 `npm run check`"，而不是报 21 条 `脚本不存在`。
- **配套纪律**：`npm run check` 的旧链路**不动**，新入口 `npm run audit:loop` 并存 —— 社区既有习惯与 CI 脚本零回归；测试用**假门禁夹具**（三个 10 行脚本）比拿真门禁当被测对象稳得多，且能在任意平台复现。
- **回收自**：`tasks/CHG-002-agent-audit-loop/`（PRD + SPEC + TRACEABILITY）。




### L174 · 改公共仓时把分支推到别人的个人 fork：分支归属必须按"仓库所有权"判，不按"能推上去"判

- **来源**：2026-11-25 批量认领病种工作台时，需要给组织仓 `xyb-openharness-dsh-plugins/.github` 提 BACKLOG 修正 PR。因为 `git clone <org>/.github` 后没有推权限的直觉判断，改用"先 fork 到个人账号再提 PR"的通用套路 —— 而 `gh repo fork` + 直接 `git push` 实际把两条分支写进了**维护者本人的** `hhx465453939/.github`（那是他手动维护的个人仓，不是随手可弃的 fork 副本），并基于它开了两个 PR。
- **教训一：`fork: true` 不等于"这个 fork 是我的临时副本"。** GitHub 的 `fork` 字段只说明它是从别处 fork 出来的；`owner.type` 与仓库的**实际用途**才决定能不能往里推。判断顺序应该是：①我是不是这个 org 的成员且有 push 权（`gh api repos/<org>/<repo> --jq .permissions.push`）→ 有就直接在 org 仓建分支；②只有确实无权限时才 fork，且 fork 前先确认目标个人账号下**没有同名仓库**，有就说明它可能承载人工内容。
- **教训二：`gh pr create --head <user>:<branch>` 会把"分支在哪"这件事藏起来。** PR 一旦从个人 fork 开出来，后续维护者看到的是 `head=someone:branch`，而分支实际落在谁的仓里，只有翻 `headRepositoryOwner` 才知道。批量操作里一旦套错 owner，事故范围会从一个文件扩散到"污染了别人的个人仓库"。
- **教训三：事故的正确收尾不是"删掉分支就完了"。** 本次处理链：①从个人仓把两个 commit **fetch 回来**（`git fetch <fork-url> refs/heads/x:refs/remotes/fork/x`）→ ②原样推到 org 仓自己的分支（commit 内容一字不改，保留可追溯）→ ③在 org 仓重开 PR（#132/#133）→ ④确认旧 PR 因 head 分支被删而自动 CLOSED → ⑤**只**删我加进去的那两条分支，并核对剩余分支数回到事故前的数量（26 → 24，用户原有的一条没动）。少任何一步都会留下"孤儿 PR"或"别人的分支被动过"。
- **教训四：动手前先问一句"这个仓是谁的"。** 本次是主人当场叫停才发现；如果当时是无人值守跑批，错误的分支会在个人仓里躺一整夜。凡涉及 `--repo` / `--head` 指向**非本次任务仓**的操作，先核对 owner 再执行。
- **回收自**：2026-11-25 批量认领流水线（见 `docs/BATCH-CLAIM-SOP.md` 第五节）。
