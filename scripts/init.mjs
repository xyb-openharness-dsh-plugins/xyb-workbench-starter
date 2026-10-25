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
  if (!Array.isArray(cfg.coreFlow) || cfg.coreFlow.length < 2 || cfg.coreFlow.some((step) => typeof step !== 'string' || !step.trim() || /填写|TODO/.test(step))) throw new Error('coreFlow needs at least two initial steps')
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(cfg.packageName)) throw new Error('Invalid npm packageName')
  if (!/^[a-z][a-z0-9-]*$/.test(cfg.slug)) throw new Error('slug must be a lower-case URL segment')
  if (!/^https:\/\/github\.com\/[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*\/?$/.test(cfg.repository)) throw new Error('repository must be a canonical GitHub HTTPS URL')
  cfg.repository = cfg.repository.replace(/\/$/, '').replace(/\.git$/, '').toLowerCase()
  if (!['business-first','split'].includes(cfg.layoutMode)) throw new Error('Explicit layoutMode required: business-first or split')
  // businessWidth 的 0.7 是宿主 register() 的硬上限，两种布局都要守——越界会让插件激活失败、
  // 目标 Desktop 起不来（不是样式问题）。business-first 下它写进 lib/client.js 的 BUSINESS_WIDTH。
  if (cfg.businessWidth !== undefined && (!Number.isFinite(cfg.businessWidth) || cfg.businessWidth < .25 || cfg.businessWidth > .7)) throw new Error('businessWidth must be 0.25..0.7（宿主 register() 硬上限）')
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
  for (const dir of ['docs','templates','prompts','assets','reference','examples','skills']) {
    await collect(join(starter, dir), dir, (name) => name !== 'VALIDATION.md')
  }
  plan.set('AGENTS.md', await readFile(join(starter, 'AGENTS.md')))
  plan.set('scripts/check-workbench-package.mjs', await readFile(join(starter,'scripts/check-workbench-package.mjs')))
  // 家族一致性检查随项目下发：交付前必须在本项目目录里跑得起来，而不是回 starter 里跑。
  plan.set('scripts/check-conformance.mjs', await readFile(join(starter,'scripts/check-conformance.mjs')))
  // 宿主 register() 校验的本地副本：businessWidth 越界这类错本地全绿、装进去崩，只能靠它拦。
  plan.set('scripts/check-host-contract.mjs', await readFile(join(starter,'templates/check-host-contract.mjs')))
  // 激活烟测：宿主 register() 的校验抄进桩件真跑一遍 apply()。静态闸门查「写了什么」，
  // 它查「跑起来会不会炸」——两层都要有。
  plan.set('scripts/smoke-activate.mjs', await readFile(join(starter,'templates/smoke-activate.mjs')))
  plan.set('scripts/verify-desktop-load.mjs', await readFile(join(starter,'templates/verify-desktop-load.mjs')))
  // VERSION 是版本唯一来源（audit 的 version/file 与 version/pkg 都指着它）。
  plan.set('VERSION', '0.1.0\n')
  const manifest = {
    name: cfg.packageName, version: '0.1.0', description: cfg.description, private: true, type: 'module',
    main: './dsh/index.js', exports: { '.': './dsh/index.js', './client': './lib/client.js', './package.json': './package.json', './cordis.patch.yml': './cordis.patch.yml' },
    files: ['dsh','lib','assets','cordis.patch.yml','README.md','NOTICE.md'],
    scripts: {
      check: 'node --check dsh/index.js && node --check lib/client.js && node scripts/check-workbench-package.mjs . && node scripts/check-host-contract.mjs && node scripts/smoke-activate.mjs && node scripts/check-probe-coverage.mjs',
      'check:host': 'node scripts/check-host-contract.mjs',
      'smoke:activate': 'node scripts/smoke-activate.mjs',
      'verify:desktop': 'node scripts/verify-desktop-load.mjs',
      // check 保持"从第一天就该是绿的"（语法 + 装包合同）；audit 是交付前的家族一致性闸口，
      // 新项目在做出 VERSION/lib/layout.js/测试之前必然有 fail，那是待办清单不是故障。
      test: 'node --test test/*.test.mjs',
      audit: 'node scripts/check-conformance.mjs .',
      'release:check': 'npm run check && npm run test && npm run audit',
      'pack:check': 'npm pack --dry-run',
      // 产物级验收：对**装进去的那一份**起服务并点页签，而不是对源码树。
      // 源码树跑得通完全不能说明装进去跑得通（files 白名单漏一个目录就够）。
      'probe:artifact': 'node scripts/serve-artifact.mjs',
      'probe:tabs': 'python3 scripts/verify-tabs-on-artifact.py',
      'probe:page-view': 'node scripts/probe-page-view.mjs'
    },
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
  plan.set('docs/BRIEF.md', Buffer.from(`# 需求起点\n\n来源：初始化配置。用户、场景和流程是有效的SPEC互动素材；继承会话中已有明确确认，其余不能仅因配置通过校验就当成设计定稿或研究验证。\n\n目标用户：${cfg.targetUsers}\n\n场景：${cfg.scenario}\n\n核心流程：\n${cfg.coreFlow.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n完成结果：${cfg.completion}\n\n初始布局选择：${cfg.layoutMode}\n\n先读取 docs/DESIGN-PROMPT.md，对齐设计者与研究/取舍原则，再逐项完善SPEC。待补：确认来源、Desktop 版本/平台、原型 hash、当前授权与离线/联网边界。\n`))
  for (const name of ['SPEC','TASKS','ACCEPTANCE','RELEASE']) plan.set('docs/'+name+'.md', await readFile(join(starter,'templates',name+'.md')))
  for (const name of ['DESIGNER-BRIEF','DESIGN-SESSION','DESIGN-REVIEW','SCHEMA','API-CONTRACT','UI-DESIGN','SETTINGS-DESIGN','PROTOTYPE-REVIEW','HVT-REVIEW','ONE-CHART-SPEC','METRIC-TREND-SPEC','FULL-PAGE-VIEW']) plan.set('docs/'+name+'.md', await readFile(join(starter,'templates',name+'.md')))
  plan.set('docs/17-CLOSED-LOOP-PROJECT-FLOW.md', await readFile(join(starter,'docs/17-CLOSED-LOOP-PROJECT-FLOW.md')))
  plan.set('docs/PARITY.csv', await readFile(join(starter,'templates/PARITY.csv')))
  // 以真实 npm pack 清单为对象的装机测试：静态检查只看源码树，看不出发出去少了什么。
  plan.set('test/pack-contents.test.mjs', await readFile(join(starter,'templates/test-pack-contents.test.mjs')))
  plan.set('docs/DESIGN-PROMPT.md', await readFile(join(starter,'prompts/DESIGNER-FIRST.md')))
  // 32 号整页视图的 A1–A10 验收探针随项目下发：项目自带的 examples/page-view.html 就是它的对象，
  // 改造业务页时以它为起点，别从零写一套断言。
  plan.set('scripts/probe-page-view.mjs', await readFile(join(starter,'scripts/probe-page-view.mjs')))
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
  plan.set('CHANGELOG.md', Buffer.from(`# 变更记录\n\n只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。\n\n## 0.1.0 — ${new Date().toISOString().slice(0,10)}\n\n- 由社区脚手架 ${starterMetadata.name}@${starterMetadata.version}${revision ? ` (${revision.slice(0,7)}${dirty ? '+dirty' : ''})` : ''} 初始化，仅有注册骨架与健康接口，无业务功能。\n`))
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
  console.log(JSON.stringify({ generated:target, files:plan.size, layout:cfg.layoutMode,
    stage:'designer-alignment',
    designerPrompt:join(target,'docs/DESIGN-PROMPT.md'),
    cancerPrompt:join(target,'prompts/NEW-CANCER-WORKBENCH.md'),
    agentPanePrompt:join(target,'prompts/DSH-AGENT-PANE-INTEGRATION.md'),
    designerBrief:join(target,'docs/DESIGNER-BRIEF.md'),
    designSession:join(target,'docs/DESIGN-SESSION.md'),
    prototypeReview:join(target,'docs/PROTOTYPE-REVIEW.md'),
    settingsDesign:join(target,'docs/SETTINGS-DESIGN.md'),
    oneChartSpec:join(target,'docs/ONE-CHART-SPEC.md'),
    hvtReview:join(target,'docs/HVT-REVIEW.md'),
    releaseChecklist:join(target,'docs/RELEASE.md'),
    publishingGuide:join(target,'docs/10-MARKET-PUBLISHING.md'),
    // 用户说「看进度 / 汇报 / 到哪了」时用；口径固定，避免每次临场拟一套说法。
    progressReport:join(target,'prompts/PROGRESS-REPORT.md'),
    firstQuestion:'已有用户、场景和流程会继承。先按 prompts/DSH-AGENT-PANE-INTEGRATION.md 对照已有原型与当前实现；工作台保持中间主区，Agent 在右侧。请指出最影响用户完成任务的一个实现差距及其证据，再围绕未决设计者问题继续对话，不重复已知答案。',
    next:'当前Agent现在立即展示 docs/DESIGN-PROMPT.md 与 prompts/DSH-AGENT-PANE-INTEGRATION.md 的实际路径并读取；如果集成原生Agent，先核对右侧可调宽、可隐藏重开、按需创建/复用会话及一键带入保护，再与用户互动。接着完善设计者章程与提示词，再开展研究/场景/SPEC，先交付HTML交互工作台由用户确认对应模块，再开发生产业务；新癌种HTML必须包含全局设置页，要求见docs/SETTINGS-DESIGN.md；模型独立于UI和流程。发布记录模板为docs/RELEASE.md，市场步骤为docs/10-MARKET-PUBLISHING.md。CLI只输出交接，不自动推送Git、创建Release、安装或投稿；逐项按用户授权执行。'
  }))
}
main().catch(error=>{ console.error(error.message); process.exitCode=1 })
