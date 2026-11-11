#!/usr/bin/env node
/**
 * 装机层全量核验：把 **已装进 profile 的那份** 逐个包扫一遍，一张表回答
 * 「装进去的是不是刚打的版本、面板契约在不在、业务界面进包了没、有没有登记进 bundles」。
 *
 * 它和别的检查不是一层东西，别互相替代：
 *   - `npm run check` / `audit`：查**源码树**（写对没写对）
 *   - 本脚本：查**装机副本**（装进去的那份对不对）
 *   - 界面加载 / 点「AI 对话」：只能重开 Desktop 后人点（本脚本不碰 UI，也不替你判定）
 *
 * 为什么需要它：装错 profile、漏登记 bundles、包里没带业务界面，这三种错都不会报错——
 * 页面能开、check 全绿、tgz 也打了，用户在列表里就是看不到，或者看到一块空白。
 * 2026-11-11 全家族收敛时，这一张表才发现 ovarian/lung 的界面是**内联在 lib/client.js**（无 public/），
 * 按"必须有 public/"的粗暴判据会把它们误判成空白 —— 所以界面一格留了人工判断位。
 *
 * 用法：
 *   node scripts/check-profile.mjs                     # 自动探测 Desktop 的 harness profile
 *   node scripts/check-profile.mjs --profile <dir>     # 指定 profiles/web 目录
 *   node scripts/check-profile.mjs --only sarcoma      # 只看名字含该串的包
 *   node scripts/check-profile.mjs --json
 * 退出码：0 = 全部通过（含"内联界面，需人工确认"）；1 = 有硬失败。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const JSON_OUT = args.includes('--json')
const ONLY = argOf('--only')

function findProfile(explicit) {
  if (explicit) return resolve(explicit)
  const candidates = []
  if (process.platform === 'darwin') candidates.push(join(homedir(), 'Library', 'Application Support', 'dsh-desktop', 'harness', 'profiles'))
  if (process.platform === 'win32') candidates.push(join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'dsh-desktop', 'harness', 'profiles'))
  candidates.push(join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'dsh-desktop', 'harness', 'profiles'))
  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    const names = readdirSync(dir).filter((n) => existsSync(join(dir, n, 'package.json')))
    const web = names.find((n) => n === 'web') || names[0]
    if (web) return join(dir, web)
  }
  return null
}

const profile = findProfile(argOf('--profile'))
if (!profile) {
  console.error('✗ 没找到 DSH Desktop 的 harness profile。先确认 Desktop 装在本机（https://www.dshdesktop.com/），或用 --profile 指定 profiles/web 目录。')
  process.exit(1)
}

const profilePkgPath = join(profile, 'package.json')
const profilePkg = JSON.parse(readFileSync(profilePkgPath, 'utf8'))
const bundles = new Set(profilePkg.dsh?.profile?.bundles || [])
const deps = profilePkg.dependencies || {}

const SCOPES = ['@xyb-community', '@xyb-openharness-dsh-plugins']
const rows = []
const fails = []
const notes = []
const leftovers = []

/** 剥注释后再数：注释里提到 ensureSession 不算调用，也算不出"已经改了"。 */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line.replace(/\/\/.*$/, '')))
    .join('\n')
}
const count = (code, re) => (code.match(re) || []).length

