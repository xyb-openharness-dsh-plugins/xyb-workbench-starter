import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHECKER = join(HERE, '..', 'templates', 'check-choice-limit.mjs')

function fixture(js) {
  const dir = mkdtempSync(join(tmpdir(), 'lim-'))
  if (js !== null) {
    mkdirSync(join(dir, 'public'), { recursive: true })
    writeFileSync(join(dir, 'public', 'app.js'), js)
  }
  return dir
}

function run(dir) {
  try {
    const out = execFileSync(process.execPath, [CHECKER, '--root', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }
  }
}

test('没有 public 下的 JS 时跳过', () => {
  const r = run(fixture(null))
  assert.equal(r.code, 0)
  assert.match(r.out, /跳过/)
})

test('反例 · 拒绝分支只 toast+return，回滚靠调用方末尾 render（PF-ILD 真实形态）', () => {
  const r = run(fixture(`function pick(code) {
  if (chosen.length >= ONE_CHART_MAX) { toast('最多选 4 项'); return }
  chosen.push(code)
  render()
}`))
  assert.equal(r.code, 1, '分支里没有回滚，末尾 render 不算')
  assert.match(r.out, /数量上限分支既没有回滚/)
})

test('正例 · 单行分支内回弹 checkbox', () => {
  const r = run(fixture(`function pick(code, el) {
  if (chosen.length >= ONE_CHART_MAX) { el.checked = false; toast('最多选 4 项'); return }
  chosen.push(code); render()
}`))
  assert.equal(r.code, 0)
})

test('正例 · 多行分支内 render()', () => {
  const r = run(fixture(`function pick(code) {
  if (chosen.length >= 4) {
    toast('最多选 4 项')
    render()
    return
  }
  chosen.push(code)
}`))
  assert.equal(r.code, 0)
})

test('反例 · 多行分支无回滚', () => {
  const r = run(fixture(`function pick(code) {
  if (chosen.length >= 4) {
    toast('最多选 4 项')
    return
  }
  chosen.push(code); render()
}`))
  assert.equal(r.code, 1)
})

test('注释掉的分支不算', () => {
  const r = run(fixture(`// if (chosen.length >= 4) { toast('x'); return }
function pick(){ render() }`))
  assert.equal(r.code, 0)
})

test('没有上限判断的项目不误报', () => {
  const r = run(fixture(`function pick(code){ chosen.push(code); render() }`))
  assert.equal(r.code, 0)
  assert.match(r.out, /没有发现/)
})
