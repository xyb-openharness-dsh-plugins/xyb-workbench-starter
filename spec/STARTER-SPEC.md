# 社区 Workbench 脚手架规格

## 目标与范围

为社区新手与开发 Agent 提供可复制、按需阅读的工作台开发流程，覆盖互动需求确认、UI 共创、数据建模、实现、测试修复、宿主部署和交付。经验以通用规则和典型错误组织，省略原业务项目身份和版本演进。

## 交付结构

AGENTS 为短规则入口；docs 为分主题指南；templates 为需求、规格、UI、数据、任务、验收、发布与故障记录结构；prompts 为互动设计和开发交接入口；assets 为可替换素材及语义 token；project-template 为接入骨架；scripts/CLI 提供无覆盖初始化、检查、打包与 Git 同步。官方快照和第三方引用保留来源。

## 开发流程

整体推进顺序与签认闸口见 [docs/22-PHASES-AND-GATES](../docs/22-PHASES-AND-GATES.md)（三阶段×三闸口速查；详细规则见 docs/17）。要点：G1 业务 → G2 HTML → G3 数据模型，三道闸口顺序不可跳、逐个留痕；G3 未过不建表。

1. 检查现状并继承已明确需求，模板就绪后通过互动完成填写。
2. 选择实际可用的 UI 专用技能，可结合 Taste Seed；完成原型、预览和开发者确认。
3. 建立功能树/PARITY、数据/API 与宿主能力矩阵；比较 JSON、SQLite 和可选记忆方案。
4. 按接入基线、共享组件、完整业务单元实现，测试与修复成组推进。
5. 检查实际包与目标安装副本，在 Desktop 操作核心流程并记录限制。
6. 更新验收、README 和交接，按授权提交、推送或发布。

## 技术与分发约束

初始化和社区静态检查只依赖 Node 内置模块，不依赖原机器路径或专属技能。实际业务包仍依赖宿主及项目声明的运行条件。初始化不覆盖现有文件；Git 同步只更新脚手架，不覆盖已生成项目。安装、加载、业务可用和外部服务成功分别验证。

记忆层是可选能力，业务事实保持权威来源；记录失效、删除传播与离线降级。宿主上下文、安装副本、提示词产物和生命周期脚本问题统一纳入 docs/LESSONS.md。

## 验收

- 新目录可读取全部规范，初始化后包含设计流程、模板和提示词。
- 缺业务信息时通过互动补齐；已确认模块才作为实现合同。
- 路径/输入非法或目标冲突时拒绝生成，不部分覆盖。
- 文档链接、JSON、素材和官方快照 hash 一致。
- 静态检查不替代 Desktop 或外部能力实测。
- 文档避免业务案例身份与个人绝对路径，保留必要的来源、署名和版本适用边界。

当前检查记录见 docs/VALIDATION.md；CLI 行为与验证见 spec/CLI-SPEC.md。

## 1.2.0 增补

- 目录持久化/Agent协作项目采用 docs/09-WORKBENCH-STATUS.md 的独立状态合同和真实判据；examples提供无依赖参考，不能把示例存在当接入完成。
- 工作台市场发布采用 docs/10-MARKET-PUBLISHING.md：官方依据、安装来源、人工清单、YAML、市场PR命令和审核/上架判断；用户指定版本的手工确认只补变化或失败项，不默认重复电脑自动化。
- init复制上述文档、模板、提示词和示例；README、CHANGELOG、CLI与溯源marker的版本一致。已认可的项目复盘见docs/11-REUSABLE-PATTERNS.md；新增经验先审阅再纳入。
- 本机更新必须交付到实际安装版本；UI渐进披露和外部信息可信度原则分别进入设计/API/验收合同，并在不同业务主题中复用。
- POI需求按docs/12-AMAP-POI.md选用高德能力，提供归一化示例、配置/范围/坐标与验证模板，不引入通用必需地图依赖或真实凭据。

## 1.7.0 增补

- **部署目标只有一台**（docs/37）：工作台只装进本机 **DSH Desktop**（`io.dsh.desktop`）自己的 `harness/profiles/*`；`~/.dsh/profiles/*`（`dsh` CLI 侧）与 **DeepSeek Harness**（`com.deepseek.dsh`）都不是目标，装上去不算交付。
- **跨平台**：这是 GitHub 项目，macOS / Windows / Linux 都要能用。位置由 `scripts/check-install.mjs` 现场探测（macOS 实测；Windows / Linux 按 Electron 安装与 userData 约定列探测点，未在真机实测，如实标注），文档不要求使用者背单个平台的路径；装机命令按平台分开写（PowerShell 不认 `export`）。
- 机器上没装 DSH Desktop 时**停下**并给出 <https://www.dshdesktop.com/>，装完启动一次再继续；不先开发后补装，不拿 dev server 或别的 Harness 顶替。
- 判据由 `scripts/check-install.mjs`（随 `init` 下发）回答"装没装 / 登记到哪个 profile"；`npm run audit` 的 `deploy/装机脚本`、`deploy/AGENTS` 两条只查这条规则是否还在（fail 不交付），不替代真机装机。
