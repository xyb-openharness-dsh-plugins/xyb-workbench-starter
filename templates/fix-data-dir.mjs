#!/usr/bin/env node
/**
 * 批量补齐「资料目录真入口」：给任意家族工作台的客户端加
 *   ① 模块级常量（DATA_ROOT_URL + 口径正则）
 *   ② 面板状态（dataDir / dirNote）
 *   ③ 读取当前目录的 effect + pickDataDir()（pickDirectory → 口径校验 → POST /root → 回显）
 *   ④ 顶栏「配置目录」按钮（插在「AI 对话」按钮之前）
 *
 * 为什么做成脚本：AC 桶里 10+ 个仓的客户端结构各不相同（有的 src/ 构建、有的 lib/ 单文件；
 * 缩进 6/8/10 空格都有；常量名也不统一）。手改一次能过，下一次又要在几百行 JSX 里找锚点。
 * 这里按「找 onClick: onAgentClick 再回溯到 h('button'」的方式定位，不依赖具体缩进。
 *
 * 用法：
 *   node scripts/fix-data-dir.mjs <项目根> [--slug gastric] [--dry]
 * 退出码：0 = 已就绪或已成功改写；1 = 找不到锚点（需人工，报告里写清楚）；2 = 用法错误
 *
 * 幂等：已含 DATA_ROOT_URL 的仓直接跳过（只补缺失的片段）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const root = resolve(args[0] || '.')
const slug = (args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null) || root.split('/').pop().replace(/-workbench$/, '')
const DRY = args.includes('--dry')
const apiRoot = `/api/${slug}/api/root`

const candidate = ['lib/client.js', 'src/client.js'].map((p) => join(root, p)).find((p) => existsSync(p))
if (!candidate) {
  console.error('✗ 用法：node scripts/fix-data-dir.mjs <项目根>（找不到 lib/client.js 或 src/client.js）')
  process.exit(2)
}

let src = readFileSync(candidate, 'utf8')
const original = src
const done = []
const r = (re, rep, label, required = true, marker = null) => {
  /* 判据是「内容标记在不在」，不是「锚点在不在」——锚点几乎总是存在，
     拿它当判据会永远报"已有"而从不插入（这是本脚本第一版的 bug）。 */
  if (marker && src.includes(marker)) { done.push(`✓ 已有：${label}`); return }
  if (!re.test(src)) { done.push(`✗ 找不到锚点：${label}`); return }
  if (!required) { done.push(`· 跳过：${label}（找不到锚点，非必需）`); return }
  src = src.replace(re, rep)
  done.push(`+ 新增：${label}`)
}

/* ① 常量：插在 Panel 定义之前 */
r(/(?:^|\n)( *)(function Panel\()/m, (_m, indent, head) => `
${indent}/* 资料目录：口径与服务端同一条规则（服务端会再判一遍） */
${indent}const DATA_ROOT_URL = '${apiRoot}'
${indent}const HOME_EXACT = String.raw`^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\\Users\\[^\\]+)$`
${indent}const FORBIDDEN_DIR = String.raw`((Desktop|桌面)$|(Downloads?|下载(夹)?)$|^(\/tmp|\/private\/tmp|\/var\/folders\/|\/private\/var\/folders\/))`
${indent}const isForbiddenDir = (dir) => new RegExp(HOME_EXACT, 'i').test(dir) || new RegExp(FORBIDDEN_DIR, 'i').test(dir)

${indent}${head}`,
  '模块常量（DATA_ROOT_URL / 口径正则）', true, 'DATA_ROOT_URL')

/* ② 状态：跟在第一个 useState(false) 之后 */
r(/(\n( *)const \[dragging, setDragging\] = React\.useState\(false\))/,
  (_m, line, indent) => `${line}\n${indent}const [dataDir, setDataDir] = React.useState('')\n${indent}const [dirNote, setDirNote] = React.useState('')`,
  '面板状态（dataDir / dirNote）', true, 'dataDir')

