import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const checker=join(root,'templates/check-trial-snapshot.mjs')
const hash=(value)=>createHash('sha256').update(value).digest('hex')

async function fixture(t,{sponsorInSqlite=true}={}) {
 const dir=await mkdtemp(join(tmpdir(),'trial-snapshot-'))
 t.after(()=>rm(dir,{recursive:true,force:true}))
 await (await import('node:fs/promises')).mkdir(join(dir,'myeloma-cancer'))
 const dataDir=join(dir,'myeloma-cancer')
 const records=[{recordId:'ctv:UTN0001',mergedSources:['ctv:UTN0001'],sourceId:'ctv',title:'Example',studyType:'Interventional',sponsor:['Sponsor A'],registryNumbers:[{registry:'UTN',value:'UTN0001',primary:true}],dates:{registered:'2026-01-01'},sourceUrl:'https://example.test/trial',retrievedAt:'2026-01-02T00:00:00Z',statusNote:'登记状态，未核实',snapshotDate:'2026-01-03'}]
 const jsonl=records.map(JSON.stringify).join('\n')+'\n'
 const jsonlName='trials.jsonl',dbName='trials.sqlite'
 await writeFile(join(dataDir,jsonlName),jsonl)
 const db=new DatabaseSync(join(dataDir,dbName))
 db.exec(`CREATE TABLE trials(record_id TEXT PRIMARY KEY,merged_sources TEXT NOT NULL,source_id TEXT NOT NULL,title TEXT,study_type TEXT,sponsors TEXT,registry_numbers TEXT,dates TEXT,source_url TEXT,retrieved_at TEXT,status_note TEXT NOT NULL,snapshot_date TEXT NOT NULL); CREATE TABLE source_statuses(query TEXT NOT NULL,source_id TEXT,state TEXT,reason_code TEXT,coverage TEXT,completeness TEXT,total_records INTEGER);`)
 const row=records[0]
 db.prepare('INSERT INTO trials VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(row.recordId,JSON.stringify(row.mergedSources),row.sourceId,row.title,row.studyType,sponsorInSqlite?JSON.stringify(row.sponsor):null,JSON.stringify(row.registryNumbers),JSON.stringify(row.dates),row.sourceUrl,row.retrievedAt,row.statusNote,row.snapshotDate)
 db.prepare('INSERT INTO source_statuses VALUES(?,?,?,?,?,?,?)').run('myeloma','ctv','SUCCESS',null,'{}','{}',1)
 db.close()
 const manifest={recordCount:1,dbCount:1,sourceStatusRows:1,files:{[jsonlName]:{sha256:hash(jsonl)},[dbName]:{sha256:hash(await readFile(join(dataDir,dbName)))}}}
 await writeFile(join(dataDir,'manifest.json'),JSON.stringify(manifest,null,2))
 return dir
}

function run(dir,extra=[]) {
 return spawnSync(process.execPath,[checker,dir,...extra],{cwd:root,encoding:'utf8',timeout:20000})
}

test('accepts a consistent JSONL and SQLite snapshot',async t=>{
 const dir=await fixture(t)
 const result=run(dir)
 assert.equal(result.status,0,result.stdout+result.stderr)
 assert.match(result.stdout,/records=1/)
})

test('rejects a JSONL sponsor that was dropped from SQLite',async t=>{
 const dir=await fixture(t,{sponsorInSqlite:false})
 const result=run(dir)
 assert.equal(result.status,1,result.stdout+result.stderr)
 assert.match(result.stdout+result.stderr,/sponsor.*ctv:UTN0001|ctv:UTN0001.*sponsor/)
})

test('skips a missing snapshot only when explicitly optional',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trial-snapshot-empty-'))
 t.after(()=>rm(dir,{recursive:true,force:true}))
 await assert.rejects(readFile(join(dir,'manifest.json')))
 const result=run(dir,['--if-present'])
 assert.equal(result.status,0,result.stdout+result.stderr)
 assert.match(result.stdout,/SKIP/)
})
