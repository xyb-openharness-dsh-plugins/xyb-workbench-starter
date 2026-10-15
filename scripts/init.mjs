#!/usr/bin/env node
import { readFile, writeFile, readdir, mkdir, lstat, unlink } from 'node:fs/promises'
import { dirname, resolve, relative, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const starter = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
function usage() {
  console.log('node scripts/init.mjs --config ./project.config.json --target ../my-workbench [--dry-run]')
}
async function exists(path) {
  try { return await lstat(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
function within(parent, path) {
  const rel = relative(parent, path)
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !rel.startsWith(sep))
}
async function main() {
  if (args.includes('--help')) { usage(); return }
  const options = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') { options.dry = true; continue }
    if (!['--config', '--target'].includes(arg) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown/missing argument: ' + arg)
    options[arg.slice(2)] = args[++i]
  }
  if (!options.config || !options.target) { usage(); throw new Error('config and target are required') }
  const cfg = JSON.parse(await readFile(resolve(options.config), 'utf8'))
  const allowed = new Set(['packageName','title','repository','description','slug','targetUsers','scenario','completion','coreFlow','layoutMode','businessWidth'])
  if (!cfg || Array.isArray(cfg) || typeof cfg !== 'object') throw new Error('Config must be an object')
  for (const key of Object.keys(cfg)) if (!allowed.has(key)) throw new Error('Unknown config key (no credentials here): ' + key)
  for (const key of ['packageName','title','repository','description','slug','targetUsers','scenario','completion']) {
    if (typeof cfg[key] !== 'string' || !cfg[key].trim() || cfg[key].length > 1000 || /[\u0000-\u001f]/.test(cfg[key]) || /填写|TODO|<[^>]+>/.test(cfg[key])) throw new Error('Fill a real value: ' + key)
  }
  if (!Array.isArray(cfg.coreFlow) || cfg.coreFlow.length < 2 || cfg.coreFlow.some((step) => typeof step !== 'string' || !step.trim() || /填写|TODO/.test(step))) throw new Error('coreFlow needs at least two confirmed steps')
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(cfg.packageName)) throw new Error('Invalid npm packageName')
  if (!/^[a-z][a-z0-9-]*$/.test(cfg.slug)) throw new Error('slug must be a lower-case URL segment')
  if (!/^https:\/\/github\.com\/[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*\/?$/.test(cfg.repository)) throw new Error('repository must be a canonical GitHub HTTPS URL')
  cfg.repository = cfg.repository.replace(/\/$/, '').replace(/\.git$/, '').toLowerCase()
  if (!['business-first','split'].includes(cfg.layoutMode)) throw new Error('Explicit layoutMode required: business-first or split')
  if (cfg.layoutMode === 'split' && (!Number.isFinite(cfg.businessWidth) || cfg.businessWidth < .25 || cfg.businessWidth > .7)) throw new Error('split businessWidth must be 0.25..0.7')
  const target = resolve(options.target)
  if (within(starter, target) || within(target, starter)) throw new Error('Target must be outside the starter directory and not its ancestor')
  const destStat = await exists(target)
  if (destStat && (!destStat.isDirectory() || destStat.isSymbolicLink())) throw new Error('Target must be a real directory')
  const plan = new Map()
  async function collect(directory, destination, filter = () => true) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!filter(entry.name)) continue
      if (entry.isSymbolicLink()) throw new Error('Source symlink is not allowed: ' + entry.name)
      const src = join(directory, entry.name), out = join(destination, entry.name)
      if (entry.isDirectory()) await collect(src, out, filter)
      else plan.set(out.replace(/\.tpl$/, ''), await readFile(src))
    }
  }
  await collect(join(starter, 'project-template'), '')
  for (const dir of ['docs','templates','prompts','assets','reference','examples']) {
    await collect(join(starter, dir), dir, (name) => name !== 'VALIDATION.md')
  }
  plan.set('AGENTS.md', await readFile(join(starter, 'AGENTS.md')))
  plan.set('scripts/check-workbench-package.mjs', await readFile(join(starter,'scripts/check-workbench-package.mjs')))
  const manifest = {
    name: cfg.packageName, version: '0.1.0', description: cfg.description, private: true, type: 'module',
    main: './dsh/index.js', exports: { '.': './dsh/index.js', './client': './lib/client.js', './package.json': './package.json', './cordis.patch.yml': './cordis.patch.yml' },
    files: ['dsh','lib','assets','cordis.patch.yml','README.md','NOTICE.md'],
    scripts: { check: 'node --check dsh/index.js && node --check lib/client.js && node scripts/check-workbench-package.mjs .', 'pack:check': 'npm pack --dry-run' },
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } },
    repository: { type: 'git', url: cfg.repository },
    peerDependencies: { '@deepseek-ai/cordis': '>=4.0.1 <5', '@deepseek-ai/dsh-client-connection': '>=0.1.0-rc.0 <0.3.0-0', '@deepseek-ai/dsh-host-webserver': '>=0.1.0-rc.0 <0.3.0-0', '@deepseek-ai/schemastery': '>=3.18.1 <4' },
    engines: { node: '>=22' }, license: 'UNLICENSED'
  }
  const descriptor = { title: cfg.title, repository: cfg.repository, description: cfg.description,
    ...(cfg.layoutMode === 'business-first' ? { customFrame: true } : { layout: { businessSide: 'left', businessWidth: cfg.businessWidth } }) }
  const css = (await readFile(join(starter,'assets/tokens.css'),'utf8')).replaceAll('.wb-root', '.wb-' + cfg.slug)
  const values = {
    '@@MANIFEST@@': JSON.stringify(manifest,null,2), '@@SLUG@@': cfg.slug,
    '@@PACKAGE_QUOTED@@': JSON.stringify(cfg.packageName), '@@CLIENT_METADATA@@': JSON.stringify({ title:cfg.title, description:cfg.description }),
    '@@STYLE@@': JSON.stringify(css), '@@DESCRIPTOR@@': JSON.stringify(descriptor),
    '@@TITLE@@': cfg.title, '@@DESCRIPTION@@': cfg.description, '@@LAYOUT@@': cfg.layoutMode
  }
  for (const [path, bytes] of plan) {
    if (/\.(?:js|json|yml|md)$/.test(path)) {
      let text = bytes.toString('utf8')
      // One pass: text inside a user value is never processed as another template token.
      text = text.replace(/@@[A-Z_]+@@/g, (token) => {
        if (!(token in values)) throw new Error('Unknown template token: ' + token)
        return values[token]
      })
      plan.set(path, Buffer.from(text))
    }
  }
  const assetManifest = JSON.parse(plan.get('assets/manifest.json').toString('utf8'))
  for (const item of assetManifest.assets) if (typeof item.source === 'string' && /^(?:\/|[a-zA-Z]:[\\/])/.test(item.source)) item.source = 'Community starter reference asset; see repository reference/sources.json'
  plan.set('assets/manifest.json', Buffer.from(JSON.stringify(assetManifest,null,2)+'\n'))
  plan.set('project.config.json', Buffer.from(JSON.stringify(cfg,null,2)+'\n'))
  plan.set('docs/BRIEF.md', Buffer.from(`# 需求确认\n\n目标用户：${cfg.targetUsers}\n\n场景：${cfg.scenario}\n\n核心流程：\n${cfg.coreFlow.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n完成结果：${cfg.completion}\n\n布局选择：${cfg.layoutMode}\n\n待补：Desktop 版本/平台、原型 hash、当前授权与离线/联网边界。\n`))
  for (const name of ['SPEC','TASKS','ACCEPTANCE']) plan.set('docs/'+name+'.md', await readFile(join(starter,'templates',name+'.md')))
  // Preflight every planned path before creating anything. No silent overwrite or symlink traversal.
  let starterMetadata = {name:'dsh-wb-cli',version:'unknown'}, revision = null, dirty = null
  try { starterMetadata = JSON.parse(await readFile(join(starter,'package.json'),'utf8')) } catch {}
  try {
    const options = {cwd:starter,encoding:'utf8',timeout:5000,maxBuffer:65536}
    const top = spawnSync('git',['rev-parse','--show-toplevel'],options)
    if (top.status === 0 && resolve(top.stdout.trim()) === starter) {
      const head = spawnSync('git',['rev-parse','HEAD'],options)
      const state = spawnSync('git',['status','--porcelain'],options)
      if (head.status === 0) revision = head.stdout.trim()
      if (state.status === 0) dirty = Boolean(state.stdout.trim())
    }
  } catch {}
  plan.set('.dsh-wb-starter.json', Buffer.from(JSON.stringify({starter:starterMetadata.name,version:starterMetadata.version,revision,dirty,generatedAt:new Date().toISOString(),updatePolicy:'Business project is a snapshot; compare changes before merging starter updates.'},null,2)+'\n'))
  const conflicts = []
  for (const path of plan.keys()) {
    const out = resolve(target, path)
    if (!within(target,out)) throw new Error('Output outside target: '+path)
    if (await exists(out)) conflicts.push(path)
    let parent = dirname(out)
    while (within(target,parent)) {
      const stat = await exists(parent)
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error('Unsafe destination parent: '+parent)
      if (parent === target) break
      parent = dirname(parent)
    }
  }
  if (conflicts.length) throw new Error('Existing files; no files written: '+conflicts.slice(0,8).join(', '))
  if (options.dry) { console.log(JSON.stringify({ dryRun:true, target, files:plan.size, layout:cfg.layoutMode })); return }
  const created = []
  try {
    for (const [path,bytes] of plan) {
      const out=join(target,path)
      await mkdir(dirname(out),{recursive:true})
      await writeFile(out,bytes,{flag:'wx'})
      created.push(out)
    }
  } catch(error) {
    for (const path of created.reverse()) await unlink(path).catch(()=>{})
    throw error
  }
  console.log(JSON.stringify({ generated:target, files:plan.size, layout:cfg.layoutMode, next:'Read AGENTS.md and docs/SPEC.md; then run npm run check. No install/publish performed.' }))
}
main().catch(error=>{ console.error(error.message); process.exitCode=1 })
