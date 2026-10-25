#!/usr/bin/env node
/**
 * 装机目标检查：本包必须登记到 **DSH Desktop 实际加载的那个 Harness profile**。
 *
 * 判据不是目录名。2026-10-21 实测（DSH Desktop 0.12.0）：Desktop 用的是 app 自己的 Harness，
 *   macOS: ~/Library/Application Support/dsh-desktop/harness，活动 profile 名恰好叫 `web`
 *   Windows: %APPDATA%/dsh-desktop/harness（Electron userData 约定；未在 Windows 实测）
 * 而 `~/.dsh/profiles/*` 是 CLI 侧的另一份 Harness —— Desktop **不读**。
 * 另外 `package.json` 的 `dsh.client.platform = "web"` 指客户端运行环境，与装机目录无关。
 *
 * 2026-10-26 起这条是**最高优先级规则**（starter docs/37-DEPLOY-TARGET.md）：
 *   唯一目标 = DSH Desktop（io.dsh.desktop）自己的 harness profile；
 *   排除目标 = ① ~/.dsh/profiles/*（dsh CLI 侧）② DeepSeek Harness.app（com.deepseek.dsh，另一款 app）。
 *   没装 Desktop 时不再往下猜，直接给下载地址 https://www.dshdesktop.com/ 并退出 1。
 *
 * 用法：
 *   node scripts/check-install.mjs                  # 自动探测 Desktop Harness
 *   node scripts/check-install.mjs --home <dir> --profile <name>
 *   node scripts/check-install.mjs --json
 * 退出码：0 = 已在 Desktop 实际加载的 profile 中登记；1 = 未装 Desktop、未登记，或只登记在别处。
 *
 * 反向对照（改这里的话必须自己验一次）：`DSH_DESKTOP_APP=none` 模拟"没装 Desktop"，
 * 应当打印下载地址并退出 1；`DSH_DESKTOP_APP=<path>` 指定 app 位置。别只验正向。
 *
 * 这个脚本只做**只读核对**，不写任何文件；装包命令请用目标版本明确支持的入口。
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/** 没装 Desktop 时给用户的唯一出口。别换成搜索结果或第三方镜像。 */
const DOWNLOAD_URL = 'https://www.dshdesktop.com/';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? resolve(args[i + 1]) : null;
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const NAME = pkg.name;

