# 批量认领与交付 SOP（第一批复盘，2026-11-25）

> 用途：把"一次认领 3 个病种、端到端交付 M0–M2"的流水线固化下来，下一批直接照抄，少踩坑。
> 适用：《86 个罕见病病种诊疗指南（2025 年版）》/ NCCN 目录里仍标 `⬜ 招募中` 的病种。
> 已交付样板：`rett-workbench`（#72）、`fap-workbench`（#155）、`fragile-x-workbench`（#164）、`choroideremia-workbench`（#63）。

## 〇 难度排序（从易到难，实测经验）

| 档 | 判据 | 代表病种 |
|---|---|---|
| **易** | GeneReviews / Orphanet 有完整条目；数据轴 ≤4；家长可观察行为为主，不必依赖精密量表 | FAP、脆性 X、无脉络膜症、Leber 先天性黑矇、早产儿视网膜病 |
| **中** | 多系统但每个系统有独立可记录项；有明确随访节律 | 阿拉杰里、Bardet-Biedl、MEN、Gorlin、胱氨酸贮积症、先天性胆道闭锁、CDKL5、PIK3CA |
| **难** | 证据稀少 / 表型高度异质 / 需要量表或电生理细节；家长难以自述 | Lennox-Gastaut、West 综合征、sJIA、PPHN、BRBN、单基因肥胖、FOP、神经节苷脂贮积症 |

> 选批策略：**一批 3 个，尽量同档**，便于复用同一套原型结构与文档模板。

## 一 认领（每病种 4 步，可脚本化）

```powershell
# 1) 提认领 Issue（模板 01 的字段，直接 --body-file）
gh issue create --repo xyb-openharness-dsh-plugins/.github `
  --title "[认领] <病种名>（罕见病 #<编号> · T2 · 罕见病线）" `
  --label claim --label triage --body-file <md>
# 2) /claim + 指派 + claimed 标
gh issue comment <num> --repo … --body "/claim"
gh issue edit <num> --repo … --add-label claimed --add-assignee hhx465453939
# 3) 建私有孵化仓（家族惯例：private）
gh repo create xyb-openharness-dsh-plugins/<slug>-workbench --private --description "<desc>"
# 4) scaffold init（283 文件）
node scripts/init.mjs --config <cfg.json> --target <路径>
```

**坑 1：`gh repo create` 之后 `size=0`** —— 只是 GitHub 还没算完，不代表空仓；用 `contents/prototypes/...` 或 commits 核对，别当失败重推。

**坑 2：门禁版本漂移** —— 新项目从 `main` 生成时，若脚手架有未合并的门禁修复，会把老 bug 带进每个新项目。u1 批实测：`check-patient-create` 用裸词表判"功能面是否存在"，项目 description 含「患者…档案」就被判红。
→ **认领后立即把脚手架 `fix/*` 分支上已修好的门禁同步到新项目 `scripts/`**，或先把修复合进 main 再生成。

## 二 开发（子 agent 端到端，一人一病种）

派单提示词必须写死这些**硬要求**，否则一定漏：

1. **13 个交付物清单**（USER-RESEARCH / BRIEF / SCENARIOS / DIFF-MATRIX / SPEC / PRIMER-DRAFT / SOURCES-LEDGER / index.html / demo-data.js / primer-data.js / PROTOTYPE-REVIEW / MILESTONE-EVIDENCE / ACCEPTANCE + README 四段）。
2. **DIFF-MATRIX ≥3 条**，并**直接给出该病种的三条差异建议**（不给建议，子 agent 会写通用废话）。
3. **原型必备件**：单文件 `file://` 可开、`import=0`/`fetch=0`/无外链、5 页签、指标卡固定高度 3D 翻面、一图秀、整页视图（history 双入口）、**全局设置（主题 ≥2 套 + 大字 + 减少动效）**、版本 chip、两套档案。
4. **primer-data 的 L13 陷阱**：治疗全景段除 `exit` 外**必须**有 `points` 数组，含排序口径 + 「不代表任何一项适合你」「需要问你的医生」；否则 L13 红。用 `original:false` + `secondaryUrl` 表示未取得原件，**不许塞 `kind:fulltext` 冒充原件**（L8 会抓）。
5. **禁止改 `scripts/` 变绿** —— 门禁红就改数据/文档。
6. **自检三条命令**必须贴真实输出：`npm run check`、`npm run audit:loop`、`node scripts/check-primer-links.mjs`。
7. **浏览器层**：本机有 Chrome，`--headless=new --dump-dom` 至少证明 JS 执行；能跑 CDP 断言更好，报断言数。

