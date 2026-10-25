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
for(const name of ['docs/24-METRIC-TREND-TAB-DESIGN.md','templates/METRIC-TREND-SPEC.md','prompts/METRIC-TREND-TAB.md','README.md','CHANGELOG.md','AGENTS.md','spec/STARTER-SPEC.md','docs/SOURCES.md','docs/LESSONS.md','docs/09-WORKBENCH-STATUS.md','docs/10-MARKET-PUBLISHING.md','docs/11-REUSABLE-PATTERNS.md','docs/15-HVT-REVIEW.md','docs/16-ONE-CHART-SPEC.md','docs/18-MINERU-PARSING.md','scripts/check-conformance.mjs','docs/19-PROTOTYPE-CRAFT.md','docs/20-AGENT-PANE-DESIGN.md','docs/21-RESEARCH-PLAYBOOK.md','docs/22-PHASES-AND-GATES.md','examples/workbench-status.mjs','examples/progressive-disclosure.html','examples/mineru-labparse-align.mjs','templates/MARKET-ACCEPTANCE.md','templates/HVT-REVIEW.md','templates/ONE-CHART-SPEC.md','prompts/MARKET-PUBLISH.md','project.config.example.json','prompts/DESIGNER-FIRST.md','prompts/NEW-CANCER-WORKBENCH.md','templates/DESIGNER-BRIEF.md','templates/DESIGN-REVIEW.md','docs/13-DESIGNER-FIRST.md','docs/14-HTML-AND-DATA-CONTRACT.md','templates/PROTOTYPE-REVIEW.md','templates/SETTINGS-DESIGN.md','project-template/scripts/serve-artifact.mjs','project-template/scripts/verify-tabs-on-artifact.py','project-template/test/pack-contents.test.mjs','project-template/scripts/check-assertion-strength.mjs','docs/32-FULL-PAGE-VIEW.md','templates/FULL-PAGE-VIEW.md','assets/patterns/page-view.js','assets/patterns/page-view.css','examples/page-view.html','examples/page-view-standalone.html','scripts/probe-page-view.mjs']) {
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
