/* 包检查器「装机面」两条规则的回归（2026-10-24 ATTR 装机双踩回收）。
 *
 * 这两条规则的价值不在"能查出什么"，而在"不会乱点名"：
 * ⑤ 只对**自己声明了 root** 的包生效（肝癌仓故意用 dbPath 指仓内演示库，不该被点名）；
 * ⑥ 只看运行期相对 import 的落点是否被 files 覆盖（ATTR 0.2.1 的 `../demo/build-demo-data.mjs`）。
 * 所以测试分成"必须报"和"必须不报"两半。
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';

const CHECKER = resolve(import.meta.dirname, '..', 'scripts', 'check-workbench-package.mjs');
const tmpRoot = mkdtempSync(join(homedir(), '.xyb-starter-checker-'));
after(() => { try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* 清理失败不影响结论 */ } });

let seq = 0;
function fixture({ files = ['dsh', 'public'], withRoot = true, extraImport = null, publicIndex = true }) {
  const dir = join(tmpRoot, `p${seq += 1}`);
  mkdirSync(join(dir, 'dsh'), { recursive: true });
  mkdirSync(join(dir, 'lib'), { recursive: true });
  if (publicIndex) mkdirSync(join(dir, 'public'), { recursive: true });
  const cfg = withRoot ? "export const Config = Schema.object({\n  root: Schema.string().required(),\n})\n" : "export const Config = Schema.object({\n  dbPath: Schema.string().default(''),\n})\n";
  writeFileSync(join(dir, 'dsh/index.js'), [
    "import Schema from '@deepseek-ai/schemastery'",
    extraImport ? `import { x } from '${extraImport}'` : '',
    "export const name = 'demo-pkg'",
    "export const inject = ['webServer', 'connection']",
    cfg,
    'export function apply(ctx) { return ctx }',
  ].join('\n'));
  writeFileSync(join(dir, 'lib/client.js'),
    "window.__ModuleLoader__.load({ id: 'demo-pkg', factory(require) {\n" +
    "  const UI = '/api/demo/ui/index.html'\n" +
    '  return { apply(ctx) { ctx.effect(() => ctx.desktopWorkbenches.register({ repository: "https://github.com/x/y", title: "t" }, () => null)) } }\n' +
    '} })\n');
  if (publicIndex) writeFileSync(join(dir, 'public/index.html'), '<html><head><link rel="stylesheet" href="style.css"></head><body></body></html>');
  writeFileSync(join(dir, 'cordis.patch.yml'),
    withRoot
      ? "- insert:\n    - id: demo-main\n      name: \"demo-pkg\"\n      config:\n        root: !!js dshHomePath('demo')\n"
      : "- insert:\n    - id: demo-main\n      name: \"demo-pkg\"\n");
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'demo-pkg', version: '0.1.0', main: './dsh/index.js',
    exports: { '.': './dsh/index.js', './client': './lib/client.js' },
    repository: 'https://github.com/x/y',
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } },
    files,
  }, null, 2));
  return dir;
}

function run(dir) {
  return new Promise((ok) => {
    execFile(process.execPath, [CHECKER, dir], { env: { ...process.env, NODE_OPTIONS: '' } }, (error, stdout) => {
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch { /* 崩溃时没有 JSON */ }
      ok({ code: error?.code ?? 0, out: parsed, raw: stdout });
    });
  });
}

test('① 运行期相对 import 不在 files 里 → 必须报（ATTR 0.2.1 装机 Cannot find module）', async () => {
  const dir = fixture({ extraImport: '../demo/build-demo-data.mjs' });
  mkdirSync(join(dir, 'demo'), { recursive: true });
  writeFileSync(join(dir, 'demo/build-demo-data.mjs'), 'export const x = 1\n');
  const { code, out } = await run(dir);
  assert.equal(code, 1);
  assert.ok(out.errors.some((e) => /not covered by files allowlist/.test(e) && /demo\/build-demo-data\.mjs/.test(e)),
    `应报 demo 模块未进包，实际：${out.errors.join(' | ')}`);
});

test('② 把该文件补进 files → 不报（证明规则能被打包修好，不是死判）', async () => {
  const dir = fixture({ extraImport: '../demo/build-demo-data.mjs', files: ['dsh', 'public', 'demo/build-demo-data.mjs'] });
  mkdirSync(join(dir, 'demo'), { recursive: true });
  writeFileSync(join(dir, 'demo/build-demo-data.mjs'), 'export const x = 1\n');
  const { out } = await run(dir);
  assert.ok(!out.errors.some((e) => /not covered/.test(e)), out.errors.join(' | '));
});

test('③ public/ 在但没进 files → 必须报（装机后业务区空白）', async () => {
  const dir = fixture({ files: ['dsh'] });
  const { code, out } = await run(dir);
  assert.equal(code, 1);
  assert.ok(out.errors.some((e) => /public\/ exists but is not covered/.test(e)), out.errors.join(' | '));
});

test('④ Config 声明 root 但 patch 没注入 → 必须报（重启回内存库）', async () => {
  const dir = fixture({ withRoot: true });
  writeFileSync(join(dir, 'cordis.patch.yml'), "- insert:\n    - id: demo-main\n      name: \"demo-pkg\"\n");
  const { code, out } = await run(dir);
  assert.equal(code, 1);
  assert.ok(out.errors.some((e) => /Config declares root but cordis.patch.yml has no config\.root/.test(e)), out.errors.join(' | '));
});

test('⑤ Config 不声明 root（dbPath 型）→ 不报（禁止把个案推广为规则）', async () => {
  const dir = fixture({ withRoot: false });
  const { out } = await run(dir);
  assert.ok(!out.errors.some((e) => /config\.root/.test(e)), `dbPath 型包不该被点名：${out.errors.join(' | ')}`);
});

test('⑥ UI 挂子路径 + 页面用相对资源 → 给 warn（静态只能提示，真验靠装机探针）', async () => {
  const dir = fixture({});
  const { out } = await run(dir);
  assert.ok(out.warnings.some((w) => /子路径且页面使用相对资源/.test(w)), out.warnings.join(' | '));
});
