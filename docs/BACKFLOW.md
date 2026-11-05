# M9 经验收敛 · 回流清单（2026-11-06 夜班，软骨发育不全）

## 已执行（回流 commit 清单）

| # | 去向 | 内容 | 类型 | 受益方 |
| --- | --- | --- | --- | --- |
| 1 | starter templates/check-host-contract.mjs | customFrame 断言先剥注释行（本轮实测：build 头注释让断言读出「true · 业务 left 0.65」假红） | **可断言**（check-starter 过） | 下一轮所有新仓 |
| 2 | starter docs/LESSONS.md L61 | 演示数据业务 id 档案内唯一 → 代理 PK + doc_id/cand_id/surg_id（本轮两修 schema） | 文档+parity 测试范式 | 新仓 schema 设计 |
| 3 | starter docs/LESSONS.md L62 | `const DATA` 让 api 态静默退演示态（catch 吞 TypeError）→ let + warn | 文档（附带双形态实测闸口建议） | M5 移植 |
| 4 | starter docs/LESSONS.md L63 | 「从源码抠值」断言先剥注释（通用规则） | 文档 | 全部检查器 |
| 5 | starter CHANGELOG 1.10.0-rc.15 | 记来源仓与内容；版本升 prerelease | 簿记 | — |
| 6 | starter 自检 | check-starter pass（217 files）+ tests 67/67 | 证据 | — |

## 检查器待实施清单（追加；谁能断言谁写）

1. probe-one-chart 本仓已覆盖 C1–C6/C4 路径断言（probe-ach-m2），家族级 `templates/probe-one-chart.mjs` 仍待抽象（对照小粉宝口径：getBBox 高度比、翻转 rect 四值、matrix3d 前缀）。
2. probe-panel（40 号 7–14）：本仓断言了 DOM 顺序与 25–45 键盘步进（Q31/Q18），container 759px 折叠行为待补。
3. documents/candidates/surgeries 业务 id 作用域断言：schema 检查器可加「业务 id 列必须 UNIQUE(profile_key, id) 且代理主键存在」（可直接写成 check，下一轮实现）。
4. apiBase 双形态探针：把本次浏览器双态实测（api 横幅 vs 离线横幅）固化成 templates/probe-dual-mode.mjs。

## 项目内沉淀

- DEV-REQUIREMENTS-2026-11-06.md（10 条硬约束全部带验证命令）；docs/inspector/2026-11-06-M2.md（独立评审轮）。
