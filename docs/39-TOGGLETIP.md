# 39 · 说明浮窗（toggletip / rich tooltip）：把长解释从正文里拿出来

> 来源：2026-10-28 小炎宝（aosd-workbench）G2 反馈——「文字堆积感很重；多文字整合可以用悬浮或者点击浮窗信息方式，toggletip，richtooltip，减少文字堆积。这个方式，作为精简页面内容设计，可以沉淀入脚手架。」
> 适用范围：所有患者/照护者工作台。目标是把「解释为什么这样设计」的长句从主阅读路径移走，但**不隐藏阻断性信息**。

## 1. 什么时候用

| 内容 | 放哪 | 理由 |
| --- | --- | --- |
| 主任务、当前状态、数据值、错误、隐私排除、急症退出 | **正文常显** | 用户必须不点就看得到 |
| 字段口径、为什么这样画、规范出处、示例说明 | toggletip（点击 ⓘ） | 低频、解释性、想知道时才看 |
| 术语的一行定义 | rich tooltip（悬停/聚焦） | 不打断阅读 |
| 多个条件/长名单 | `<details>` 折叠列表 | 比浮窗更适合长列表与键盘操作 |

红线：**不能用浮窗藏**「这条记录是私密的」「文件会发送到云端」「工具不能判断急症」「未核对」「登记状态未核实」这类安全/隐私信息。

## 2. 交互合同

1. 触发器是原生 `<button type="button">`，可见文字 `ⓘ`，`aria-expanded` 与 `aria-controls` 指向浮窗；可访问名称写清主题（如「为什么最多 4 条」说明）。
2. 点击切换；点击外部或按 Esc 关闭；同一时间只开一个。
3. 浮窗 `role="dialog"`（有标题与正文）或 `role="tooltip"`（纯文本、悬停即现）；两者都不要抢焦点，除非内含可操作元素。
4. 浮窗宽度 `min(300px, 72vw)`，使用项目纸色/描边/阴影令牌；不写死颜色。
5. 内容最多 2–3 句 + 一行出处；超出就改 `<details>`，不要塞长名单。
6. 打印时浮窗不参与排版（`display:none`），正文保持可读。

## 3. 参考实现（项目内可直接粘贴）

```js
function tip(title, body, source) {
  const id = 'tip-' + Math.abs((title + body).split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))
  return `<span class="tip-wrap"><button type="button" class="tip-btn" aria-expanded="false" aria-controls="${id}" data-tip-toggle="${id}" aria-label="${title}说明">ⓘ</button>
    <span class="tip-panel" id="${id}" role="dialog" aria-label="${title}" hidden>
      <b>${title}</b><span>${body}</span>${source ? `<i>${source}</i>` : ''}
    </span></span>`
}
```

CSS 要点：`.tip-wrap{position:relative;display:inline-flex}`、`.tip-panel{position:absolute;left:0;top:calc(100% + 6px);z-index:60}`、`.tip-panel[hidden]{display:none}`；关闭时把 `aria-expanded` 复位。

## 4. 验收

- T1：正文中不再出现「为什么…」类解释长句；对应内容在浮窗里且出处完整。
- T2：键盘 Tab 到 ⓘ、Enter/Space 打开、Esc 关闭、焦点不被浮窗劫持。
- T3：390px 下浮窗不横向溢出、不遮挡关闭路径。
- T4：安全/隐私/急症/未核对信息仍在正文常显（人工核对，脚本不替代）。
- T5：打印输出不含浮窗文本。

## 5. 与现有规范的关系

- 03 号设计系统：浮窗属于「渐进披露」，但不能用于阻断错误或必要确认。
- 36 号疾病概要：来源与「未取得原件」仍写在正文来源栏，不塞进浮窗。
- 22 号闸口：G2 走查时按 T1–T5 抽查，不以「有浮窗」代替内容检查。