for (const scope of SCOPES) {
  const scopeDir = join(profile, 'node_modules', scope)
  if (!existsSync(scopeDir)) continue
  for (const name of readdirSync(scopeDir)) {
    const pkgName = `${scope}/${name}`
    if (ONLY && !pkgName.includes(ONLY)) continue
    const dir = join(scopeDir, name)
    const pkgPath = join(dir, 'package.json')
    if (!existsSync(pkgPath)) continue
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const clientPath = join(dir, 'lib/client.js')
    if (!existsSync(clientPath)) continue // 不是工作台（没有客户端入口）

    const code = codeOnly(readFileSync(clientPath, 'utf8'))
    const stat = statSync(clientPath)
    const newSession = count(code, /newSession\s*\(/g)
    const subscribe = count(code, /subscribe/g)
    const ensureSession = count(code, /ensureSession\s*\(/g)
    const boolConv = count(code, /Boolean\(conversation\)/g)

    /* 界面在包里可以是三种形态，判据必须是"有没有能打开的业务页"，不是"有没有 public 目录"：
       ① public/index.html（最常见，iframe 装进来的独立前端）
       ② 其它被 dsh/index.js 服务出去的静态目录，例如 fshd 用 assets/ui/（2026-11-11 实测误判过一次）
       ③ 内联在 lib/client.js 里（ovarian 347KB / lung 864KB），没有独立的页面文件
       扫描深度到两层，跳过明显不是界面的目录。 */
    const NON_UI_DIRS = new Set(['node_modules', 'docs', 'examples', 'prototypes', 'test', 'tests', 'scripts',
      'demo', 'reference', 'skills', 'templates', 'prompts', 'research', 'schema', 'release', 'lib', 'dsh', 'build'])
    function findUiDir(pkgDir) {
      if (existsSync(join(pkgDir, 'public/index.html'))) return 'public/'
      let entries = []
      try { entries = readdirSync(pkgDir, { withFileTypes: true }) } catch { return null }
      for (const e of entries) {
        if (!e.isDirectory() || NON_UI_DIRS.has(e.name) || e.name.startsWith('.')) continue
        if (existsSync(join(pkgDir, e.name, 'index.html'))) return `${e.name}/`
        let inner = []
        try { inner = readdirSync(join(pkgDir, e.name), { withFileTypes: true }) } catch { continue }
        for (const i of inner) {
          if (!i.isDirectory()) continue
          if (existsSync(join(pkgDir, e.name, i.name, 'index.html'))) return `${e.name}/${i.name}/`
        }
      }
      return null
    }
    const uiDir = findUiDir(dir)
    const inlineUi = !uiDir && stat.size > 100 * 1024
    const ui = uiDir || (inlineUi ? `内联 client.js(${Math.round(stat.size / 1024)}KB)` : '缺')

    const inBundles = bundles.has(pkgName)
    const isDep = Object.prototype.hasOwnProperty.call(deps, pkgName)
    /* 残留副本：包里带 .bak- 后缀（手工备份/旧副本）或压根不在 dependencies 里。
       它们不是"这套装置装坏了"，而是 node_modules 里躺着的旧东西 —— 单独列，不当硬失败，
       否则这个闸门在长期使用的机器上永远是红的，人就不看了。 */
    const isLeftover = /\.bak(-|$)/.test(name) || !isDep
    if (isLeftover) {
      leftovers.push(pkgName)
      continue
    }

    const hardFails = []
    if (newSession === 0) hardFails.push('没有 newSession（无会话时点「AI 对话」不会创建）')
    if (subscribe === 0) hardFails.push('没有 subscribe（新建/切换会话后界面不会刷新）')
    if (ensureSession > 0) hardFails.push('仍在调用 ensureSession（已废弃，取消选目录会留空会话）')
    if (boolConv > 0) hardFails.push('仍用 Boolean(conversation) 判会话（恒真，按钮点了没反应）')
    if (ui === '缺') hardFails.push('包里没有业务界面（既无 public/ 也不是内联视图）')
    if (!inBundles) hardFails.push('没登记进 dsh.profile.bundles（工作台列表里看不到）')
    if (!isDep) hardFails.push('不在 profile 的 dependencies 里（安装未落地）')

    if (inlineUi) notes.push(`${pkgName}：界面内联在 lib/client.js，需人工确认业务区不是空白`)
    rows.push({ pkgName, version: pkg.version, newSession, subscribe, ensureSession, boolConv, ui, inBundles, isDep, hardFails })
    if (hardFails.length) fails.push({ pkgName, hardFails })
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ profile, checked: rows.length, rows, fails, notes, leftovers }, null, 2))
} else {
  console.log(`profile: ${profile}`)
  console.log(`已登记 bundles: ${bundles.size} · dependencies: ${Object.keys(deps).length}\n`)
  const pad = (s, n) => String(s).padEnd(n)
  console.log(`${pad('工作表', 34)}${pad('版本', 14)}${pad('面板(new/sub)', 14)}${pad('界面', 22)}bundle  dep`)
  for (const r of rows) {
    const mark = r.hardFails.length ? '✗' : '✓'
    console.log(`${mark} ${pad(r.pkgName, 32)}${pad(r.version, 14)}${pad(`${r.newSession}/${r.subscribe}`, 14)}${pad(r.ui, 22)}${r.inBundles ? '  ✓  ' : '  ✗  '} ${r.isDep ? '✓' : '✗'}`)
  }
  console.log(`\n通过 ${rows.length - fails.length}/${rows.length}`)
  for (const f of fails) console.log(`\n✗ ${f.pkgName}\n   - ${f.hardFails.join('\n   - ')}`)
  for (const n of notes) console.log(`· ${n}`)
  if (leftovers.length) {
    console.log(`\n残留副本（不在 dependencies 里，不参与判定；建议人工清理）：${leftovers.length} 个`)
    for (const l of leftovers) console.log(`  - ${l}`)
  }
  if (!fails.length) console.log('\n✓ 装机层核验通过（界面加载与点击行为仍需重开 Desktop 后人验）')
}

process.exit(fails.length ? 1 : 0)