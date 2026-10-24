/**
 * 以**打包产物**为对象的测试：`npm pack --dry-run` 的真实清单里到底有没有那些运行时才需要的文件。
 *
 * 为什么需要它：源码树里 `readFile(join(HERE,'..','schema','migrations'))` 跑得通，
 * 完全不能说明装进去跑得通——`package.json` 的 `files` 白名单漏一个目录，
 * 就会「装得上、打得开、进去是空库/白屏」。静态检查器看不见这种漏，
 * 只有对真实清单断言才看得见。
 *
 * 约定：本项目还没有对应目录时**跳过**该条（骨架阶段正常），
 * 一旦目录存在就必须在清单里——不允许「有目录但没打进包」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function packList() {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const [info] = JSON.parse(out)
  return new Set(info.files.map((f) => f.path))
}

test('打包清单包含运行时按路径读取的目录', () => {
  const files = packList()

  // 前端产物：装机后 /ui/ 全靠它，漏了就是白屏
  if (existsSync(join(ROOT, 'public'))) {
    assert.ok(files.has('public/index.html'), 'public/ 存在却没打进包 → 装机后 UI 全 404')
  }

  // 迁移：漏了就是「装得上、进去是空库」（有守卫时大声抛错，没守卫时静默 0 表）
  if (existsSync(join(ROOT, 'schema/migrations'))) {
    const sql = [...files].filter((f) => f.startsWith('schema/migrations/') && f.endsWith('.sql'))
    assert.ok(sql.length > 0, 'schema/migrations/ 存在却没打进包 → 装机后一张表都不建')
  }

  // 标准原文等随包资产：AGENTS.md 要求随包分发
  if (existsSync(join(ROOT, 'assets'))) {
    assert.ok([...files].some((f) => f.startsWith('assets/')), 'assets/ 存在却没打进包')
  }

  // 客户端外壳：没有它插件注册不上
  assert.ok(files.has('lib/client.js'), 'lib/client.js 没打进包')
  assert.ok(files.has('cordis.patch.yml'), 'cordis.patch.yml 没打进包')
})

test('dsh/index.js 声明了 Config.root 时，cordis.patch.yml 必须给 config.root', () => {
  const index = readFileSync(join(ROOT, 'dsh/index.js'), 'utf8')
  if (!/Config\s*=\s*Schema\.object\(\s*\{[\s\S]*?root:/.test(index)) return // 没声明就不管
  const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')
  assert.match(
    patch,
    /config:\s*\n\s*root:/,
    'Config 声明了 root 但 patch 没给 config.root → 装得上、每次重启回内存库',
  )
})

test('打包清单不包含源码树里的敏感物', () => {
  const files = packList()
  for (const bad of ['.env', '.env.local', 'node_modules']) {
    assert.ok(![...files].some((f) => f === bad || f.startsWith(bad + '/')), `不该打进包：${bad}`)
  }
})