/* ③ effect + pickDataDir：插在 agentLabel 之前 */
const block = (indent) => `${indent}/* 当前资料目录：开面板读一次；换过之后立即回显 */
${indent}React.useEffect(() => {
${indent}  let alive = true
${indent}  fetch(DATA_ROOT_URL, { credentials: 'same-origin' })
${indent}    .then((r) => (r.ok ? r.json() : null))
${indent}    .then((info) => { if (alive && info && info.dir) setDataDir(info.dir) })
${indent}    .catch(() => { /* 读不到就不显示，别编一个路径 */ })
${indent}  return () => { alive = false }
${indent}}, [])

${indent}/* 「配置目录」= 真入口：宿主选择器 → 口径校验 → 落盘 → 回显。 */
${indent}async function pickDataDir() {
${indent}  const ui = bridge && bridge.uiWorkspace
${indent}  if (!ui || typeof ui.pickDirectory !== 'function') {
${indent}    setDirNote('本原型为示意，目录未真实挂载：当前 Desktop 没有提供目录选择能力，数据仍写在默认位置。')
${indent}    return
${indent}  }
${indent}  let dir = ''
${indent}  try { dir = await ui.pickDirectory() } catch (error) {
${indent}    setDirNote('没能打开目录选择器：' + ((error && error.message) || error))
${indent}    return
${indent}  }
${indent}  if (!dir) { setDirNote('已取消选择目录；当前资料目录没有更改。'); return }
${indent}  if (isForbiddenDir(dir)) {
${indent}    setDirNote('这个位置不能当资料目录（主目录本身 / 桌面 / 下载根目录 / tmp）。请在里面新建一个专用文件夹再选。')
${indent}    return
${indent}  }
${indent}  try {
${indent}    const rsp = await fetch(DATA_ROOT_URL, {
${indent}      method: 'POST', credentials: 'same-origin',
${indent}      headers: { 'content-type': 'application/json' },
${indent}      body: JSON.stringify({ dir }),
${indent}    })
${indent}    const body = await rsp.json().catch(() => ({}))
${indent}    if (!rsp.ok) { setDirNote(body.message || body.error || '目录切换失败'); return }
${indent}    setDataDir(body.dir || dir)
${indent}    setDirNote('资料目录已切换到：' + (body.dir || dir) + '（旧目录数据不会自动搬迁）')
${indent}  } catch (error) {
${indent}    setDirNote('目录切换失败：' + ((error && error.message) || error))
${indent}  }
${indent}}

`
r(/(\n( *)const agentLabel = )/,
  (_m, pre, indent) => `\n${block(indent).trimEnd()}${pre}`,
  '读取 effect + pickDataDir()', true, 'async function pickDataDir')

/* ④ 按钮：找 onClick: onAgentClick，回溯到 h('button' 开头，插在其前 */
if (!/onClick: pickDataDir/.test(src)) {
  const lines = src.split('\n')
  const idx = lines.findIndex((l) => l.includes('onClick: onAgentClick'))
  if (idx === -1) {
    done.push('✗ 找不到「AI 对话」按钮（onClick: onAgentClick）——按钮需人工补')
  } else {
    let start = idx
    while (start > 0 && !/h\('button',\s*\{\s*$/.test(lines[start])) start--
    if (start === idx) {
      done.push('✗ 按钮回溯失败——按钮需人工补')
    } else {
      const indent = lines[start].match(/^ */)[0]
      const btn = [
        `${indent}h('button', {`,
        `${indent}  type: 'button',`,
        `${indent}  style: ghostStyle,`,
        `${indent}  onClick: pickDataDir,`,
        `${indent}  'aria-label': dataDir ? \`配置目录：当前 \${dataDir}\` : '配置资料目录',`,
        `${indent}  title: dataDir ? \`当前资料目录：\${dataDir}\` : '选择本机资料目录',`,
        `${indent}}, dataDir ? '配置目录 · 已设' : '配置目录'),`,
      ]
      lines.splice(start, 0, ...btn)
      src = lines.join('\n')
      done.push('+ 新增：顶栏「配置目录」按钮')
    }
  }
} else done.push('✓ 已有：「配置目录」按钮')

for (const line of done) console.log(line)
if (src === original) {
  console.log('\n· 无需改动')
  process.exit(0)
}
if (DRY) {
  console.log('\n· --dry：未写盘')
  process.exit(0)
}
writeFileSync(candidate, src)
console.log(`\n✓ 已写入 ${candidate.replace(root + '/', '')}`)