function appSupportRoot() {
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support');
  if (process.platform === 'win32') return process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

/** DSH Desktop 自身的安装位置（只用于回答"这台机器到底装没装"）。 */
function desktopAppPaths() {
  if (process.platform === 'darwin') {
    return ['/Applications/DSH Desktop.app', join(homedir(), 'Applications', 'DSH Desktop.app')];
  }
  if (process.platform === 'win32') {
    return [
      join(process.env.LOCALAPPDATA || '', 'Programs', 'DSH Desktop'),
      join(process.env.ProgramFiles || 'C:\\Program Files', 'DSH Desktop'),
    ];
  }
  return [];
}
const simulatedAbsent = process.env.DSH_DESKTOP_APP === 'none';
const desktopApp = simulatedAbsent
  ? null
  : process.env.DSH_DESKTOP_APP || desktopAppPaths().find((p) => existsSync(p)) || null;

const appHome = join(appSupportRoot(), 'dsh-desktop', 'harness');
/** Desktop 真的在这台机器上的证据：app 安装位置，或它已经跑过一次留下的 desktop-workbenches。 */
const harnessSeen =
  !simulatedAbsent &&
  (existsSync(join(appHome, 'desktop-workbenches', 'state.json')) ||
    existsSync(join(appHome, 'desktop-workbenches', 'market-installs.json')));
const desktopPresent = Boolean(desktopApp) || harnessSeen;

/** 另一款 app：DeepSeek Harness（com.deepseek.dsh）。装了也不是目标，只用于把话说明白。 */
function otherDesktopApps() {
  const list = [];
  if (process.platform === 'darwin') {
    for (const p of ['/Applications/DeepSeek Harness.app', join(homedir(), 'Applications', 'DeepSeek Harness.app')]) {
      if (existsSync(p)) list.push({ label: 'DeepSeek Harness.app（com.deepseek.dsh）', path: p });
    }
  }
  if (process.platform === 'win32') {
    const p = join(process.env.LOCALAPPDATA || '', 'Programs', 'DeepSeek Harness');
    if (existsSync(p)) list.push({ label: 'DeepSeek Harness（com.deepseek.dsh）', path: p });
  }
  return list;
}

/** 候选 Harness：先 Desktop app 自己的，再 DSH_HOME，最后 CLI 侧（只用于提示"装错地方"）。 */
function candidates() {
  const explicitHome = argValue('--home');
  const explicitProfile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : null;
  if (explicitHome) {
    return [{ label: '手动指定（--home）', home: explicitHome, profile: explicitProfile || 'web', live: true }];
  }

  const list = [];
  list.push({
    label: 'DSH Desktop Harness（app 自带，唯一目标）',
    home: appHome,
    profile: explicitProfile || 'web',
    // "活动 profile" 的两个证据：state.json（宿主登记过工作台）或市场安装记录。
    // 但 Desktop 不在机器上时这不算——目录可能是卸载残留，判它"活着"会掩盖"没装"。
    live: desktopPresent && harnessSeen,
  });

  if (process.env.DSH_HOME) {
    list.push({ label: 'DSH_HOME 环境变量', home: resolve(process.env.DSH_HOME), profile: explicitProfile || 'web' });
  }

  const cliHome = join(homedir(), '.dsh');
  list.push({ label: 'CLI Harness（~/.dsh，Desktop 不读）', home: cliHome, profile: 'web' });
  list.push({ label: '旧结论 desktop profile（~/.dsh/profiles/desktop，Desktop 不读）', home: cliHome, profile: 'desktop' });
  return list;
}

function readProfile(home, profile) {
  const file = join(home, 'profiles', profile, 'package.json');
  if (!existsSync(file)) return null;
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return {
      file,
      dep: json.dependencies?.[NAME] ?? null,
      bundled: (json.dsh?.profile?.bundles ?? []).includes(NAME),
    };
  } catch (error) {
    return { file, error: error.message };
  }
}

/** 市场安装记录：有记录=被市场认作「已安装」，无记录=手工/native 安装。 */
function marketRecord(home) {
  const file = join(home, 'desktop-workbenches', 'market-installs.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const repo = (pkg.repository?.url || pkg.repository || '').replace(/^git\+/, '').replace(/\.git$/, '');
    return (
      Object.values(data.installs || {}).find(
        (item) => item.pluginName === NAME || (repo && item.catalogId && repo.toLowerCase().endsWith(item.catalogId.toLowerCase())),
      ) || null
    );
  } catch {
    return null;
  }
}

const all = candidates().map((c) => ({ ...c, entry: readProfile(c.home, c.profile) }));
const live =
  all.find((c) => c.live === true) ||
  // 退一步只认"profile 文件在"时也必须过 desktopPresent 这一关：
  // 否则 app 已经卸载、只剩残留目录时，脚本照样报"判定基准 Desktop"，把"没装"盖掉。
  (desktopPresent && all.find((c) => c.label.startsWith('DSH Desktop') && c.entry)) ||
  all.find((c) => c.label.startsWith('DSH_HOME') && c.entry) ||
  null;

const lines = [];
let ok = false;

