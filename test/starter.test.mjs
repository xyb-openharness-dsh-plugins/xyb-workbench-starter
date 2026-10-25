import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, mkdir, rm, cp, access, symlink } from 'node:fs/promises'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { readOwnership } from '../examples/ownership-adapter.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const config={ packageName:'@community/demo-workbench',title:'测试工作台',repository:'https://github.com/community/demo-workbench',description:'仅离线生成检查，不安装到宿主',slug:'demo-workbench',layoutMode:'business-first',businessWidth:.65,targetUsers:'虚构测试用户',scenario:'管理虚构任务记录',coreFlow:['打开列表','记录并回顾结果'],completion:'可回顾的虚构条目' }
const run=(file,args=[],cwd=root)=>spawnSync(process.execPath,[file,...args],{cwd,encoding:'utf8',timeout:20000})
const runEnv=(file,args=[],env=process.env)=>spawnSync(process.execPath,[file,...args],{env,encoding:'utf8',timeout:20000})
async function fixture(t,cfg=config){const dir=await mkdtemp(join(tmpdir(),'wb-starter-'));t.after(()=>rm(dir,{recursive:true,force:true}));const source=join(dir,'config.json');await writeFile(source,JSON.stringify(cfg));return {dir,source,target:join(dir,'project')}}
const init=(f,source=root,extra=[])=>run(join(source,'scripts/init.mjs'),['--config',f.source,'--target',f.target,...extra])
test('dry run writes nothing; generate split/customFrame; refuse overwrite without changing files',async t=>{
 const f=await fixture(t);let r=init(f,root,['--dry-run']);assert.equal(r.status,0,r.stderr);await assert.rejects(access(f.target))
 r=init(f);assert.equal(r.status,0,r.stderr)
 await access(join(f.target,'docs/METRIC-TREND-SPEC.md'))
 await access(join(f.target,'docs/24-METRIC-TREND-TAB-DESIGN.md'))
 await access(join(f.target,'prompts/METRIC-TREND-TAB.md'))
 const path=join(f.target,'lib/client.js'),before=await readFile(path)
 assert.equal(run(join(root,'scripts/check-workbench-package.mjs'),[f.target]).status,0)
 assert.equal(run('--check',[path]).status,0)
 assert.equal(run('--check',[join(f.target,'dsh/index.js')]).status,0)
 assert.match(before.toString(),/"customFrame":true/)
 r=init(f);assert.notEqual(r.status,0);assert.match(r.stderr,/Existing files/);assert.deepEqual(await readFile(path),before)
 const split=await fixture(t,{...config,layoutMode:'split'});r=init(split);assert.equal(r.status,0,r.stderr);assert.match(await readFile(join(split.target,'lib/client.js'),'utf8'),/"businessWidth":0.65/)
})
test('ships the host-contract gate (businessWidth > 0.7 crashes the target Desktop)',async t=>{
 const p=await fixture(t,config);const r=init(p);assert.equal(r.status,0,r.stderr)
 // 宿主 register() 硬上限 0.7：越界会让插件激活失败、DSH Desktop 起不来，本地 check 必须拦得住
 const gate=await readFile(join(p.target,'scripts/check-host-contract.mjs'),'utf8')
 assert.match(gate,/width < 0\.25 \|\| width > 0\.7/)
 const pkg=JSON.parse(await readFile(join(p.target,'package.json'),'utf8'))
 assert.match(pkg.scripts.check,/check-host-contract/)
 assert.match(pkg.scripts['check:host'],/check-host-contract/)
 // 派生项目就地跑得起来
 const gateRun=run(join(p.target,'scripts/check-host-contract.mjs'),[],p.target)
 assert.equal(gateRun.status,0,gateRun.stderr)
})
test('ships the activation smoke test (apply() must run, host 7 checks must pass, 0.72 must fail)',async t=>{
 const p=await fixture(t,config);const r=init(p);assert.equal(r.status,0,r.stderr)
 const pkg=JSON.parse(await readFile(join(p.target,'package.json'),'utf8'))
 assert.match(pkg.scripts.check,/smoke-activate/)
 assert.match(pkg.scripts['smoke:activate'],/smoke-activate/)
 // 正例：生成的骨架必须真的能走完 apply() -> register()
 const ok=run(join(p.target,'scripts/smoke-activate.mjs'),[],p.target)
 assert.equal(ok.status,0,ok.stderr);assert.match(ok.stdout,/apply\(\) 走通/)
 // 反向对照：宿主硬上限 0.7 的越界值必须被判死，否则烟测只是个新的错觉来源。
 // business-first 骨架不写 businessWidth（走宿主默认），所以拿 split 那份注入越界值。
 const sp=await fixture(t,{...config,layoutMode:'split'});assert.equal(init(sp).status,0)
 const client=join(sp.target,'lib/client.js')
 assert.match(await readFile(client,'utf8'),/businessWidth/)
 await writeFile(client,(await readFile(client,'utf8')).replace(/"businessWidth": *[0-9.]+/,'"businessWidth":0.72'))
 const bad=run(join(sp.target,'scripts/smoke-activate.mjs'),[],sp.target)
 assert.notEqual(bad.status,0);assert.match(bad.stderr+bad.stdout,/between 0\.25 and 0\.7/)
})
test('ships the desktop-load verifier (two apps / stale log lines must not be misread)',async t=>{
 const p=await fixture(t,config);const r=init(p);assert.equal(r.status,0,r.stderr)
 const pkg=JSON.parse(await readFile(join(p.target,'package.json'),'utf8'))
 assert.match(pkg.scripts['verify:desktop'],/verify-desktop-load/)
 const script=join(p.target,'scripts/verify-desktop-load.mjs')
 await access(script)
 // 生成的项目还没装进宿主：必须给「未运行/未重启」这类可读结论，而不是抛栈
 const out=run(script,[],p.target)
 assert.match(out.stdout+out.stderr,/界面加载核验/)
 assert.match(out.stdout,/DSH Desktop harness|dshHomePath/)
 // 反例一：DSH Desktop 未运行（日志以 exited 收尾）→ 不许报「激活失败」
 const fake=mkdtempSync(join(tmpdir(),'vd-'))
 const harness=join(fake,'harness'),profile=join(harness,'profiles/web')
 mkdirSync(join(profile,'node_modules',...JSON.parse(await readFile(join(p.target,'package.json'),'utf8')).name.split('/')),{recursive:true})
 await writeFile(join(profile,'package.json'),JSON.stringify({dsh:{profile:{bundles:['@community/other-workbench']}}}))
 mkdirSync(join(harness,'.xdpool'),{recursive:true})
 await writeFile(join(harness,'.xdpool/startup.log'),'2026-01-01T00:00:00.000Z boot\n')
 const log=join(fake,'harness.log')
 await writeFile(log,['[renderer] web boot: 1 entry did not activate','[2026-01-01T00:05:00.000Z] +1ms [node] Harness process exited (exit code 0)'].join('\n')+'\n')
 const notRunning=runEnv(script,[],{...process.env,HN_HARNESS:harness,HN_LOG:log})
 assert.equal(notRunning.status,2,notRunning.stdout+notRunning.stderr)
 assert.doesNotMatch(notRunning.stdout,/激活失败/)
 // 反例二：本次运行段里的 did not activate 才算失败
 await writeFile(log,['[2026-01-01T00:05:00.000Z] +1ms [node] Harness process exited (exit code 0)','[2026-01-01T09:00:00.000Z] +800ms [renderer] web boot: 1 entry did not activate'].join('\n')+'\n')
 const failed=runEnv(script,[],{...process.env,HN_HARNESS:harness,HN_LOG:log})
 assert.equal(failed.status,1,failed.stdout+failed.stderr)
})
test('unclear business requirement, unsafe slug/repository, invalid layout reject before writes',async t=>{
 for(const delta of [{targetUsers:''},{coreFlow:[]},{slug:'../../escape'},{repository:'https://not-github.invalid/a/b'},{layoutMode:'unknown'},{layoutMode:'split',businessWidth:.9},{layoutMode:'business-first',businessWidth:.72},{layoutMode:'business-first',businessWidth:.2}]){
  const f=await fixture(t,{...config,...delta});assert.notEqual(init(f).status,0);await assert.rejects(access(f.target))
 }
})
test('destination conflicts preflight; symlink directory rejected',async t=>{
 const f=await fixture(t);await mkdir(f.target);await writeFile(join(f.target,'README.md'),'keep me');assert.notEqual(init(f).status,0);assert.equal(await readFile(join(f.target,'README.md'),'utf8'),'keep me');await assert.rejects(access(join(f.target,'package.json')))
 const other=await fixture(t);await mkdir(other.target);await mkdir(join(other.dir,'outside'));await symlink(join(other.dir,'outside'),join(other.target,'docs'),'dir');assert.notEqual(init(other).status,0);await assert.rejects(access(join(other.target,'package.json')))
})
test('relocated starter has no dependency on original source paths',async t=>{
 const f=await fixture(t);const copied=join(f.dir,'copied-starter');await cp(root,copied,{recursive:true});const r=init(f,copied);assert.equal(r.status,0,r.stderr);assert.equal(run(join(copied,'scripts/check-workbench-package.mjs'),[f.target],f.dir).status,0)
})
test('checker detects mismatched loader identity and missing runtime entry',async t=>{
 const f=await fixture(t);assert.equal(init(f).status,0)
 const path=join(f.target,'lib/client.js');const s=await readFile(path,'utf8');await writeFile(path,s.replace('id: "@community/demo-workbench"','id: "wrong-package"'));const result=run(join(root,'scripts/check-workbench-package.mjs'),[f.target]);assert.notEqual(result.status,0);assert.match(result.stdout,/loader id/)
 await rm(path);assert.notEqual(run(join(root,'scripts/check-workbench-package.mjs'),[f.target]).status,0)
})
test('caller data is encoded once, not evaluated or recursively substituted',async t=>{
 const f=await fixture(t,{...config,title:'测试 " 引号 @@TITLE@@ ${process.exit(1)}'});const result=init(f);assert.equal(result.status,0,result.stderr);assert.equal(run('--check',[join(f.target,'lib/client.js')]).status,0);assert.equal(JSON.parse(await readFile(join(f.target,'package.json'),'utf8')).description,config.description)
})
test('ownership guard is unavailable by default; never silently false or new session',()=>{
 const service={ownsSession(){throw new Error('Workbench registration requires a client package entry name.')}}
 assert.deepEqual(readOwnership({service,sessionId:'s1',entryId:'a/b'}),{status:'unavailable',reason:'service-context-guard'})
 assert.equal(readOwnership({service:{ownsSession(){return false}},sessionId:'s1',entryId:'a/b'}).status,'not-owned')
 assert.equal(readOwnership({service:{},sessionId:'s1',entryId:'a/b'}).status,'unavailable')
})
test('legacy UI-only ownership fallback is explicit, version-bound, read-only',()=>{
 const bindings=Object.freeze({s1:'a/b',s2:'other/project'}),service={ownsSession(){throw new Error('Workbench registration requires a client package entry name.')}}
 const legacy={enabled:true,desktopVersion:'0.11.1',harnessVersion:'0.2.0-rc.2',readBindings:()=>bindings}
 assert.equal(readOwnership({service,sessionId:'s1',entryId:'a/b',legacy}).status,'owned')
 assert.equal(readOwnership({service,sessionId:'s2',entryId:'a/b',legacy}).status,'not-owned')
 assert.equal(readOwnership({service,sessionId:'s1',entryId:'a/b',legacy:{...legacy,desktopVersion:'future'}}).status,'unavailable')
 assert.equal(readOwnership({service:{ownsSession(){return false}},sessionId:'s1',entryId:'a/b',legacy}).status,'not-owned')
 assert.deepEqual(bindings,{s1:'a/b',s2:'other/project'})
})

