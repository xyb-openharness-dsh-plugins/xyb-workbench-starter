# 事实来源与优先级

官方包与运行合同以官网当前版为准；目标版本能力以实际类型/帮助/UI为准。已确认需求与原型是业务合同；历史日志只能解释经过，不能覆盖当前事实。

本次官网获取于 2026-10-15：10-09 版本。旧本地副本 09-29；差异包括主动选布局、容器宽度与同机重启边界。在线 Markdown 浏览工具不支持其 content-type，使用限时 HTTP 下载核验原文。

## 来源索引

| ID | 资料 | 采样状态 | SHA-256 前12位 |
| --- | --- | --- | --- |
| O01 | [官网完整离线快照](../reference/official/development-2026-10-09.md) | 官网快照 | `751fcd5a7f48` |
| O02 | workbench-standard.zh.md | Git已追踪 | `d648e9d22275` |
| D01 | V3-TAB-IMPLEMENTATION-STRATEGY.md | 本地未提交设计文件 | `dab979e83ef9` |
| D02 | V3-REBUILD-PARITY-STATUS.md | 本地未提交设计文件 | `6139e7067a7c` |
| D03 | V3-FEATURE-INVENTORY.md | 本地未提交设计文件 | `8926ea330995` |
| D04 | UI-DESIGN.md | 本地未提交设计文件 | `f2807945eaaf` |
| D05 | DESKTOP-ADAPTATION-1.2.2.md | 本地未提交设计文件 | `ecedda2a9f98` |
| D06 | AGENT-QUERY-DESIGN.md | 本地未提交设计文件 | `322a014d17ab` |
| D07 | IMPLEMENTATION-QUEUE.md | 本地未提交设计文件 | `08ad492131ef` |
| D08 | REPORT-GENERATION-DESIGN.md | 本地未提交设计文件 | `5768f06de433` |
| D09 | DATA-SCHEMA-DESIGN.md | 本地未提交设计文件 | `0cdb5cea28ba` |
| D10 | SCHEMA-REVIEW-2026-10-13.md | 本地未提交设计文件 | `673e228ba941` |
| D11 | DEV-LOG.md | 本地未提交设计文件 | `29b1f2558995` |
| D12 | WORKBENCH-DEVELOPMENT-WITH-CODEX.md | Git已追踪 | `71c3592c7191` |

## Git 证据

| ID | commit | 记录 |
| --- | --- | --- |
| G01 | [11e9f4a](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench/commit/11e9f4af864ecaa4cbe693956f61aec9821a3de2) | Initial 0.1.15 release of Xiao Yi Bao workbench |
| G02 | [cea34a3](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench/commit/cea34a32fad92eb779a9f9e70bc1fb40c4cc7ac7) | release: xiaoyibao workbench 0.1.22 |
| G03 | [10951fb](https://github.com/xyb-openharness-dsh-plugins/xyb-workbench/commit/10951fbfb31ee9d85833fbbc39486905f2f2b0dd) | Improve clinical indicator flip charts |

完整原路径、完整 hash、抓取时间、dirty/tracked 状态见 [reference/sources.json](../reference/sources.json)。绝对路径只用于追溯，脚手架不依赖这些原路径运行。

本地未提交文档不能用某个 Git tag 代表其精确内容，本次以 hash 记录。未复制完整聊天日志/患者资料/有效凭据；用户近期明确“测试 OK”的证据仅用于本轮指标折线图。无法确认的根因按可能原因描述。

历史指南 D12 中 injector 示意和 65/35 普适化内容已在本脚手架纠正；社区旧实现仍可能有草稿覆盖、自动任务未接等缺口，不能当成通用模板的已完成功能。

## 心理支持项目补充来源

项目：cancer-psych-support-workbench，远端身份 xyb-openharness-dsh-plugins/xiaoxinbao-workbench。只读检查，其原有未提交修改保留。

| ID | 资料 | 证据边界 |
| --- | --- | --- |
| P01 | docs/DSH-Desktop-集成问题与修复经验.md | 当前工作区有更新；含 0.3.11 根因和 GUI 验收记录 |
| P02 | docs/开发日志.md | 当前工作区有更新；含 0.3.12–0.3.13，不能当作已提交 |
| P03 | SPEC.md | 角色/边界/工作流程合同 |
| P04 | docs/WB-技能与记忆方案.md | 技能说明、轻量 JSON 存储与用户认可 |
| P05 | src/prompt.mjs | 当前未提交模块，角色合同与组装逻辑 |
| PG01 | 2418411 | 初始提交 |
| PG02 | 38eed31 | 修复 service/fiber 渲染期异常，文档与真实 GUI 记录 |
| PG03 | 437ae31 | 补 0.3.11 日志与截图打包排除 |

用户本次描述“GPT-6-Luna 未解决，DSV4.1 后解决”，模型切换未在所检索日志中单独确认，按用户提供的过程信息记录；不据此推出通用模型排名。完整 hash、dirty 状态和提交 URL 同样见 reference/sources.json。

O03：官网市场验收规范（2026-09-29 版），本次同步取得 [离线快照](../reference/official/market-acceptance-2026-09-29.md)。仅用户选择公开投稿时适用，区别于本地开发。
