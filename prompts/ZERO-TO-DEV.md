# 从一个癌种名到可运行开发版：一次性交付提示词 v1.0

> 用法：把下面整段（从「你是」到结尾）连同「癌种 / 目标目录 / 样板仓库路径」三个填空一起发给一次新会话。  
> 它是 2026-10 食管癌（EsopPal）那一轮实际跑通的路径复述，按顺序执行、按闸口停。

---

你是小 X 宝家族的患者工作台开发者。本次任务：为一个新癌种 **从 0 走到「开发版骨架可用」**，  
不是只出设计稿，也不是只写代码。癌种＝【填癌种】，目标目录＝【填 ~/Downloads/xxx-workbench】，  
样板基准＝【填上一版已发版的工作台，默认 gastric-workbench v0.1.0】。

## 0. 先做三件事，别急着写代码

1. 读样板仓库的 `docs/DEV-REQUIREMENTS-*.md`、`schema/`、`dsh/`、`public/`、`test/`、`scripts/`，  
   把它的**结构**当模板，把它的**业务内容**全部丢掉。
2. 用一句话说清本癌种「只有它才成立」的第一决策点（食管癌＝病理类型 + 部位分段决定治疗路径；  
   胃癌＝标志物 + 切除方式决定进食；FSHD＝无药可治 → 生活与并发症预防）。这句话决定导航树。
3. 列出你认为需要澄清的遗漏项（**先给清单，再执行**；不要停下来等确认，除非缺的是"服务谁"）。

## 1. 调研与差异化（防"换名癌种"）

- 沿十条疾病轴推导患者高价值场景：确诊路径 / 分型分期 / 治疗路径与切换 / 症状与功能 /  
  营养与进食 / 心理与家庭 / 复查随访 / 第二原发与并发症 / 临床研究 / 费用与资源。  
  每条写成「触发 → 动作 → 产物」，落到场景/模块/字段/交互/验收五层；**提到一次 ≠ 覆盖**。
- 产出 `docs/DIFF-MATRIX.md`：与样板癌种逐项对比，写清哪几块是**刻意不同**（例：食管癌有独立的  
  「吞咽与进食通路」+「营养支持」两页，与胃癌"不设营养支持页"刻意相反，不许统一掉）。
- 医学边界写死：只整理信息，不做诊断/分期判读/疗效评价/处置建议；试验"登记 ≠ 有效 ≠ 可入组"；  
  用户看法记 `viewpoint` 并标"不是医生结论"。

## 2. schema（先冻结，再写数据）

- `schema/0001_initial.sql`：档案级 + 指标 3 张 + 通用 8 张 + 本癌种专属 N 张；四契约必须落地：  
  ① 看法恒不为结论（无 `is_conclusion`）；② 四点位 1–4 点、缺健侧不生成差值（NULL ≠ 0）；  
  ③ 更正只新增版本（路径切换新增行不覆盖）；④ 事实四层（文档/候选/记录/指标）不合并。
- **冻结**后立刻写 `schema/freeze-contract.md`（sha256），此后改结构只能新增 `0002_*.sql`（ALTER 追加）。
- 三个必踩的坑，建表时当场避开：
  - `using` 是 SQLite 保留字 → 列名用 `in_use`；
  - 每一节 `{title, rows}` 都必须有对应的 `*_title` 列 —— 漏一个，读模型还原时 title 变 null，parity 当场红  
    （食管癌就是漏了 `dilation_title` / `access_events_title`，只能补 0002）；
  - 分类指标 `dec IS NULL` 且 `kind ∈ {grade, qual}`，数值指标 `kind='numeric'`、`band` 两列同空才写 NULL。

## 3. 演示数据：只有一个来源

- `demo/build-demo-data.mjs` 同时产出 `demo/demo-data.sqlite` 与 `prototypes/v0.2/demo-data.js`；  
  被 import 时只返回 `buildDemoProfiles()` 的纯数据，**一个字节都不碰磁盘**。
- 2 套档案 × 6 个月窗口；化验/体征每 2–4 周一点并延续到今天，影像/内镜按真实频率不加密；  
  真实登记摘录单独一张 `trials`，状态一律"未登记核实"。
