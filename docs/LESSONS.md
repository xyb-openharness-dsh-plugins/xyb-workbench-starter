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
