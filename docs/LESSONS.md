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

## 2026-10-25 · 从神经纤维瘤病小纤宝 FibroPal（neurofibromatosis-workbench v0.1.2）回收

- **L26/L27 见上表**（真机 boot 的 ctx.config 未注入；files 漏 schema/）。**待实施⑤（下轮进检查器）**：`check-workbench-package` 增加——① `dsh/*.js` 出现 `ctx.config` 且对应 `apply(ctx` 无第二参 → 报错；② 存在 `dsh/store.js`（读 `../schema`）而 package.json files 缺 `schema` → 报错。
- **可复用结构（templates 挂钩）**：`templates/FLIP-METRIC-CARD.md`——分系列有序指标卡墙 + 正面当前值/背面最近记录与来源的 3D 翻转卡（含 reduce-motion 降级与键盘 Enter 支持），与 32 号折叠卡并列的第二个"原型即模版"结构；`prompts/ZERO-TO-DEV.md` 已在功能线清单挂引用。
- **流程规则**：自动领取前必须按 issues 搜索确认无人正在做（本轮 PF-ILD/地贫/儿童急淋均已被认领，BACKLOG 未认领池 ≠ issues 现实）；判读词黑名单在 NF 语境追加"恶变/癌变风险提示、遗传概率建议"两类（仅静态来源引用豁免）。
- **待实施⑥（既有失败，2026-10-25 实测）**：starter `npm test` 中 "ships the desktop-load verifier" 在本机失败——`verify-desktop-load.mjs` 在找不到 DSH Desktop harness 目录时直接抛「找不到…harness 目录」，没走到「界面加载核验」可读结论分支（test/starter.test.mjs:59 期望 `/界面加载核验/`）。该失败早于本次 NF 回流（stash 验证过），按不修绿纪律只登记不擅改。
