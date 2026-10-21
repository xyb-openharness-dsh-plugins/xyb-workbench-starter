// MinerU 表格对齐的回归测试（纯函数，不联网、不读凭据、不写库）。
//
// 夹具 test/fixtures/mineru-pathology-html.md 是 2026-10-21 GIST 工作台真机解析
// 一份 1 页病理 PDF 得到的 full.md 原文：表格是 HTML，且带 colspan="2"。
// 这两个特征各自都能让"先剥标签再抽取"的写法读出错误的值，所以钉在这里。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  htmlTablesToPipes,
  extractTableCandidates,
  splitMarkdownRow,
  parseResultValue,
} from '../examples/mineru-labparse-align.mjs'

const FIXTURE = fileURLToPath(new URL('./fixtures/mineru-pathology-html.md', import.meta.url))
const LAB_ENTRIES = [
  { code: 'hgb', names: ['血红蛋白', 'HGB', 'Hb'] },
  { code: 'wbc', names: ['白细胞', 'WBC'] },
  { code: 'plt', names: ['血小板', 'PLT'] },
  { code: 'alb', names: ['白蛋白', 'ALB'] },
]

test('htmlTablesToPipes：HTML 表格转竖线表，并补一条分隔行', () => {
  const html = '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr>'
    + '<tr><td>血红蛋白</td><td>104</td><td>g/L</td></tr></table>'
  const out = htmlTablesToPipes(html)
  const lines = out.split('\n').filter(Boolean)
  assert.equal(lines[0], '| 项目 | 结果 | 单位 |')
  assert.equal(lines[1], '| --- | --- | --- |', '要补分隔行，后面才能按同一套表头规则解析')
  assert.equal(lines[2], '| 血红蛋白 | 104 | g/L |')
})

test('colspan="2"：补空单元格，不复制内容（三列仍对得上）', () => {
  const html = '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr>'
    + '<tr><td>发生部位</td><td colspan="2">胃体</td></tr></table>'
  const row = htmlTablesToPipes(html).split('\n').filter(Boolean)[2]
  assert.equal(splitMarkdownRow(row).length, 3, 'colspan 不补空位会让三列变两列，整表错列')
  assert.deepEqual(splitMarkdownRow(row), ['发生部位', '胃体', ''], '空位留空，不能把「胃体」写两遍')
})

test('真实 MinerU 输出：4 项化验值与单位全部正确', () => {
  const md = readFileSync(FIXTURE, 'utf8')
  const rows = extractTableCandidates(md, LAB_ENTRIES)
  const byCode = Object.fromEntries(rows.map((r) => [r.code, r]))

  assert.deepEqual(
    { v: byCode.hgb?.valueText, u: byCode.hgb?.unit },
    { v: '104', u: 'g/L' },
  )
  assert.deepEqual(
    { v: byCode.wbc?.valueText, u: byCode.wbc?.unit },
    { v: '4.2', u: '10⁹/L' },
    '值不能被拼成 4.210 ^9/L —— 那是 colspan 错列的典型症状',
  )
  assert.deepEqual({ v: byCode.plt?.valueText, u: byCode.plt?.unit }, { v: '210', u: '10⁹/L' })
  assert.deepEqual({ v: byCode.alb?.valueText, u: byCode.alb?.unit }, { v: '38.6', u: 'g/L' })
})

test('先剥标签再解析会把整表压成一行（反例，说明为什么必须先转）', () => {
  const md = readFileSync(FIXTURE, 'utf8')
  const stripped = md.replace(/<[^>]+>/g, '')          // 错误顺序
  assert.match(stripped, /胃体\s*肿瘤最大径/, '压成一行后「部位」会把后面几项一起吞进来')
  assert.deepEqual(extractTableCandidates(stripped, LAB_ENTRIES), [], '压成一行后一条也抽不出来，且不能猜')

  const converted = htmlTablesToPipes(md)             // 正确顺序
  assert.equal(splitMarkdownRow(converted.split('\n').find((l) => l.includes('发生部位'))).length, 3)
})

test('指标数与数值数不一致：整行放弃，不硬配', () => {
  const lines = ['| 血红蛋白 | 白细胞 | 血小板 |', '| 104 | 4.2 |']
  assert.deepEqual(extractTableCandidates(lines, LAB_ENTRIES), [])
})

test('不等式保留原文、不折成数字', () => {
  assert.deepEqual(parseResultValue('<0.5'), { valueText: '<0.5', valueNum: null })
  assert.deepEqual(parseResultValue('4.2'), { valueText: '4.2', valueNum: 4.2 })
  assert.equal(parseResultValue('参考范围'), null)
})
