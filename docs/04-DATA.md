# 数据模型支持长期前端调整

## 分离稳定事实与易变布局

实体/关系不是 Tab。业务主体、输入资料、解析候选、已确认事实、计划、Agent 任务/结果、收藏、输出文件分别建模。看板、详情与时间轴读同一个事实源；不复制三份数值到三张页面专属表。

最小关系例子：`subject → document → candidate → confirmed_fact`；`subject → observation(metric_definition)`；`subject → schedule → reminder`；`agent_task → input_snapshot → result → artifact`。结果可引用事实/文档/来源数据版本。会话引用是宿主对象的业务关联，不复制 DSH owner 数据作为自己真相。

## 新增指标不一定改表

用 `metric_definition(code,label,value_type,unit_family,category,validation,version)` 定义目录，`observation(subject_id,metric_code,value_num,value_text,unit_code,occurred_at,source_ref,review_state)` 保存记录。增加常规指标只加定义和映射；增加全新关系、检索索引、约束或不同语义才走递增迁移。结构化核心字段与有限扩展字段并用，不把所有关系塞进 JSON。

小量、弱关系的用户确认短文本可用结构化 JSON（心理支持项目案例），须有上限、原子写入、并发策略与迁移。关系查询、时间序列或记录增长时可选 SQLite。用事务、外键、稳定 ID、revision、索引和 migration ledger；迁移前备份，从真实旧库 fixture 验证升级，不通过删库“兼容”。UI 布局每周改动不应触发 schema 修改。读模型显式版本，兼容期由已安装客户端与迁移策略决定，不照抄固定“两周期”。

## 本地目录示例

```text
用户选择的业务资料根/
  workspace.sqlite
  input/YYYY/MM/<document-id>/original.pdf
  input/YYYY/MM/<document-id>/parsed.md
  output/YYYY/MM/<task-or-snapshot-id>/report.pdf
  manifests/                 # 来源/种子数据与输出登记
  backups/                   # 备份策略另定
```

时间轴/分类由数据库元数据组织，不依赖中文目录名推断业务。存相对路径、mime、大小、hash、创建时间、所属主体与来源 ID；文件读取做根目录边界检查。输入原件、可重算解析和正式输出分开。备份 SQLite 时用 SQLite backup/VACUUM INTO 或一致性快照，不能运行中只拷 db 漏掉 WAL。

## 单一事实与失效快照

普通事实变更后，各页重新读取同一读模型。规则分析、临床匹配、报告属于冻结快照：保留当时输入、规则/模板/数据版本，事实变化后标“需重新分析”，不静默改历史结论。预约完成不自动变成“已发生治疗”医学事实。

演示数据带 `demo_id`/manifest，只清单内精确 ID 可清理；不按“患者名像 sam”或删除整个资料目录来清理。正式初始化去除 demo，不把已有用户记录当试验数据。

## 接口与错误

接口约定 ID、时间/时区、单位、确认状态、分页和错误码。数据新增后验证首页、趋势、导出读数一致。配置写入采用原子替换并保留未知键；密钥配置写入与业务数据分开，不回显实际内容。输入 CSV 的本地解析不能假装成云 OCR；类型、编码、日期、单位错误可定位重试。
