import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHECKER = join(HERE, '..', 'templates', 'check-static-refs.mjs')

function fixture({ html, files = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'refs-'))
  if (html !== null) {
    mkdirSync(join(dir, 'public'), { recursive: true })
    writeFileSync(join(dir, 'public', 'index.html'), html)
  }
  for (const [name, body] of Object.entries(files)) {
    const p = join(dir, 'public', name)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, body)
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

test('原型阶段（没有 public/index.html）跳过', () => {
  const r = run(fixture({ html: null }))
  assert.equal(r.code, 0)
  assert.match(r.out, /跳过/)
})

test('引用真实存在的脚本通过', () => {
  const r = run(fixture({ html: '<script src="app.js"></script>', files: { 'app.js': 'console.log(1)' } }))
  assert.equal(r.code, 0)
})

test('引用不存在的脚本失败（PF-ILD 的 demo-data.js 形态）', () => {
  const r = run(fixture({ html: '<script src="demo-data.js"></script>\n<script src="app.js"></script>', files: { 'app.js': 'x' } }))
  assert.equal(r.code, 1)
  assert.match(r.out, /不存在的 script.*demo-data\.js/)
  assert.match(r.out, /Unexpected token/)
})

test('被引用的 .js 内容是 HTML（兜底页）也要拦', () => {
  const r = run(fixture({ html: '<script src="app.js"></script>', files: { 'app.js': '<!doctype html>\n<html></html>' } }))
  assert.equal(r.code, 1)
  assert.match(r.out, /以 .<. 开头/)
})

test('外链 / data: / 占位符 不算本地引用', () => {
  const r = run(fixture({
    html: '<script src="https://cdn.example.com/x.js"></script><img src="data:image/png;base64,AAA"><link href="__STYLE_URL__"><script src="app.js"></script>',
    files: { 'app.js': 'x' }
  }))
  assert.equal(r.code, 0)
})

test('link / img 引用缺失同样拦', () => {
  const r = run(fixture({ html: '<link href="style.css"><img src="logo.png"><script src="app.js"></script>', files: { 'app.js': 'x' } }))
  assert.equal(r.code, 1)
  assert.match(r.out, /style\.css/)
  assert.match(r.out, /logo\.png/)
})

test('反向提示：未被引用的 js 只给提示不判失败', () => {
  const r = run(fixture({ html: '<script src="app.js"></script>', files: { 'app.js': 'x', 'orphan.js': 'y' } }))
  assert.equal(r.code, 0)
  assert.match(r.out, /orphan\.js 没有被/)
})
