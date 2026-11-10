# 新手保姆级启动提示词 v1.0（不用懂流程，整段复制即可）

> 给谁用：第一次接触小 X 宝工作台、没听过 M0–M9 / 闸口 / 分流的人。
> 用法：整段复制，只改 1 个空（病种），发给 AI，之后它问什么你答什么。
> 专家版与无人值守夜班请用 [FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md)；本文件只负责"把人安全带到能开始"，
> 判据细节一律指向权威文档，不在这里重写，避免两处打架。

---

## 一、30 秒用法

1. 复制下面「整段复制」框里的全部内容
2. 把 `【病种】` 改成你要做的病（例：多发性骨髓瘤）
3. 发给 AI（Claude / ZCode / 任意能跑命令的会话）
4. 它最多问你 1 个问题（服务谁），其余自己处理；你不用填路径、不用懂命令
5. 中途想看进度：说「汇报进度」

## 二、整段复制 ↓

```text
你是小 X 宝家族的患者工作台开发者，本次带一位新手完成【病种】患者工作台。请用"保姆模式"执行：每一步先用人话说明你要做什么、为什么，再动手；不要一次抛出大量术语或整屏代码。

【只问一次】
开工前只问我一个问题，其余全部按默认执行、最后汇总告诉我：
"这个工作台主要服务谁？比如：刚确诊的患者 / 长期随访的患者 / 家属。"
我说"你定"或答不出，就按"患者与家属，覆盖确诊到随访"继续，并把默认值写进报告。

【路径你自己解决，不要让我填】
1) 自动定位本机下载目录，不要写死我的用户名：
   macOS/Linux：先看 $XDG_DOWNLOAD_DIR；再看 ~/.config/user-dirs.dirs 里的 XDG_DOWNLOAD_DIR（值里的 $HOME 要展开）；
   再依次探测 ~/Downloads、~/下载、~/downloads；都没有就新建 ~/Downloads。确认可写，并把解析结果打印一行给我看。
   Windows：(New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path；失败则 $env:USERPROFILE\Downloads。
   注意：Windows 分支未在 macOS 环境实测——解析失败就停下来报错说明，不要静默猜路径或写到别处。
2) 在该目录下固定两个位置（slug = 病种英文小写连字符）：
   脚手架 <下载目录>/xyb-workbench-starter
   项目   <下载目录>/<slug>-workbench
   配置   <下载目录>/<slug>-workbench-config/project.config.json
3) 装脚手架（已存在就 git -C <…> pull --ff-only，不重复克隆）：
   git clone https://github.com/xyb-openharness-dsh-plugins/xyb-workbench-starter.git <下载目录>/xyb-workbench-starter
4) 生成项目（配置自己从模板复制后填，不要问我格式）：
   cp <脚手架>/project.config.example.json <配置>
   node <脚手架>/bin/dsh-wb-cli.mjs init <项目目录> --config <配置>
   若项目里已有 docs/PROGRESS.md，说明是续跑：不要重建、不要重复 init。
5) 生成后立刻补一处配置（不补的话装进桌面后看不到资料目录）：
   cordis.patch.yml 里加
     config:
       root: !!js dshHomePath('<slug>')

【规则从哪读，别凭记忆】
开工先按顺序读这 5 份公开文档，冲突时以第一份为准：
1 https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/main/prompts/FULL-CYCLE-KICKOFF.md
2 https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/main/prompts/PATIENT-WORKBENCH-IMPLEMENTATION-STANDARD.md
3 https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/main/prompts/WORKBENCH-DEV-CHECKLIST.md
4 https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/xyb-workbench-starter/main/AGENTS.md
5 https://raw.githubusercontent.com/xyb-openharness-dsh-plugins/.github/main/BACKLOG.md

【节奏】
白天有人在旁边：每完成一个阶段停下来，用 5 行话告诉我——做了什么 / 关键文件 / 测到的数字 / 还缺什么 / 下一步，等我说"继续"再往下。
夜里 23:00–08:00：不用等我，按文档自己推进，到点就收尾写报告。

【三个必须亲手验证给我看的地方（历史上最容易"看着做好了其实没有"）】
A 首页疾病介绍：顶栏"?"点开必须是整页（不是小弹窗），四段齐全且顺序为 定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势；Esc 与浏览器返回键只关一层；关掉后回到原来的滚动位置。
  验证命令必须指向我们自己的页面，不能指向脚手架的示例页（这是踩过的坑）：
  node scripts/probe-disease-primer.mjs --url http://127.0.0.1:<端口>/prototypes/v0.2/index.html
B 首页第一屏：什么都不输入就有内容；两套示例档案能切换（一套刚确诊记录少、一套长期随访记录多），切换后数据不串档。
C AI 对话：点"AI 对话"能开、能关、能拖宽。没有会话时创建一个：service.newSession(workspaceId)，工作区取 service.defaultWorkspace?.()?.workspaceId；
  不要用 Boolean(conversation) 判断有没有会话（宿主即使没会话也会给一个隐藏容器），也不要调 ensureSession({})；
  我取消选目录后不要留下空会话；创建失败要在界面上告诉我原因，不能点了没反应；草稿只填进输入框，不许自动发送。

【不要做的事】
不要装到 ~/.dsh 或 DeepSeek Harness（只装本机 DSH Desktop）；不要发布到 GitHub Release 或市场；不要把真实病历与照片放进演示数据；不要把"没测"写成"通过"。

【结束时给我一份人话报告，固定六段】
1 做到哪一步了（一句话）
2 我怎么打开看（一句话 + 文件路径）
3 哪些是自动检查过的、哪些还没验证（必须分开写）
4 需要我决定什么（最多 3 条）
5 花了多久（token 拿不到就写未取得）
6 有没有出错、你怎么处理的

【最后一道】
交付前按这两份自查并修复，修完重跑同一套：
· prompts/FAMILY-INSPECTOR.md（全量体检，严重问题必须清零）
· prompts/USER-ACCEPTANCE-AUTOFIX.md（验收 + 自动修复）
并把踩到的通用坑回流进 starter 的 docs/LESSONS.md 与 CHANGELOG。
```

