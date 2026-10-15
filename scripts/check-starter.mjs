#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), errors=[]
async function walk(path) {
  const files=[]
  for(const e of await readdir(path,{withFileTypes:true})) {
    if(e.name==='node_modules'||e.name==='.git') continue
    const full=join(path,e.name)
    if(e.isDirectory()) files.push(...await walk(full));else files.push(full)
  }
  return files
}
const files=await walk(root)
for(const name of ['README.md','AGENTS.md','spec/STARTER-SPEC.md','docs/SOURCES.md','docs/LESSONS.md','project.config.example.json']) {
  try {await readFile(join(root,name))}catch{errors.push('Missing '+name)}
}
for(const path of files.filter(p=>p.endsWith('.json'))) {
  try{JSON.parse(await readFile(path,'utf8'))}catch(e){errors.push('Invalid JSON '+path+': '+e.message)}
}
for(const path of files.filter(p=>p.endsWith('.md')&&!p.includes('/reference/'))) {
  const s=await readFile(path,'utf8')
  for(const m of s.matchAll(/\]\(([^)]+)\)/g)) {
    const link=m[1].replace(/^<|>$/g,'').split('#')[0]
    if(!link||/^(https?:|mailto:|\/)/.test(link)) continue
    try{await readFile(resolve(dirname(path),link))}catch{errors.push('Broken local link '+path+' -> '+link)}
  }
}
const refs=JSON.parse(await readFile(join(root,'reference/sources.json'),'utf8'))
for(const entry of refs.sources.filter(s=>s.snapshot)) {
  const bytes=await readFile(join(root,entry.snapshot))
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256) errors.push('Official snapshot hash mismatch')
}
const assets=JSON.parse(await readFile(join(root,'assets/manifest.json'),'utf8'))
for(const entry of assets.assets.filter(s=>s.sha256)) {
  const bytes=await readFile(join(root,'assets',entry.path))
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256) errors.push('Asset hash mismatch '+entry.path)
}
console.log(JSON.stringify({ files:files.length, pass:errors.length===0, errors },null,2))
if(errors.length)process.exitCode=1
