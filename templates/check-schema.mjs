#!/usr/bin/env node
/* 判读列断言 + schema 冻结合同（模板，2026-11-13 从 myeloma-workbench 升级；原版 2026-11-05 从 takayasu 回收，L59）
 *
 * 为什么升级：原版只读 schema/0001_initial.sql，只查「判读列 + 表数 ≥15 + 0001 的哈希」。
 * 实测踩到三个漏网：① 0002 及以后的迁移完全没查，改了历史迁移也只报 0001 那条；
 * ② 不查 PRAGMA user_version，两边的库版本号对不上也没人发现；
 * ③ 不查 is_private / in_use / 分节 *_title 这些家族契约列，「私密三出口」少一列照样绿。
 *
 * 判据（每条都要能 FAIL）：
 *   C1 命名 NNNN_[a-z0-9_]+.sql，序号从 0001 起连续
 *   C2 每个迁移末条语句是 PRAGMA user_version = N; 且 N 与序号一致
 *   C3 所有迁移能在内存库顺序建成
 *   C4 每个迁移的 sha256 都出现在 schema/freeze-contract.md
 *   C5 无判读列（diagnosis / risk_level / activity_score / progression_status / response_grade / prognosis_class / severity_grade / frailty_class 等）
 *   C6 可装个人记录的表都带 is_private
 *   C7 存在 in_use 与分节 *_title；缺测不用 '' 冒充
 *
 * 用法：
 *   node scripts/check-schema.mjs [项目根] [--json] [--self-test]
 *   --json      输出一行 JSON（老调用方兼容）
 *   --self-test 注入 risk_level 列，闸门必须报 FAIL
 *
 * 接入：复制进项目 scripts/check-schema.mjs 并挂进 check 链（package.json scripts.check 追加）。
 * 没有 schema/ 目录时按 SKIP 退出 0（M0 第一天不该因为还没建库就红）。
 */
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')
const SELF_TEST = args.includes('--self-test')
const target = resolve(args.find((a) => !a.startsWith('--')) || ROOT)
const SCHEMA_DIR = join(target, 'schema')

if (!existsSync(SCHEMA_DIR)) {
  JSON_OUT ? console.log(JSON.stringify({ check: 'schema', skip: 'no schema dir yet' }))
    : console.log('✓ schema 冻结合同：没有 schema/ 目录（M0 阶段，SKIP）')
  process.exit(0)
}

const FORBIDDEN = ['diagnosis', 'risk_level', 'activity_score', 'progression_status', 'response_grade', 'prognosis_class', 'severity_grade', 'frailty_class']
/* 个人记录表：装着逐条患者内容的表。
   不包含身份/元信息表（profile / profiles / subject / workspace / import_batch）：
   它们的私密表达在它们所拥有的记录上，本身加一个标记不属于看板/导出/AI 三个出口。 */
const PERSONAL = /^(metric_point|consultation|care_event|adverse_event|viewpoint|question|task|document|observation|symptom|lab_|saved_|note|mm_|import_candidate|import_field_map)/
const fails = []
const oks = []

const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.sql')).sort()
if (!files.length) { console.error('✗ schema/ 下没有任何 .sql 迁移'); process.exit(1) }

const sqlTexts = files.map((f) => readFileSync(join(SCHEMA_DIR, f), 'utf8'))

/* C1 命名与序号 */
const nameOk = files.every((f, i) => new RegExp(`^${String(i + 1).padStart(4, '0')}_[a-z0-9_]+\.sql$`).test(f))
nameOk ? oks.push(`C1 迁移命名与序号连续（${files.join(', ')}）`) : fails.push(`C1 迁移命名不连续：${files.join(', ')}`)

/* C2 PRAGMA user_version */
const badPragma = []
files.forEach((f, i) => {
  const last = sqlTexts[i].trim().split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).at(-1).trim()
  const want = `PRAGMA user_version = ${i + 1};`
  if (last !== want) badPragma.push(`${f}: 末行=${last}`)
})
badPragma.length ? fails.push(`C2 ${badPragma.join(' | ')}`) : oks.push(`C2 每个迁移末行 PRAGMA user_version 与序号一致（${files.length} 个）`)

/* 自测：先注入缺陷再建库 */
if (SELF_TEST) sqlTexts[0] += '\nCREATE TABLE self_test_bad (id INTEGER PRIMARY KEY, risk_level TEXT);\n'

