# 心理支持工作台：注册成功但渲染失败

来源：P01/P02、修复提交 PG02；本次只读核对源码和日志，没有重装或重演旧版。环境记录为 DSH Desktop 0.11.1 / Harness 0.2.0-rc.2 / macOS 15.7.4 arm64 / web profile。日志记录 0.3.11 真实 GUI 验收，当前工作区已是 0.3.13 且有未提交修改，不把后续修改算进 0.3.11 提交。

## 失败证据链

业务面板显示 `Workbench registration requires a client package entry name.`。包名、loader ID、patch name、peers 和 tgz 入口均通过核对；known provider 已留存，说明注册成功。服务端日志没有该错误，而插件临时 ErrorBoundary 在客户端显示英文异常，因此下一步应检查 React 渲染调用，不是继续改包字段。

宿主 `sourcePackage()` 读取 `this.ctx.fiber?.entry?.options?.name`。注册时通过 `ctx.desktopWorkbenches` 访问追踪代理，ctx 绑定到调用方插件；渲染面板的 props.service 却是宿主原始实例，ctx 指向宿主自身。渲染中直接调用 ownsSession，内部身份守卫发现名称是 dsh-desktop-workbenches 而抛错，整页退出。

这解释了为什么“配置正常、列表存在、服务端日志没报错”仍不能证明业务页面正常。不能从错误文案含 registration 就认定错误一定发生在 register。

## 项目实际修复与适用边界

PG02 对 ownsSession 做容错；目标版本出现该异常时按宿主已使用的只读判据 `state.sessionBindings[sessionId] === entry.id` 回退，避免简单 `catch { return false }` 导致历史会话永久丢失归属。

这是特定版本内部状态的兼容处理，不是通用公开合同。新项目优先使用正确调用方上下文的公开服务，集中到适配层，并验证 props.service 与 ctx 服务语义。只有明确核验版本和 state 合同后才启用只读回退，不把旧状态当授权凭据，不写宿主 sessionBindings，不据此绕过服务端 owner 校验。

通用封装应返回 owned / not-owned / unavailable，区分“不是我的会话”和“归属能力报错”。unavailable 显示可重试的诊断，不自动反复新建会话。参考 examples/ownership-adapter.mjs；默认关闭旧版回退。

## 日志记录的验证

修复者用宿主真实 React/ReactDOM + DOM 环境渲染安装副本，故意让 ownsSession 抛相同异常，确认页面仍渲染、历史会话正确出现。随后真实 Desktop 检查角色卡、五个页签、无错误、侧栏未遮挡和会话归属。当前脚手架没有重复这些实机步骤，只为适配示例增加离线故障注入测试。

## 安装过程中的独立问题

1. 源码/tgz 0.3.7 而 profile 仍 0.3.6：诊断代码根本没运行。先比较安装副本/构建文件字节和包版本，再研究业务根因。
2. 同版本 `pnpm add file:` 可能短路，不更新物理产物。发布新包递增版本并核对实际文件 hash，不把 Already up to date 当新版运行证明。新手不使用先删插件的方式碰运气。
3. 当版 pnpm runner 临时隐藏 generation 投影依赖后，pnpm 可能剪掉链接；manifest 恢复未必恢复链接。安装后应做整个 profile 健康检查，关注原有插件是否仍能解析。
4. 日志曾使用官方内部 projection 模块的 exposeMissingGenerationLinks 恢复缺失链接。这是当版修复记录，不放进通用一键脚本；先查当版官方恢复入口，保留配置备份，不手工篡改 manifest 或 app 文件。
5. 该版 CLI 的参数位置、GUI 是否接任意 tgz 是本机探测结论，不直接移植到其它版本。目标 API 的授权使用当版 authority/cookie 合同；不能猜 Bearer/X-DSH-Token。不要把日志中的启动 token 复制到报告或命令示例。

## 开发质量的进一步经验

P02 的 0.3.12 记录指出：SPEC 中每个角色的边界没有进入实际发出的提示词；界面有角色介绍却不能保证模型角色行为。后续将角色 voice/boundary、共享原则、安全限制与组装函数集中于一个可测试模块，构建引用同一源码，残留占位符即失败。角色切换/重发设定有显式入口，已有对话不会自动替换 system prompt。

P02 的 0.3.13 又发现：构建把 prompt 模块注释一起内联，注释中的反例也进入发布产物。检查对象必须包括“最终发出的 prompt”和“安装副本”，不能只看源模块测试。把参考素材中的个人账号、未经确认渠道或不适用内容过滤掉；不把全文参考资料当产品规范。

项目选择小规模 JSON 存储而非强制 SQLite，理由是记录少、以用户确认短文本为主且正文仍由 DSH 管理。启发是按数据量/关系/并发选型；社区通用流程不是“所有工作台都先建复杂数据库”。提供保存上限、原子写入、迁移与导出，规模增长再评估 SQLite。

随包 SKILL.md 是可读任务模板，不代表已安装搜索工具。没有模型联网能力时明确无法核实来源；回顾通过用户复制、编辑、认可后保存，不伪称公开 API 能读取全部会话正文。

## 模型切换如何复盘

用户补充此前 Codex GPT-6-Luna 未解决，改用 DSV4.1 后解决；当前检索的 Git/日志未独立列出模型切换记录，型号/过程按用户说明保留，不从提交反推模型胜负。

值得复制的是：停止重复无新证据的修补 → 取得原始异常 → 确认错误发生阶段 → 查看目标宿主具体调用和上下文 → 最小故障注入复现 → 针对根因修复 → 安装副本/真实 GUI 验证。换 Agent/模型时交接已排除假设、真实运行版本和最短复现，避免下一位重走相同弯路。
