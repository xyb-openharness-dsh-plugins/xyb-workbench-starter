# 数据主体—关系—表

| 实体 | 稳定 ID | 主体/外键 | 核心字段/类型 | 约束/索引 | 来源/确认 | 生命周期 |
| --- | --- | --- | --- | --- | --- | --- |
| subject | ... | ... | ... | ... | ... | ... |
| document | ... | subject | relative_path/hash/mime | ... | original | ... |
| observation | ... | subject/metric_definition | time/value/unit | ... | candidate/confirmed | ... |
| artifact | ... | task/snapshot | relative_path/hash/format | ... | template version | ... |

实体图：...
扩展策略：定义目录新增 vs 结构迁移的边界；核心关系不塞入任意 JSON。
迁移 ledger/旧库 fixture/备份/事务/回滚兼容：...
数据根选择、相对路径校验、公共数据和私人数据分离：...
统一读模型与跨页一致性验收：...