/* C3 内存全建 */
const db = new DatabaseSync(':memory:')
let buildErr = null
try { db.exec('PRAGMA foreign_keys = ON;'); for (const sql of sqlTexts) db.exec(sql) } catch (e) { buildErr = String(e.message) }

const tables = []
const columns = []
if (!buildErr) {
  for (const row of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
    tables.push(row.name)
    for (const col of db.prepare(`PRAGMA table_info(${JSON.stringify(row.name)})`).all()) {
      columns.push({ table: row.name, name: col.name, dflt: col.dflt_value })
    }
  }
}
buildErr ? fails.push(`C3 内存建库失败：${buildErr}`) : oks.push(`C3 内存库顺序建表成功（${sqlTexts.length} 个迁移 / ${tables.length} 张表）`)

if (!buildErr) {
  /* C5 无判读列 */
  const bad = columns.filter((c) => FORBIDDEN.some((b) => c.name === b || c.name.endsWith(`_${b}`)))
  bad.length ? fails.push(`C5 出现判读列：${bad.map((c) => `${c.table}.${c.name}`).join(', ')}`)
    : oks.push(`C5 判读列 0 命中（扫描 ${columns.length} 列 / ${FORBIDDEN.length} 条禁词）`)

  /* C6 is_private */
  const personal = tables.filter((t) => PERSONAL.test(t))
  const missing = personal.filter((t) => !columns.some((c) => c.table === t && c.name === 'is_private'))
  if (!personal.length) oks.push('C6 没有识别到个人记录表（表名不在已知模式内，请人工核对）')
  else missing.length ? fails.push(`C6 缺 is_private：${missing.join(', ')}`)
    : oks.push(`C6 ${personal.length} 张个人记录表都带 is_private`)

  /* C7 通用契约 */
  const hasInUse = columns.some((c) => c.name === 'in_use')
  const hasSectionTitle = columns.some((c) => c.name.endsWith('_title'))
  const emptyDefaults = columns.filter((c) => c.dflt !== null && /^''$/.test(String(c.dflt).trim()))
  hasInUse ? oks.push('C7a 存在 in_use 列') : fails.push('C7a 缺 in_use 列')
  hasSectionTitle ? oks.push('C7b 存在分节 *_title 列') : fails.push('C7b 缺分节 *_title 列')
  emptyDefaults.length ? fails.push(`C7c 用空串冒充缺测：${emptyDefaults.map((c) => `${c.table}.${c.name}`).join(', ')}`)
    : oks.push('C7c 缺测一律 NULL，未发现空串默认值')
}

/* C4 冻结合同哈希 */
const freezePath = join(SCHEMA_DIR, 'freeze-contract.md')
if (!existsSync(freezePath)) fails.push('C4 缺 schema/freeze-contract.md')
else {
  const contract = readFileSync(freezePath, 'utf8')
  const missingHash = []
  for (const f of files) {
    const sha = createHash('sha256').update(readFileSync(join(SCHEMA_DIR, f))).digest('hex')
    /* 合同表里必须同时出现文件名与该文件的 sha256；少一条即红。
       不解析 markdown 表格：反引号与转义在字符串里最容易写坏（本模板第一版就写坏过一次）。 */
    if (!contract.includes(f)) missingHash.push(`${f}: 合同表里没有记录文件名`)
    else if (!contract.includes(sha)) missingHash.push(`${f}: 合同里没有这个 sha256（改过历史迁移或忘了登记）`)
  }
  missingHash.length ? fails.push(`C4 ${missingHash.join(' | ')}`) : oks.push(`C4 ${files.length} 个迁移哈希与冻结合同逐条一致`)
}

db.close()

if (JSON_OUT) {
  console.log(JSON.stringify({ check: 'schema', tables: tables.length, columns: columns.length, failures: fails, oks, pass: fails.length === 0 }))
  process.exit(fails.length ? 1 : 0)
}
for (const line of oks) console.log('  ✓ ' + line)
for (const line of fails) console.error('  ✗ ' + line)
if (fails.length) {
  console.error(`\n✗ schema 冻结合同失败：${fails.length} 项`)
  if (SELF_TEST) { console.log('自测通过：注入的缺陷被闸门抓到'); process.exit(0) }
  process.exit(1)
}
console.log(`\n✓ schema 冻结合同：${oks.length} 项全过`)
if (SELF_TEST) { console.error('自测失败：注入缺陷后闸门仍全绿，等于没有闸门'); process.exit(1) }
