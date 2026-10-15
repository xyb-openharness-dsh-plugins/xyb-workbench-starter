# Git 分发与 CLI 激活规格 v1.1

用户意图：通过 Git 同步脚手架，用 dsh-wb-cli init 初始化/激活社区开发流程。授权本地实现与验证；远端仓库待用户指定，不推断旧业务仓库为脚手架远端。

链路：Git clone → npm link 本地激活 → doctor → init --prepare 或已有 config → init --dry-run → init → 按 spec 开发/check/pack → 按宿主规则安装。后续 CLI sync 只做干净克隆的 git pull --ff-only，不覆盖生成项目，不 stash/reset，不自动执行构建或安装脚本。

CLI 无第三方依赖。init 复用既有生成器，保留需求确认和无覆盖行为；生成项目记录脚手架版本/commit/dirty 状态。doctor 只读且有超时，不探测/管理运行进程。pack 先拒绝存在 prepack/prepare/postpack 的项目（本机 npm 忽略脚本标志未阻止 prepare），检查后调用 npm pack --ignore-scripts；需要 build 时由项目显式执行。没有通用 Desktop install 实现，不把模板生成声称为应用安装。

验收：本地激活后命令可用；init 默认或显式 config 可生成；prepare 不覆盖；既有冲突不写；生成来源可追溯；sync 对脏树/无 upstream 拒绝，干净跟踪分支能 fast-forward，分叉不能强制合并；原有测试继续通过。平台目标为 Node 22+，本轮实测 macOS arm64；Windows/Linux 记录为未验证。

完成记录：1.1.0 已在本机激活，doctor 与 PATH 命令可用；npm run check 和全部 15 项测试通过。包括真实本地 Git 同步与分叉拒绝、实际 tarball、prepare 行为故障及防护。远端待用户指定，未推送、未装新业务包到 Desktop。
