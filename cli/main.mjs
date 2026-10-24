import { readFile, writeFile, realpath, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function capture(command, args, cwd, timeout = 10000) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, shell: process.platform === 'win32' && command === 'npm' })
  if (result.error) throw new Error(command + ': ' + result.error.message)
  return { code: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' }
}
function printResult(result) {
  if (result.stdout) console.log(result.stdout.slice(-4000).trimEnd())
  if (result.stderr) console.error(result.stderr.slice(-4000).trimEnd())
  return result.code
}
function parseFlags(args, allowed) {
  const out = {}, positions = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) { positions.push(arg); continue }
    if (!(arg in allowed)) throw new Error('未知参数：' + arg)
    if (allowed[arg] === 'boolean') out[arg] = true
    else {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error('参数缺少值：' + arg)
      out[arg] = value
    }
  }
  return { flags: out, positions }
}
async function readable(path) { try { await access(path); return true } catch { return false } }
export async function runCli({ root, args, cwd }) {
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const [command, ...rest] = args
  if (command === '--version' || command === '-v') { console.log(metadata.version); return 0 }
  if (!command || ['--help','-h','help'].includes(command)) {
    console.log(`dsh-wb-cli ${metadata.version}
  init [目录] --config <配置.json> [--dry-run]  按初始用户/场景/流程生成项目，再对齐设计者
  init --prepare [--config <配置.json>]        仅生成待填写配置，不写业务代码
  文档入口                                 init生成 docs/RELEASE.md；市场步骤见 docs/10-MARKET-PUBLISHING.md
  doctor [--json]                             只读检查本机与脚手架 Git 状态
  sync [--dry-run]                            从跟踪分支 git pull --ff-only
  check [项目目录]                           社区静态包合同检查
  audit [项目目录] [--json]                  家族一致性检查（版本/面板/检查链/文档/密钥）
  pack [项目目录] [--dry-run]                 先静态检查，再打包（不运行生命周期脚本）

激活：在 Git 克隆目录执行 npm link --ignore-scripts --no-audit --no-fund。
init 输出设计提示词绝对路径和对话首问；当前Agent读取后接力，CLI不自行调用模型。
init 不安装到 Desktop；sync 不覆盖已生成业务项目。Desktop 安装以目标版入口为准。`)
    return 0
  }
  if (rest.includes('--help')) return runCli({root,args:['--help'],cwd})
  if (command === 'init') {
    const { flags, positions } = parseFlags(rest, { '--config':'value', '--target':'value', '--dry-run':'boolean', '--prepare':'boolean' })
    if (positions.length > 1 || (positions.length && flags['--target'])) throw new Error('只指定一个目标目录')
    const config = resolve(cwd, flags['--config'] || 'project.config.json')
    if (flags['--prepare']) {
      if (positions.length || flags['--target']) throw new Error('--prepare 只准备配置，不接受项目目录')
      if (flags['--dry-run']) { console.log(JSON.stringify({prepare:config,dryRun:true})); return 0 }
      await writeFile(config, await readFile(join(root,'project.config.example.json')), { flag:'wx' })
      console.log('已生成待填写配置：' + config + '\n先提供用户、场景、核心流程与初始布局，再执行 init；这些素材将用于设计者对齐和SPEC关键对话。')
      return 0
    }
    if (!(await readable(config))) throw new Error('找不到需求配置。先运行 dsh-wb-cli init --prepare，填好后再 init；也可用 --config 指定已有配置。')
    const target = resolve(cwd, flags['--target'] || positions[0] || '.')
    const childArgs = [join(root,'scripts/init.mjs'),'--config',config,'--target',target]
    if (flags['--dry-run']) childArgs.push('--dry-run')
    const result = capture(process.execPath,childArgs,cwd,30000)
    if (result.code) return printResult(result)
    // Successful init is structured data, not a log tail. Keep every generated path intact.
    console.log(JSON.stringify(JSON.parse(result.stdout)))
    return 0
  }
  if (command === 'doctor') {
    const { flags, positions } = parseFlags(rest, {'--json':'boolean'})
    if (positions.length) throw new Error('doctor 不接受目录参数')
    const tools = {}
    for (const [name,toolArgs] of [['git',['--version']],['npm',['--version']]]) {
      try { const result=capture(name,toolArgs,cwd,5000); tools[name]={available:result.code===0,version:result.stdout.trim().slice(0,120)} }
      catch { tools[name]={available:false} }
    }
    let git = { repository:false }
    try {
      const top=capture('git',['-C',root,'rev-parse','--show-toplevel'],cwd)
      if (!top.code && await realpath(top.stdout.trim()) === await realpath(root)) {
        const status=capture('git',['-C',root,'status','--porcelain'],cwd)
        const head=capture('git',['-C',root,'rev-parse','HEAD'],cwd)
        const remote=capture('git',['-C',root,'remote','get-url','origin'],cwd)
        git={repository:true,revision:head.code?null:head.stdout.trim(),dirty:Boolean(status.stdout.trim()),originConfigured:remote.code===0}
      }
    } catch { /* Unavailable Git is reported in tools. */ }
    const report={cli:{version:metadata.version,path:root},node:{version:process.version,supported:Number(process.versions.node.split('.')[0])>=22},platform:process.platform,architecture:process.arch,shell:process.env.SHELL||process.env.ComSpec||null,tools,git,desktop:{appDetected:process.platform==='darwin'?await readable('/Applications/DSH Desktop.app'):null,version:'未核验',profile:'未核验',installed:'未核验'},note:'只读，不联网、不启动/重启 Desktop；应用存在不代表接入通过。'}
    console.log(JSON.stringify(report,null,2))
    return report.node.supported && tools.git.available && tools.npm.available ? 0 : 1
  }
  if (command === 'sync') {
    const { flags, positions } = parseFlags(rest, {'--dry-run':'boolean'})
    if (positions.length) throw new Error('sync 更新当前 CLI 安装来源，不接受业务项目目录')
    const top=capture('git',['-C',root,'rev-parse','--show-toplevel'],cwd)
    if (top.code || await realpath(top.stdout.trim()) !== await realpath(root)) throw new Error('CLI 当前不在独立 Git 克隆根目录；请先从社区仓库 clone，再 npm link 激活。')
    const status=capture('git',['-C',root,'status','--porcelain'],cwd)
    if (status.code || status.stdout.trim()) throw new Error('脚手架有未提交修改，停止同步；请先审阅并提交/备份，不自动 stash/reset。')
    const upstream=capture('git',['-C',root,'rev-parse','--abbrev-ref','--symbolic-full-name','@{upstream}'],cwd)
    if (upstream.code) throw new Error('尚未配置跟踪分支；先设置正确 Git 远端与 upstream。')
    if (flags['--dry-run']) {console.log(JSON.stringify({dryRun:true,root,upstream:upstream.stdout.trim(),command:['git','pull','--ff-only']}));return 0}
    const result=capture('git',['-C',root,'pull','--ff-only'],cwd,60000)
    const code=printResult(result)
    if (!code) console.log('脚手架已同步；已生成业务项目保持自己的版本，升级需审阅差异。CLI 通过链接激活时，下次执行即使用更新内容。')
    return code
  }
  if (command === 'audit') {
    const { flags, positions } = parseFlags(rest, {'--json':'boolean'})
    if (positions.length>1) throw new Error('只指定一个项目目录')
    const target=resolve(cwd,positions[0]||'.')
    const args=[join(root,'scripts/check-conformance.mjs'),target]
    if(flags['--json'])args.push('--json')
    return printResult(capture(process.execPath,args,cwd,20000))
  }
  if (command === 'check' || command === 'pack') {
    const { flags, positions } = parseFlags(rest,command==='pack'?{'--dry-run':'boolean'}:{})
    if (positions.length>1) throw new Error('只指定一个项目目录')
    const target=resolve(cwd,positions[0]||'.')
    const checked=capture(process.execPath,[join(root,'scripts/check-workbench-package.mjs'),target],cwd,15000)
    const code=printResult(checked)
    if (code || command==='check') return code
    const project=JSON.parse(await readFile(join(target,'package.json'),'utf8'))
    const lifecycle=['prepack','prepare','postpack'].filter(name=>project.scripts?.[name])
    if(lifecycle.length) throw new Error('检测到打包生命周期脚本：'+lifecycle.join(', ')+'。当前 npm 的 --ignore-scripts 不能可靠阻止 prepare；CLI 停止打包。请审阅并使用项目明确批准的构建/打包流程。')
    const npmArgs=['pack','--ignore-scripts','--json']
    if(flags['--dry-run'])npmArgs.push('--dry-run')
    console.log('打包已构建入口；不会运行 build/prepare。需要构建的项目请先执行自己的构建命令。')
    const packed=capture('npm',npmArgs,target,60000)
    if (packed.code) return printResult(packed)
    const outputs=JSON.parse(packed.stdout).map(item=>({filename:item.filename,version:item.version,size:item.size,unpackedSize:item.unpackedSize,files:item.files?.length,integrity:item.integrity}))
    console.log(JSON.stringify({dryRun:Boolean(flags['--dry-run']),outputs,installedIntoDesktop:false},null,2))
    return 0
  }
  throw new Error('未知命令：'+command+'；运行 dsh-wb-cli --help 查看可用命令。')
}