if (!live) {
  // 先说"这台机器上有没有这个 app"，再说"profile 在哪"。两件事分开讲，
  // 否则用户看到"找不到 Harness"会以为是自己装坏了。
  if (!desktopPresent) {
    lines.push('✗ 这台机器上没有找到 DSH Desktop（io.dsh.desktop）。');
    lines.push(`  请先到 ${DOWNLOAD_URL} 下载安装，装完至少启动一次（首次启动才会生成 Harness 目录）。`);
    lines.push('  工作台只部署到 DSH Desktop 自己的 Harness profile；不装到 ~/.dsh，也不装到 DeepSeek Harness。');
  } else {
    lines.push(`✓ 找到 ${desktopApp || '（app 位置未识别，但有 harness 目录）'}`);
    lines.push(`✗ 但它还没有可用的 Harness 数据目录：${appHome}`);
    lines.push('  安装后至少启动一次 DSH Desktop（首次启动才写 state.json），再回来重跑本脚本。');
  }
} else {
  lines.push(`判定基准：${live.label} → ${join(live.home, 'profiles', live.profile)}`);
  const entry = live.entry;
  if (!entry) {
    lines.push(`✗ 这个 profile 下没有 package.json：${join(live.home, 'profiles', live.profile, 'package.json')}`);
  } else if (entry.error) {
    lines.push(`✗ package.json 读不了：${entry.error}`);
  } else if (!entry.dep) {
    lines.push(`✗ dependencies 里没有 ${NAME}——Desktop 不会加载这个工作台。`);
  } else if (!entry.bundled) {
    lines.push(`✗ 依赖装了（${entry.dep}）但 dsh.profile.bundles 里没有 ${NAME}——不会加载。`);
  } else {
    ok = true;
    lines.push(`✓ ${NAME} 已登记到 Desktop 实际加载的 profile（${entry.dep}）`);
    const rec = marketRecord(live.home);
    lines.push(
      rec
        ? `✓ 市场安装记录：${rec.catalogId} · ${rec.version} · ${rec.source}`
        : '! 无市场安装记录：属手工/native 安装，市场里可能不显示「已安装」，也未必支持 app 内卸载。',
    );
  }
}

for (const c of all) {
  if (c === live || !c.entry?.dep) continue;
  lines.push(`! 另在「${c.label}」也装了（${c.entry.dep}）——那是另一份 Harness，不能替 Desktop 验收。`);
}

// 装了别的 Harness app 也要点出来：它跟目标无关，但用户很容易以为"都是 DSH"。
const others = otherDesktopApps();
for (const app of others) {
  lines.push(`! 机器上还有 ${app.label}（${app.path}）—— 不是部署目标，profile 不与 DSH Desktop 共享。`);
}

if (!ok) {
  lines.push('');
  lines.push('目标只有一台：DSH Desktop（io.dsh.desktop）自己的 harness profile。');
  if (live) {
    lines.push('装包命令（目标版本明确支持本地 tgz 时才用；先查 `dsh plugin add --help`）：');
    lines.push(`  export DSH_HOME="${live.home}"`);
    lines.push(`  export PATH="$DSH_HOME/.desktop-bin:$PATH"   # 用 app 自带的 pnpm / node`);
    lines.push(`  NODE_OPTIONS= npx --yes pnpm@10.15.0 --dir "$DSH_HOME/profiles/${live.profile}" add -w ./release/<包名>-<版本>.tgz`);
    lines.push(`  再把 ${NAME} 加进 "$DSH_HOME/profiles/${live.profile}/package.json" 的 dsh.profile.bundles，重启 Harness。`);
    lines.push('不要装到 ~/.dsh/profiles/*——Desktop 不读那里，装上也只是「配置层有了」。');
  }
}

if (jsonOut) {
  console.log(
    JSON.stringify(
      {
        package: NAME,
        desktopApp,
        desktopPresent,
        target: live ? { label: live.label, home: live.home, profile: live.profile } : null,
        ok,
        download: DOWNLOAD_URL,
        otherDesktopApps: others,
        lines,
      },
      null,
      2,
    ),
  );
} else {
  console.log(lines.join('\n'));
}
process.exit(ok ? 0 : 1);