**坑 3：主题切换最容易被漏** —— 第一批 3 个里 2 个漏了。必须在派单里单独加粗列出。

**坑 4：PROTOTYPE-REVIEW 会留着模板** —— 子 agent 容易只写别的文档，最后交上来 1037 B 的模板原文。验收时按**文件大小**先筛（<2500 B = 可疑模板）。

**坑 5：MILESTONE-EVIDENCE 常常没人写** —— 按纪律应由**验收方**补写（证据产生者 ≠ 检查者，L114），别指望开发方。

## 三 验收（lead 亲自跑，不信自报）

```powershell
foreach($p in <projects>){
  cd <ws>\$p
  npm run check            # 期望 exit 0；有 ✗ 就逐条看
  npm run audit:loop       # 期望 0 fail
  node scripts/check-primer-links.mjs   # 期望 0 失败
}
```

**脱敏扫描别用 Select-String 默认大小写不敏感**：
- `-Pattern '/home/[a-z]'` 会命中键盘键名 `/Home/End` → 假阳性；加 `-CaseSensitive` 或换更严的锚点。
- 禁词扫描会命中**"规则原文"**（文档里写"禁词：建议治疗/…"）→ 这是假阳性；真正的判据是 `check-wording` 只扫**患者可见文案**。

## 四 提交与推送（两种模式，别混）

| 场景 | 做法 |
|---|---|
| **新仓，无并发 agent** | `git init` → `remote add` → `add -A` → `commit -F` → `push -u origin main` |
| **已有仓 / 多人并行** | **显式列文件** `git add -- <files>`，禁用 `git add -A` |

**坑 6：`spawnSync(..., {shell:true})` 跑 git 凭据 helper 会失败** —— `!f() { … }; f` 是 POSIX shell 语法，经 `cmd.exe` 转发时 env 展开出错，push 静默 exit 1、输出还是乱码。
→ 推送一律走 PowerShell 直调：`& git -c http.sslBackend=openssl -c http.proxy=… -c credential.helper='!f() {...}; f' push`，并把 `GH_TOKEN` 先 `$env:GH_TOKEN = (gh auth token)`。

**坑 7：`git commit` 偶发 `index.lock` 残留** —— 报 "another git process seems to be running"。确认无进程后 `Remove-Item .git\index.lock -Force` 再重试；`init` 后分支名可能是 `master`，用 `git branch -M main` 统一。

## 五 登记 BACKLOG（一批一个 PR）

- 只改**主表**（`# | 疾病 | 页 | 级别 | 状态 | 招募对象`，6 列）；`§D 罕见病 R3 名录`这类**波次名册没有状态列，不要动**。
- 状态写法统一：`🟡 设计中（YYYY-MM-DD 认领 · Issue #N 的完整 Markdown 链接 · 仓 <slug>（私有孵化）· **G1/G2 未签**，v0.1 调研+原型已交）`（Issue 链接直接照抄仓库地址，不要写占位文本，否则会被断链检查当成失效本地链接）。
- 改完必须校验列数（`split('|').length - 2 === 6`），否则表格会错位。
- **`.github` 改动的分支必须推在 org 仓自己的分支上**（`xyb-openharness-dsh-plugins/.github`），**不要推到任何人的个人 fork**（本批踩过：误推到 `hhx465453939/.github`，虽已清理但属事故，见 L174）。

## 六 每批收尾必做

1. 三台证据文件齐（含**未验证清单**：V2 真加载 / V3 业务闭环 / 家族探针 / 打包装机 / 医学核对）。
2. 三台 `git status` 干净、已 push、远端 commit 可查。
3. BACKLOG 批量 PR 已开。
4. 新踩的坑写进本文件 + `docs/LESSONS.md`。