- 形状纪律：`events`=`[日期,名称]`、`docs`=`[id,名称,日期,类型,状态]`、`candidates`=`[id,名称,值,来源,状态]`  
  —— **定长数组，不是对象**。生成器里组装用的中间量（如 `extraMetrics`）必须在 `assemble()` 里解构掉，  
  否则快照多一个键，读模型（只有 `metrics`）的 parity 断言永远过不去。
- 所有 INSERT 写**显式列名 + 显式问号数**，禁止位置式 `VALUES (?,?,…)`（胃癌那轮连续 6 次列数不匹配）。
- 写完跑 `node scripts/check-demo-columns.mjs`：它把 `schema/00*.sql` **全部执行**进内存库，再和生成的  
  sqlite 逐表比列名/顺序/类型/主键（只跑 0001 会漏掉后续迁移追加的列）。

## 4. 原型（G2，先让人看见）

- 目录 `prototypes/v0.2/`，`file://` 直接可开，四件套 `index.html / style.css / app.js / demo-data.js`，无构建。
- 视觉沿用家族骨架，只换 3 个品牌变量（`--violet / --violet-soft / --violet-deep`）+ 品牌字 + 英文名；  
  正文 12.5px（大字档 15px），`--tz` 倍率写在 `calc()` 里，固定高卡片写 `calc(Hpx * var(--tz))`。
- 必查的四个显性件：
  1. **每个一级页的二级页签与内容必须一一对应**（穷举 `(view, sub)`，同 sub 内容不得重复）；
  2. **首页右上角 AI 对话按钮**能开、能收起、能调宽（窄/标准/宽 + 拖到底），× 只收起不结束会话；
  3. **一图秀严格照原型**：画布 980×420 左右、单调三次插值、末点标签按 y 排序强制 13px 间距+右端左锚定、  
     事件竖虚线止于数据区上沿；分类序列（如吞咽六档）**只画节点不连线**，数值线才连线；
  4. **3D 指标卡**：整卡 180° 翻转、双面 `backface-visibility:hidden`、背面是迷你折线（不是文字重复），  
     分类记录 `data-static` 不翻不连线。
- 页脚必须贴底（`.work-area{min-height:calc(100vh - 32px)}` + `.work-grid{flex:1}`），空态页最容易露馅。
- 无头实测脚本必须做：33 个页签穷举（**不能一次性抓完按钮再点**，render() 会重建 DOM）、  
  `aria-selected` 与内容指纹比对（剥离公共区再比）、`body.scrollWidth === innerWidth`、  
  控制台 0 error、0 个 4xx。

## 5. 开发版（六步移植，别重写）

1. `dsh/store.js`（开库/迁移/关库，`:memory:` 用于测试）、`dsh/server.js`（`/api/bootstrap` + 静态 + 路径穿越拦截）、  
   `dsh/workbench.js`、`dsh/index.js`（`API_PREFIX='<癌种>'`，`DB_FILE='xyb-<癌种>.sqlite'`）。
2. `dsh/demo.js`：把 `buildDemoProfiles()` 写进用户资料目录的库；幂等（有 subjects 就整批跳过）、单事务、失败整体回滚。
3. `dsh/readmodels.js`：把行还原成 **demo-data.js 的同一形状**（parity 是这一层唯一的验收标准）。  
   有 `ord` 按 `ord`，`events` 按 `rowid`；复合主键表裸 `SELECT` 会按索引字母序返回，必须 `ORDER BY rowid`；  
   `kind !== 'numeric'` 才还原 `kind`；分类指标原型里没有 `unit` 键，就不能补 `unit:null`。