## 三、你的三步验收（完全不用懂技术）

1. 在项目目录里双击 `prototypes/v0.2/index.html`，点右上角「?」——能弹出整页四段介绍 = 通过
2. 点左上角头像换一套档案，页面数字跟着全变 = 通过
3. 看 AI 报告第 3 段：「未验证」应为空，或写明原因；如果写着"全部通过"而你没看到证据，让它补证据

## 四、出问题怎么办

- **提示额度 / 鉴权 / 套餐错误**：让它同一处最多重试 2 次，仍失败就停下写原因，别整夜空转
- **说找不到 DSH Desktop**：先装 <https://www.dshdesktop.com/> 并启动一次，再让它继续
- **想白天做**：把【节奏】那段改成"每阶段等我确认"，其余不动
- **它开始一次抛很多代码**：回一句「用保姆模式，先说明再动手，一次一步」

## 五、这份提示词与其它文档的关系

| 你想做什么 | 用哪份 |
| --- | --- |
| 第一次做，不熟流程 | 本文件 |
| 已经熟悉，要无人值守跑 M0–M9 | [FULL-CYCLE-KICKOFF](FULL-CYCLE-KICKOFF.md) |
| 要从癌种名走到可运行开发版的完整五阶段 | [ZERO-TO-DEV](ZERO-TO-DEV.md) |
| 查某条要求怎么验 | [WORKBENCH-DEV-CHECKLIST](WORKBENCH-DEV-CHECKLIST.md) |
| 交付前体检 / 用户验收 | [FAMILY-INSPECTOR](FAMILY-INSPECTOR.md) / [USER-ACCEPTANCE-AUTOFIX](USER-ACCEPTANCE-AUTOFIX.md) |

> 本文件只做"新手起步卡"，不新增判据。任何与本文件不一致之处，以 FULL-CYCLE-KICKOFF 与检查点清单为准。
