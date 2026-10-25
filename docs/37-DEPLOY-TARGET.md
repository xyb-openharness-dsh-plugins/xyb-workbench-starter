# 37 部署目标：只有 DSH Desktop 一台

> 一句话：开发出来的工作台**只装进本机 DSH Desktop（`io.dsh.desktop`）自己的 Harness profile**。
> `~/.dsh` 与 `DeepSeek Harness.app` 都不是目标，装上去不算交付。
> 没装 Desktop 就停下来，把 <https://www.dshdesktop.com/> 给用户。

这条要求是 2026-10-26 用户点名加的，属**最高优先级**：它排在"怎么写代码"之前，因为
**宿主找错，后面全白做**——页面能开、`npm run check` 全绿、tgz 也打出来了，但用户在
Desktop 的列表里根本看不到这台工作台。

## 1. 为什么值得单列一条

装错宿主不会报错，只会"安静地没效果"，且三种表现各不相同：

| 表现 | 真因 |
| --- | --- |
| 市场/工作台列表里没有这一台 | 装进了 Desktop 不读的 Harness（`~/.dsh`） |
| 列表里有，但点开是旧版 | 装的是另一个 profile，或同一 profile 里旧 tgz 没被替换 |
| 市场里不显示"已安装"、也没有 app 内卸载 | 手工/native 装法，没有市场安装记录 |

三种都不是"再装一次就好"，都得先确认目标。所以把它做成规则，而不是某次踩坑的记录。

## 2. 本机实证（2026-10-26 实测）

| 对象 | 标识 | 版本 | 数据 / profile 位置 | 是不是目标 |
| --- | --- | --- | --- | --- |
| **DSH Desktop.app** | `io.dsh.desktop` | 0.12.0 | `~/Library/Application Support/dsh-desktop/harness/profiles/web` | **✅ 唯一目标** |
| `dsh` CLI | nvm 全局 bin | 0.1.0-rc.6 | `~/.dsh/profiles/{desktop,tui,web}` | ❌ Desktop 不读 |
| DeepSeek Harness.app | `com.deepseek.dsh` | 0.2.1-rc.2 | 未实测（另一款 app，不共享 profile） | ❌ 不是目标 |

三条探测命令（只读，不写盘）：

```bash
ls -d "/Applications/DSH Desktop.app"
ls -d "$HOME/Library/Application Support/dsh-desktop/harness/profiles"
node scripts/check-install.mjs          # 本包是否已登记到 Desktop 实际加载的 profile
```

## 3. 判据：不按目录名猜

**profile 名不是判据**——本机活动 profile 恰好叫 `web`，但那是宿主配置的结果，不是约定；
`~/.dsh/profiles/web` 同名却完全不是同一个地方（这正是最容易骗过人的一处）。

三条硬判据（缺一即"没装上"）：

1. 目标 profile 的 `package.json` → `dependencies` 里有本包，值是 `file:<绝对路径>.tgz`；
2. 同一文件的 `dsh.profile.bundles` 数组里有本包名；
3. 重启宿主后 `harness/desktop-workbenches/state.json` 有 added/pinned 记录、`harness.log` 无本包报错。

**怎么装**（pnpm 版本、`DSH_HOME`、`bundles` 两处改）只看 [06-VALIDATION-AND-RELEASE.md](06-VALIDATION-AND-RELEASE.md)「安装到正确 Desktop」——那里是手法的唯一来源，本文不复制命令。

## 4. 没装 DSH Desktop 怎么办

1. **停下**，不要开始装机，也不要写"已验证"。
2. 告诉用户去 <https://www.dshdesktop.com/> 下载安装，装完**至少启动一次**（首次启动才会生成 Harness 目录与 `state.json`）。
3. 回来重跑 `node scripts/check-install.mjs`，读到"已登记"再继续。

三种"顶替"一律不接受，因为它们都只在开发语境里看着像成功：

- 起了 dev server、页面能开 → 那是源码树，不是宿主；
- 装进 `~/.dsh` → CLI 侧 Harness，Desktop 不读；
- 装进 DeepSeek Harness.app → 另一款 app，profile 不共享。

## 5. 机器执行

`node scripts/check-install.mjs`（`init` 随项目下发）只做**只读核对**，三种结论：

| 输出 | 含义 | 退出码 |
| --- | --- | --- |
| 找不到 DSH Desktop | 没装，或没启动过 | 1（并打印下载地址） |
| 找到 Desktop 但依赖/bundles 缺一项 | 装了不加载 | 1 |
| 已登记 + 市场记录 | 装机成立 | 0 |

`npm run audit` 里有两条对应检查：`deploy/装机脚本`（脚本还在、且仍认 DSH Desktop 为唯一目标）、
`deploy/AGENTS`（项目 `AGENTS.md` 保留本节规则与下载地址）。**fail 不交付。**

## 6. 明确未做 / 未验证

- **Windows 路径未实测**：脚本按 Electron `userData` 约定推 `%APPDATA%/dsh-desktop/harness`，本机只验了 macOS。
- **DeepSeek Harness.app 的 profile 位置未实测**：只知道"不是 DSH Desktop 的目标"，不猜它读哪。
- 存量 20+ 工作台若装在了错的地方，本文不回填；**下一轮动到那台时按本节重新核对**。