4. `public/`：`index.html`（三段式顶栏 + `#agent-splitter`/`#agent-hide`/`#agent-label` + `noindex` + 内联 favicon）、  
   `style.css`（原型 + 只改字号三处 + `[hidden]{display:none!important}`）、`shell.css`、`app.js`。  
   `app.js` 的迁移方式：**复制原型 → 定点替换**（数据加载、AI 五态、宽度、版本、启动异步化），不要手抄。  
   数据走 `apiBase()` + `${apiBase}/api/bootstrap`（`apiBase` 不含 `/api`；宿主下页面在 `/api/<癌种>/ui/`，  
   独立启动是空串，曾兜底成 `/api` 导致整页 404）；失败且有 `window.DEMO_DATA` 可回退，都没有就渲染错误页不白屏。  
   AI 面板 = 五态 `idle/connecting/open/closed/unavailable`，宽度比例只在 `lib/layout.js` 一份，localStorage 记忆。
5. `scripts/`：`dev-server.mjs`、`build-version.mjs`、`check-{syntax,schema,wording,version,install}.mjs`、  
   `check-demo-columns.mjs`；`npm run check` 串成一条链，任一失败不许提交。
6. `test/`：`store.test.mjs`（迁移幂等/播种幂等/**parity**）、`server.test.mjs`、`ui-parity.test.mjs`  
   （11 视图 × 2 档案 × 每页签**逐字符**与原型一致 + index.html 的 id 齐全 + style.css 只差字号 +  
   顶栏三段式/五态/宽度 + `lib/layout.js` 与 `dsh/index.js` 前缀同源）。  
   `BASE_STATE` 用开发版字段名（`agentPhase`/`agentRatio`），sel 与本癌种默认一致；  
   看板哨兵文案换成本癌种独有的一句，别留样板的。

## 6. 发版前必须跑通的验收

```
npm run build:version      # VERSION 唯一来源，lib/version.js 是生成物
npm run check              # 版本→语法→冻结合同→文案红线→列一致性→单测→版本一致→包结构
npm run pack:check         # 包内容，不发布
npm start -- --workspace <用户选的目录>   # 再用无头浏览器实测一轮
```

- 文案红线：禁「建议治疗 / 可能复发 / 可以停药 / 无需就医 / 推荐方案 / 治愈率 / 生存率」；  
  免责句放否定语境，或在词表行末标 `wording-allow`（自检清单本身要出现这些词）。
- 装机只认官方栈：`npm pack` 的 tgz 要装到 **dsh-desktop** profile，不是 web；自检看  
  `package.json` 的 `dsh.profile.bundles`、`state.json` 的 added/pinned、harness.log 有无 import failed；  
  别用 `curl` 判断装没装上（外部直连会拿 401/403）。
- 每条"未验证"就写"未验证"：P2（装机可见性）没实机跑过，不许写"装机通过"。

## 7. 交付清单（缺一项就算没完成）

```
schema/0001_initial.sql + freeze-contract.md   (+ 后续 000N)
demo/build-demo-data.mjs + demo/demo-data.sqlite
prototypes/v0.2/{index.html,style.css,app.js,demo-data.js}
dsh/{index,server,store,workbench,demo,readmodels}.js
lib/{client,layout,version}.js
public/{index.html,style.css,shell.css,app.js}
scripts/{dev-server,build-version,check-*}.mjs
test/{store,server,ui-parity}.test.mjs
docs/{SPEC,DEV-REQUIREMENTS,DIFF-MATRIX,CLINICAL-DATA}.md
README.md / CHANGELOG.md / VERSION / package.json
```

## 8. 禁止事项

- 不许用样板癌种的业务字段"换个名字"当本癌种模块；差异化必须在 `DIFF-MATRIX.md` 里有据。
- 不许出现第二个数据源（原型不能单独改 `demo-data.js`，开发版不能另建 seed 脚本）。
- 不许为了让测试变绿去改断言、改哈希、改历史迁移。
- 不许在没有实机验证时宣布"可发布"；不许用未核实的药企招募文案当机制依据。
- 不许自建聊天框代替宿主会话；缺位时走剪贴板/提示词回退，并在按钮说明里写清降级原因。

## 9. 汇报方式

每完成一个阶段，用 5 行内说清：**做了什么 / 关键文件 / 实测数字 / 仍缺什么 / 下一步**。  
不要中途抛大段代码，不要在没跑测试时说"已完成"。最后给一条可复现的启动命令 + 一张关键页截图。
