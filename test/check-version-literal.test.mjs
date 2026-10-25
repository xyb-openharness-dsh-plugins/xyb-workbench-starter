import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHECKER = join(HERE, '..', 'templates', 'check-version-literal.mjs')

/** 造一个最小项目：VERSION + 可选 public/index.html */
function fixture({ version = '0.2.0', html = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'verlit-'))
  writeFileSync(join(dir, 'VERSION'), version + '\n')
  if (html !== null) {
    mkdirSync(join(dir, 'public'), { recursive: true })
    writeFileSync(join(dir, 'public', 'index.html'), html)
  }
  return dir
}

function run(dir) {
  try {
    const out = execFileSync(process.execPath, [CHECKER, '--root', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { code: 0, out }
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout || ''}${error.stderr || ''}` }
  }
}

test('原型阶段（没有 public/index.html）跳过而不是报错', () => {
  const r = run(fixture())
  assert.equal(r.code, 0)
  assert.match(r.out, /跳过/)
})

test('占位符约定：纯占位符通过', () => {
  const r = run(fixture({ html: '<b>__VERSION_DISPLAY__</b><em>__BUILD_DATE__</em>' }))
  assert.equal(r.code, 0)
})

test('占位符约定：页面同时写了死版本 → 失败（PF-ILD v0.2.0 的真实形态）', () => {
  const r = run(fixture({ html: '<b>__VERSION_DISPLAY__</b><span>v0.1.0</span>' }))
  assert.equal(r.code, 1)
  assert.match(r.out, /写死了版本 v0\.1\.0/)
})

test('占位符约定：写死构建日期也要拦', () => {
  const r = run(fixture({ html: '<b>__VERSION_DISPLAY__</b><em>2026-10-25</em>' }))
  assert.equal(r.code, 1)
  assert.match(r.out, /写死了日期 2026-10-25/)
})

test('字面量约定：与 VERSION 一致通过（存量项目兼容）', () => {
  const r = run(fixture({ html: '<span>v0.2.0</span>' }))
  assert.equal(r.code, 0)
})

test('字面量约定：版本不一致失败（cervical check-version 的形态）', () => {
  const r = run(fixture({ html: '<span>v0.1.0</span>' }))
  assert.equal(r.code, 1)
  assert.match(r.out, /v0\.1\.0 ≠ VERSION v0\.2\.0/)
})

test('页面完全不显示版本 → 失败（看不见就不算错也是错）', () => {
  const r = run(fixture({ html: '<span>小呼宝</span>' }))
  assert.equal(r.code, 1)
  assert.match(r.out, /既没有版本占位符也没有版本字面量/)
})

test('失败时给出行号', () => {
  const r = run(fixture({ html: '<div>\n<span>v0.1.0</span>\n</div>' }))
  assert.equal(r.code, 1)
  assert.match(r.out, /index\.html:2/)
})
