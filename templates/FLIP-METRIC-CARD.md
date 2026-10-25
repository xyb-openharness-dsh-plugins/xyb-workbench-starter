# 模版：3D 翻转指标系列卡（从 neurofibromatosis-workbench v0.1 回收）

## 何时用
指标天然分系列（疼痛/生命体征/生长/瘤体测量/听力…）、每系列要"一眼看到当前值 + 点开看最近记录与来源"的患者工作台。与 32 号折叠卡并列；窄形态卡片单列，宽形态 auto-fill minmax(190px,1fr)。

## 结构
- 卡墙按 `group_title` 分组渲染（有序：读模型 ORDER BY rowid）。
- 卡片 `role="button" tabindex="0" aria-pressed`，点击/Enter 翻转（rotateY 180°，backface-visibility: hidden，正反两面各一 .face）。
- 正面：系列名 + 当前值（.at(-1)）+ 单位 + 迷你 sparkline（可选）。
- 背面：最近 3 条记录（日期+值）+ 来源语境栏（source_title/source_version，未核实显式「未核实」）。
- `@media (prefers-reduced-motion: reduce)` 关闭 transition，直接切换。

## 红线
- 只渲染 kind='numeric' 的数值；分类/等值字段不进卡片趋势位。
- 背面来源栏必填（语境栏规则）；无记录如实显示"（无记录）"，不外推。
- 演示数据唯一源：卡片全部读 demo-data/读模型，不在视图层硬编码。

## 验收
- 收/翻两态截图；键盘 Enter 可翻；reduce-motion 下无动画；23/24/27 号指标卡口径对照。
