import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, mkdir, rm, cp, access, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const starterVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version
const invoke=(args,cwd,source=root)=>spawnSync(process.execPath,[join(source,'bin/dsh-wb-cli.mjs'),...args],{cwd,encoding:'utf8',timeout:30000})
const git=(cwd,args)=>{const p=spawnSync('git',args,{cwd,encoding:'utf8',timeout:15000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout.trim()}
const commit=(cwd,message)=>{git(cwd,['add','.']);git(cwd,['-c','user.name=Starter Test','-c','user.email=starter-test@example.invalid','commit','-m',message])}
async function temp(t){const path=await mkdtemp(join(tmpdir(),'dsh-wb-cli-'));t.after(()=>rm(path,{recursive:true,force:true}));return path}
const cfg={packageName:'@community/cli-fixture',title:'CLI 合成测试',repository:'https://github.com/community/cli-fixture',description:'仅用于离线检查',slug:'cli-fixture',targetUsers:'虚构测试用户',scenario:'回看虚构记录',completion:'生成可检查的记录',coreFlow:['打开','回看'],layoutMode:'business-first'}
test('CLI version/help/doctor are usable and readonly',async t=>{
 const cwd=await temp(t)
 assert.equal(invoke(['--version'],cwd).stdout.trim(),starterVersion)
 assert.equal(invoke(['init','--help'],cwd).status,0)
 const report=invoke(['doctor','--json'],cwd);assert.equal(report.status,0,report.stderr);const data=JSON.parse(report.stdout);assert.equal(data.cli.version,starterVersion);assert.equal(data.desktop.installed,'未核验')
 assert.notEqual(invoke(['unknown-command'],cwd).status,0)
})
test('CLI prepare never overwrites, init discovers cwd config and records provenance',async t=>{
 const cwd=await temp(t)
 assert.equal(invoke(['init','--prepare'],cwd).status,0)
 const config=join(cwd,'project.config.json'),before=await readFile(config)
 assert.notEqual(invoke(['init','--prepare'],cwd).status,0);assert.deepEqual(await readFile(config),before)
 await writeFile(config,JSON.stringify(cfg))
 const target=join(cwd,'business')
 assert.equal(invoke(['init','business','--dry-run'],cwd).status,0);await assert.rejects(access(target))
 const result=invoke(['init','business'],cwd);assert.equal(result.status,0,result.stdout+result.stderr)
 const handoff=JSON.parse(result.stdout);assert.equal(handoff.stage,'designer-alignment')
 assert.equal(await realpath(handoff.designerPrompt),await realpath(join(target,'docs/DESIGN-PROMPT.md')))
 assert.ok(handoff.firstQuestion);await access(handoff.cancerPrompt)
 const source=JSON.parse(await readFile(join(target,'.dsh-wb-starter.json'),'utf8'));assert.equal(source.version,starterVersion);assert.equal(source.starter,'dsh-wb-cli');assert.equal(invoke(['check',target],cwd).status,0)
 for(const name of ['docs/09-WORKBENCH-STATUS.md','examples/workbench-status.mjs','docs/10-MARKET-PUBLISHING.md','templates/MARKET-ACCEPTANCE.md','prompts/MARKET-PUBLISH.md','docs/11-REUSABLE-PATTERNS.md','examples/progressive-disclosure.html','docs/12-AMAP-POI.md','examples/amap-poi-normalize.mjs','templates/POI-CAPABILITY.md']) await access(join(target,name))
 const pkg=await readFile(join(target,'package.json'));assert.notEqual(invoke(['init','business'],cwd).status,0);assert.deepEqual(await readFile(join(target,'package.json')),pkg)
})
test('provenance marker participates in preflight conflict checks',async t=>{
 const cwd=await temp(t),target=join(cwd,'business');await mkdir(target);await writeFile(join(cwd,'project.config.json'),JSON.stringify(cfg));await writeFile(join(target,'.dsh-wb-starter.json'),'existing marker')
 assert.notEqual(invoke(['init','business'],cwd).status,0);await assert.rejects(access(join(target,'package.json')));assert.equal(await readFile(join(target,'.dsh-wb-starter.json'),'utf8'),'existing marker')
})
test('successful init keeps structured handoff intact for long project paths',async t=>{
 const cwd=await temp(t)
 await writeFile(join(cwd,'project.config.json'),JSON.stringify(cfg))
 const target=join(cwd,...Array.from({length:8},(_,i)=>String(i)+'x'.repeat(94)),'business')
 const result=invoke(['init',target],cwd)
 assert.equal(result.status,0,result.stdout+result.stderr)
 assert.ok(result.stdout.length>4000)
 const handoff=JSON.parse(result.stdout)
 assert.equal(await realpath(handoff.designerPrompt),await realpath(join(target,'docs/DESIGN-PROMPT.md')))
 assert.equal(handoff.stage,'designer-alignment')
})
test('Git sync dry-run/fast-forward work; dirty and diverged clones are preserved',async t=>{
 const cwd=await temp(t),remote=join(cwd,'remote.git'),seed=join(cwd,'seed'),local=join(cwd,'local')
 git(cwd,['init','--bare',remote]);git(cwd,['init','-b','main',seed])
 for(const item of ['bin','cli','package.json'])await cp(join(root,item),join(seed,item),{recursive:true})
 await writeFile(join(seed,'README.md'),'v1');commit(seed,'initial');git(seed,['remote','add','origin',remote]);git(seed,['push','-u','origin','main']);git(cwd,['clone','--branch','main',remote,local])
 await writeFile(join(seed,'README.md'),'v2');commit(seed,'remote update');git(seed,['push'])
 assert.equal(invoke(['sync','--dry-run'],cwd,local).status,0);assert.equal(await readFile(join(local,'README.md'),'utf8'),'v1')
 const updated=invoke(['sync'],cwd,local);assert.equal(updated.status,0,updated.stdout+updated.stderr);assert.equal(await readFile(join(local,'README.md'),'utf8'),'v2')
 await writeFile(join(local,'README.md'),'uncommitted');assert.notEqual(invoke(['sync'],cwd,local).status,0);assert.equal(await readFile(join(local,'README.md'),'utf8'),'uncommitted')
 await writeFile(join(local,'README.md'),'v2');await writeFile(join(local,'local.txt'),'keep-local');commit(local,'local change')
 await writeFile(join(seed,'remote.txt'),'remote change');commit(seed,'diverging remote');git(seed,['push'])
 const rejected=invoke(['sync'],cwd,local);assert.notEqual(rejected.status,0);assert.equal(await readFile(join(local,'local.txt'),'utf8'),'keep-local');await assert.rejects(access(join(local,'remote.txt')))
})

test('CLI pack rejects lifecycle scripts before execution and packs built entries',async t=>{
 const cwd=await temp(t),target=join(cwd,'business');await writeFile(join(cwd,'project.config.json'),JSON.stringify(cfg));assert.equal(invoke(['init','business'],cwd).status,0)
 const path=join(target,'package.json'),p=JSON.parse(await readFile(path,'utf8'));p.scripts.prepare='node -e "require(\'fs\').writeFileSync(\'lifecycle-ran\',\'unexpected\')"';await writeFile(path,JSON.stringify(p))
 const rejected=invoke(['pack',target],cwd);assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/生命周期/);await assert.rejects(access(join(target,'lifecycle-ran')));await assert.rejects(access(join(target,'community-cli-fixture-0.1.0.tgz')))
 delete p.scripts.prepare;await writeFile(path,JSON.stringify(p));const result=invoke(['pack',target],cwd);assert.equal(result.status,0,result.stdout+result.stderr);await access(join(target,'community-cli-fixture-0.1.0.tgz'));assert.match(result.stdout,/"installedIntoDesktop": false/)
})