test('generated asset provenance has no developer absolute path; standard npm git+ repository accepted',async t=>{
 const f=await fixture(t);assert.equal(init(f).status,0)
 const assets=await readFile(join(f.target,'assets/manifest.json'),'utf8');assert.doesNotMatch(assets,/\/Users\/|[A-Z]:\\/)
 const path=join(f.target,'package.json'),p=JSON.parse(await readFile(path,'utf8'));p.repository.url='git+https://github.com/community/demo-workbench.git';await writeFile(path,JSON.stringify(p));const check=run(join(root,'scripts/check-workbench-package.mjs'),[f.target]);assert.equal(check.status,0,check.stdout+check.stderr)
})
test('initializer rejects unexpected secret fields rather than copying them',async t=>{
 const f=await fixture(t,{...config,apiToken:'example-not-a-real-token'});const result=init(f);assert.notEqual(result.status,0);assert.match(result.stderr,/Unknown config key/);await assert.rejects(access(f.target))
})

test('generated project carries the family audit: VERSION, CHANGELOG and a runnable audit entry',async t=>{
 const f=await fixture(t);const result=init(f);assert.equal(result.status,0,result.stderr)
 // 版本唯一来源与变更记录从第一天就存在，audit 的 version/file 与 version/pkg 才有东西可比
 assert.equal((await readFile(join(f.target,'VERSION'),'utf8')).trim(),'0.1.0')
 const changelog=await readFile(join(f.target,'CHANGELOG.md'),'utf8');assert.match(changelog,/## 0\.1\.0/);assert.match(changelog,/community\/demo-workbench|dsh-wb-cli/)
 const pkg=JSON.parse(await readFile(join(f.target,'package.json'),'utf8'))
 assert.equal(pkg.version,'0.1.0')
 assert.equal(pkg.scripts.audit,'node scripts/check-conformance.mjs .')
 assert.match(pkg.scripts['release:check'],/npm run check && npm run test && npm run audit/)
 // 装机测试从第一天就存在：静态检查只看源码树，看不出发出去的包少了什么
 await access(join(f.target,'test/pack-contents.test.mjs'))
 assert.equal(pkg.scripts.test,'node --test test/*.test.mjs')
 await access(join(f.target,'scripts/check-conformance.mjs'))
 // 在生成项目自己的目录里跑得起来，不依赖 starter
 const audit=run(join(f.target,'scripts/check-conformance.mjs'),['.'],f.target)
 assert.equal(audit.status,1,'新项目必然有 fail，但必须是"查出的 fail"而不是崩溃')
 assert.doesNotMatch(audit.stderr,/Cannot find|SyntaxError|Error:/)
 assert.match(audit.stdout,/version\/lib/)
 const json=run(join(f.target,'scripts/check-conformance.mjs'),['.','--json'],f.target)
 const payload=JSON.parse(json.stdout)
 assert.equal(payload.package,'@community/demo-workbench')
 assert.equal(payload.pass,false)
 assert.ok(payload.summary.checks>=25,payload.summary.checks)
 assert.ok(payload.fails.some((item)=>item.id==='panel/单一来源'))
 // check 与 audit 分工:check 第一天就该是绿的
 assert.equal(run(join(root,'scripts/check-workbench-package.mjs'),[f.target]).status,0)
})

test('init hands off existing designer documents before product specification, including relocated paths',async t=>{
 const f=await fixture(t);f.target=join(f.dir,'患者 project')
 const dry=init(f,root,['--dry-run']);assert.equal(dry.status,0,dry.stderr)
 assert.equal(JSON.parse(dry.stdout).dryRun,true);await assert.rejects(access(f.target))
 const result=init(f);assert.equal(result.status,0,result.stderr)
 const handoff=JSON.parse(result.stdout);assert.equal(handoff.stage,'designer-alignment')
 for(const key of ['designerPrompt','cancerPrompt','agentPanePrompt','designerBrief','designSession','prototypeReview','settingsDesign']) {
  assert.ok(handoff[key].startsWith(f.target+'/'),key)
  assert.ok((await readFile(handoff[key],'utf8')).length>100,key)
 }
 assert.ok(handoff.firstQuestion);assert.match(handoff.next,/Agent/);assert.match(handoff.firstQuestion,/右侧/)
 const brief=await readFile(join(f.target,'docs/BRIEF.md'),'utf8')
 assert.match(brief,/初始化配置/);assert.match(brief,/不是|不能/)
 const session=await readFile(handoff.designSession,'utf8');assert.match(session,/designer-alignment/)
 const cancer=await readFile(handoff.cancerPrompt,'utf8')
 assert.match(cancer,/患者与照护者/);assert.match(cancer,/独立 review/)
 const agentPane=await readFile(handoff.agentPanePrompt,'utf8')
 assert.match(agentPane,/右侧/);assert.match(agentPane,/可拖动/);assert.match(agentPane,/隐藏与重开/);assert.match(agentPane,/创建一次/)
 assert.doesNotMatch(cancer,/\/Users\/qinxiaoqiang/)
 await access(join(f.target,'docs/DESIGN-REVIEW.md'))
 for(const name of ['SCHEMA.md','API-CONTRACT.md','UI-DESIGN.md','SETTINGS-DESIGN.md','PARITY.csv','PROTOTYPE-REVIEW.md','17-CLOSED-LOOP-PROJECT-FLOW.md']) await access(join(f.target,'docs',name))
 const lifecycle=await readFile(join(f.target,'docs/17-CLOSED-LOOP-PROJECT-FLOW.md'),'utf8')
 assert.match(lifecycle,/DSH Desktop app/);assert.match(lifecycle,/>98%/);assert.match(lifecycle,/9 个月/)
 assert.match(await readFile(handoff.prototypeReview,'utf8'),/待制作\/预览\/用户确认/)
 const preserved=await readFile(handoff.designerPrompt)
 assert.notEqual(init(f).status,0)
 assert.deepEqual(await readFile(handoff.designerPrompt),preserved)
})
