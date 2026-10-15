# 脚手架检查记录

日期：2026-10-15。环境：macOS arm64，Node.js v23.6.1。下列是脚手架离线检查，不是新工作台的 Desktop 实机验收。

## 已完成

- Node 内置 test runner：**10/10 通过**。覆盖 dry-run 不写入、明确布局两种模式、字段与业务缺失拒绝、路径/仓库校验、同名文件冲突零覆盖、目标符号链接拒绝、整套目录迁移后生成、loader 错配与入口缺失检出、用户值安全编码、拒绝额外密钥配置字段。
- 接入事故故障注入：ownsSession 抛目标错误时默认返回 unavailable；特定版本只读回退须明确开启；不同 owner 与显式 false 不被回退覆盖。测试没有连接宿主或改变真实会话。
- 临时合成项目：不安装 npm 依赖即可 `npm run check` 通过；`npm pack --ignore-scripts --json` 实际打包通过，14 个文件，130907 字节。
- 实际 tgz 核对服务/客户端/patch/package/assets 入口；包内文本未发现开发者绝对路径，未携带数据库。合成包仅用于检查并已随临时目录清理，未安装。
- 源规范与 Logo/几何图标 hash、JSON、文档本地链接通过脚手架检查。首次发现 VALIDATION 文件尚未生成的缺失链接，补齐后复验通过。
- 文本扫描无真实格式的 sk- 长密钥匹配；无从原项目复制 Token、真实会话或患者文件。此扫描是辅助检查，不声称覆盖所有秘密类型。

机器可读结果见 [validation-results.json](validation-results.json)。合成包 SHA-256：`92d5a3d2146f9e2e26bb8ebb72116337b25d9d9a7de58fc7cd0e4b2972a8a63c`。

## 未验证

- 未把示例工作台安装到 DSH Desktop；未操作真实用户资料/会话，未修改两个业务项目及 Desktop 代码。
- 当前骨架只实现认证健康接口/注册/版本展示，业务功能仍须按新项目 spec 实现；并不具备小胰宝全部七页功能。
- 未重复心理支持项目日志中的真实 GUI/React DOM 验收；引用的是原开发记录和修复提交。
- 未验证本骨架目标 Desktop 的服务签名、实际加载、会话、customFrame，以及 Windows/Linux。
- 未验证云解析/MCP/搜索/定时任务/独立安装器和任何市场投稿；尚未以真实浏览器截图验收离线交互示例。
- Logo 再分发许可、自有材料公开许可证由社区发布前确认。

## 交付边界

无第三方 npm 依赖指初始化和校验工具；实际工作台运行需要 DSH Desktop/宿主 peers。原绝对路径只出现在来源索引用于审计，不是运行依赖；生成包中移除了资产元数据的本机路径。复制脚手架不等于已确认业务或通过上线验收。

## 1.1.0：Git 与 CLI 验收

本机已通过 npm link 激活 dsh-wb-cli，实际 PATH 命令返回 1.1.0，doctor 确认 Git/Node/npm 与应用目录可见（不据此认定 Desktop 已接入）。npm run check 通过，全部 15 项测试通过；新增 Git 本地 bare 远端的 dry-run/快进同步、脏树拒绝/分叉拒绝、prepare 配置无覆盖、来源标记纳入预检查、实际 tgz 与生命周期脚本拒绝测试。

测试曾实际捕获 npm 10.9.2 的 --ignore-scripts 仍运行 prepare；已改为 pack 前拒绝 prepack/prepare/postpack，回归通过。CLI sync 只更新脚手架源码，不更新已有业务项目；本轮最初验收时尚无用户指定的脚手架远端，未对外推送。当前平台仍仅 macOS arm64，未安装新业务包至 Desktop。

2026-10-16 补充：用户确认独立仓库 `xyb-openharness-dsh-plugins/xyb-workbench-starter`；初次 ls-remote 成功且无现有分支。已补齐 README/CLI 指南和 package repository。远端同步以 Git 提交与 upstream 对照结果为准。
