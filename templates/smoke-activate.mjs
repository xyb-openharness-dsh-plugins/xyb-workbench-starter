#!/usr/bin/env node
/**
 * 激活烟测：在 Node 里把插件真的「装一遍 + 渲染一遍」，而不是 grep 常量。
 *
 * ## 为什么要有这个脚本
 * 2026-10-25 head-neck-workbench 0.1.0–0.1.2 装进 Desktop 后
 * `web boot: 1 entry did not activate`，整机起不来；
 * `check-host-contract.mjs` 用正则比对字面量，只能证明「常量写了什么」，
 * 证明不了 `apply()` 走完不抛错、`register()` 收下的描述符逐条合法。
 * 宿主的校验发生在渲染进程里，本地跑不到——所以这里把宿主那一层**用桩件复刻**：
 * 喂一个 `window.__ModuleLoader__`、一个 `ctx`，让 `apply()` 真的跑一遍，
 * `register()` 按宿主原文的 7 条规则逐条校验。桩件不是宿主，但校验规则是抄来的。
 *
 * ## 为什么还要有「渲染一遍」（判据 6，2026-11-13 补）
 * ampullary-workbench 0.1.6 装机后业务区整片空白：Panel 引用了 `bridge`，
 * 但模块里从未声明它——可选链 `bridge?.` 对**未声明标识符**不生效，
 * 首渲染抛 `ReferenceError: bridge is not defined`，React 整棵崩掉。
 * 此前本脚本只跑到 apply/register 为止，且 React 桩的 useEffect 是空操作，
 * Panel 函数体从未执行，这类错静态与激活两层都拦不住。
 * 现在把注册下来的 Panel 真调用两次（conversation 为 null / 桩会话），
 * useEffect/useLayoutEffect 的回调也同步执行并收抛错。
 *
 * 判据（任一不过即退出码 1）：
 *   1. `lib/client.js` 能在桩环境里求值，并抛出 `{apply, inject}`
 *   2. `inject` 含宿主必需的 `desktopWorkbenches`
 *   3. `apply()` 不抛错
 *   4. `register()` 被调用恰好一次，且描述符逐条通过宿主 7 条校验
 *   5. Panel 是函数（宿主 `typeof Component !== 'function'` 直接拒绝）
 *   6. Panel 真渲染一遍不抛错（conversation 两种形态），effect 回调与清理函数同样收抛错
 *
 * 用法：
 *   node scripts/smoke-activate.mjs [包目录]   默认对已安装的那份跑，找不到退回本仓
 *   node scripts/smoke-activate.mjs --self-test  正反样本自测（BAD 必须红、GOOD 必须绿）
 * 退出码：0 通过 / 1 激活或渲染会失败 / 2 环境（self-test 失败）
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const SELF_TEST = process.argv.includes('--self-test')

/** 默认项目根；可传参指向**已装进去的那一份** */
function candidates() {
  const home = process.env.HOME || ''
  const name = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8')).name || ''
  return [
    process.argv[2],
    name && join(home, 'Library/Application Support/dsh-desktop/harness/profiles/web/node_modules', name),
    join(HERE, '..'),
  ].filter(Boolean)
}

/* ---------------- 宿主 7 条校验（抄自 app.asar → dsh-desktop-workbenches/client.js 的 register） ---------------- */
const REPO_RE = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/i

function hostRegisterCheck(descriptor, Component) {
  const bad = []
  if (!descriptor || !descriptor.title || typeof Component !== 'function') {
    bad.push('Invalid workbench registration（缺 title 或 Component 不是函数）')
    return bad
  }
  if (typeof descriptor.repository !== 'string' || !REPO_RE.test(descriptor.repository)) {
    bad.push(`repository 不是合法的 GitHub 仓库地址：${JSON.stringify(descriptor.repository)}`)
  }
  if (descriptor.customFrame !== undefined && typeof descriptor.customFrame !== 'boolean') {
    bad.push('Invalid custom frame flag')
  }
  if (descriptor.headerLayout !== undefined && !['default', 'compact'].includes(descriptor.headerLayout)) {
    bad.push('Invalid workbench header layout')
  }
  const layout = descriptor.layout || {}
  if (layout.businessSide !== undefined && !['left', 'right'].includes(layout.businessSide)) {
    bad.push('Invalid workbench business side')
  }
  if (layout.businessWidth !== undefined &&
      (!Number.isFinite(layout.businessWidth) || layout.businessWidth < 0.25 || layout.businessWidth > 0.7)) {
    bad.push(`Workbench business width must be between 0.25 and 0.7（实际 ${layout.businessWidth}）`)
  }
  return bad
}

/* ---------------- 桩件（每次运行独立一份，self-test 与正式跑互不污染） ---------------- */
function makeStubs() {
  const registered = []
  const problems = []
  const notes = []
  const cleanups = []

  /* 常用浏览器全局：window 与顶层各放一份（client 里裸 fetch/localStorage 很常见）。
     真浏览器都有的东西这里缺了不算项目错——缺哪个补哪份，别因此放宽渲染判据。 */
  const FakeAbortController = typeof AbortController !== 'undefined'
    ? AbortController
    : class { constructor() { this.signal = { aborted: false } } abort() { this.signal.aborted = true } }
  const NullObserver = class { observe() {} unobserve() {} disconnect() {} }
  const globals = {
    fetch: async () => ({ ok: true, status: 200, headers: { get: () => 'text/html' }, json: async () => ({}), text: async () => '' }),
    AbortController: FakeAbortController,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
    location: { origin: 'http://127.0.0.1:0', hostname: '127.0.0.1', href: 'http://127.0.0.1:0/' },
    matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    ResizeObserver: NullObserver,
    MutationObserver: NullObserver,
    IntersectionObserver: NullObserver,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    /* 定时器加速/惰性化：真跑 effect 后项目里的轮询 setInterval 会拖住进程不退出 */
    setTimeout: (fn, _ms, ...args) => setTimeout(fn, 1, ...args),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 0,
    clearInterval: () => {},
    console,
  }

  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    /* effect 真的执行：首渲染会炸的代码多半藏在这里（订阅、探活、定时器） */
    useEffect: (fn) => {
      try {
        const off = fn()
        if (typeof off === 'function') cleanups.push(off)
      } catch (e) {
        problems.push(`useEffect 回调抛错：${e.message}`)
      }
    },
    useLayoutEffect: (fn) => {
      try {
        const off = fn()
        if (typeof off === 'function') cleanups.push(off)
      } catch (e) {
        problems.push(`useLayoutEffect 回调抛错：${e.message}`)
      }
    },
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useReducer: (_reducer, init) => [typeof init === 'function' ? init() : init, () => {}],
    useContext: () => undefined,
    useId: () => 'smoke-r0',
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    Fragment: 'Fragment',
  }

  const ctx = {
    effect: (fn) => { try { fn() } catch (e) { problems.push(`ctx.effect 里的注册抛错：${e.message}`) } },
    on: () => {},
    logger: () => ({ info() {}, warn() {}, error() {} }),
    desktopWorkbenches: {
      register: (descriptor, Component) => {
        registered.push({ descriptor, Component })
        for (const b of hostRegisterCheck(descriptor, Component)) problems.push(`宿主会拒绝：${b}`)
      },
      currentSession: () => undefined,
      ownsSession: () => false,
      subscribe: () => () => {},
      newSession: async () => 'stub-session',
      defaultWorkspace: () => ({ workspaceId: 'stub-workspace' }),
    },
    sessions: { list: { getSnapshot: () => ({}) }, scope: () => ({ get: () => ({}) }) },
    connection: { requestRejection: () => undefined },
    webServer: { register: () => {} },
  }

  const win = {
    ...globals,
    __ModuleLoader__: { load: (mod) => { win.__mod = mod } },
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => true,
  }
  const doc = {
    addEventListener() {}, removeEventListener() {},
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, addEventListener() {}, remove() {}, textContent: '', className: '' }),
    createTextNode: (t) => ({ textContent: t }),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { appendChild() {}, removeChild() {}, addEventListener() {} },
    head: { appendChild() {} },
    documentElement: { style: {} },
  }
  return { win, ctx, react, registered, problems, notes, cleanups, globals, doc }
}

/* ---------------- 装一遍 + 渲染一遍 ---------------- */
function runSource(src, { label = 'lib/client.js' } = {}) {
  const { win, ctx, react, registered, problems, notes, cleanups, globals, doc } = makeStubs()
  const sandbox = {
    window: win,
    document: doc,
    navigator: { userAgent: 'node' },
    ...globals,
  }
  sandbox.globalThis = sandbox
  sandbox.self = sandbox

  try {
    runInContext(src, createContext(sandbox), { filename: label })
  } catch (error) {
    problems.push(`求值 ${label} 失败：${error.message}`)
    return { problems, notes }
  }

  const mod = win.__mod
  if (!mod) { problems.push('没有调用 window.__ModuleLoader__.load()——宿主不会把它当插件'); return { problems, notes } }
  notes.push(`模块 id：${mod.id}`)

  let exported
  try {
    exported = mod.factory((name) => {
      if (name === 'react') return react
      throw new Error(`烟测未提供模块：${name}`)
    })
  } catch (error) {
    problems.push(`factory() 抛错：${error.message}`)
    return { problems, notes }
  }

  if (!exported || typeof exported.apply !== 'function') problems.push('没有导出 apply()')
  if (!Array.isArray(exported?.inject) || !exported.inject.includes('desktopWorkbenches')) {
    problems.push(`inject 缺 desktopWorkbenches：${JSON.stringify(exported?.inject)}`)
  }
  notes.push(`inject：${JSON.stringify(exported?.inject)}`)

  if (typeof exported?.apply === 'function') {
    try { exported.apply(ctx) } catch (error) { problems.push(`apply() 抛错（宿主就是死在这里）：${error.message}`) }
  }

  if (registered.length !== 1) problems.push(`register() 调用 ${registered.length} 次，应为 1 次`)
  if (registered[0]) {
    const { descriptor, Component } = registered[0]
    notes.push(`标题：${descriptor.title}`)
    notes.push(`customFrame：${descriptor.customFrame}｜businessSide：${descriptor.layout?.businessSide}｜businessWidth：${descriptor.layout?.businessWidth}`)
    if (typeof Component !== 'function') {
      problems.push('Panel 不是函数，宿主会直接拒绝注册')
    } else {
      // 会话区与业务区不能互相挤压：这两块之和超过 1 就会在真机上互相压
      const width = descriptor.layout?.businessWidth
      if (Number.isFinite(width) && width + 0.32 > 1) {
        problems.push(`businessWidth(${width}) + 会话默认占比(0.32) > 1，两区会互相挤压`)
      }
      /* 判据 6：把 Panel 真调用一遍。
         ampullary 0.1.6 的 bridge ReferenceError 只有走到这一步才现形——
         可选链对未声明标识符不生效，首渲染即抛，装机后业务区整片空白。 */
      const propVariants = [
        { conversation: null },
        { conversation: react.createElement('div', null, 'stub-conversation') },
      ]
      for (const props of propVariants) {
        try {
          const tree = Component(props)
          if (tree == null) notes.push(`Panel(${props.conversation === null ? '无会话' : '有会话'}) 返回空树`)
        } catch (error) {
          problems.push(`Panel 渲染抛错（装机后用户看到的就是一片空白）：${error.message}`)
        }
      }
      /* effect 清理函数也跑一遍：不少组件在 cleanup 里再碰一次宿主桥 */
      for (const off of cleanups) {
        try { off() } catch (error) { problems.push(`effect 清理函数抛错：${error.message}`) }
      }
    }
  }

  return { problems, notes }
}

/* ---------------- self-test：BAD 必须红（ampullary 0.1.6 的 bridge 原样），GOOD 必须绿 ---------------- */
function selfTest() {
  const BAD = `
window.__ModuleLoader__.load({ id: 'self-test-bad', factory(require) {
  const React = require('react')
  function Panel() {
    const [tick, setTick] = React.useState(0)
    React.useEffect(() => { bridge?.desktopWorkbenches?.subscribe?.(() => setTick((n) => n + 1)) }, [])
    return React.createElement('div', null, String(tick))
  }
  function apply(ctx) {
    ctx.effect(() => ctx.desktopWorkbenches.register(
      { title: 'self-test-bad', repository: 'https://github.com/xyb-openharness-dsh-plugins/self-test-bad' }, Panel))
  }
  return { apply, inject: ['desktopWorkbenches'] }
} })`
  const GOOD = `
window.__ModuleLoader__.load({ id: 'self-test-good', factory(require) {
  const React = require('react')
  let bridge = null
  function Panel() {
    const [tick, setTick] = React.useState(0)
    React.useEffect(() => { const off = bridge?.desktopWorkbenches?.subscribe?.(() => setTick((n) => n + 1)); return () => { off?.() } }, [])
    return React.createElement('div', null, String(tick))
  }
  function apply(ctx) {
    bridge = ctx
    ctx.effect(() => ctx.desktopWorkbenches.register(
      { title: 'self-test-good', repository: 'https://github.com/xyb-openharness-dsh-plugins/self-test-good' }, Panel))
  }
  return { apply, inject: ['desktopWorkbenches'] }
} })`

  const bad = runSource(BAD, { label: 'self-test-bad.js' })
  const good = runSource(GOOD, { label: 'self-test-good.js' })
  const badCaught = bad.problems.some((p) => /Panel 渲染抛错|useEffect 回调抛错/.test(p) && /bridge is not defined/.test(p))
  const goodClean = good.problems.length === 0
  console.log(`${badCaught ? 'PASS' : 'FAIL'}  self-test BAD（未声明 bridge 的 0.1.6 原样）被拦下${badCaught ? '' : '：' + JSON.stringify(bad.problems)}`)
  console.log(`${goodClean ? 'PASS' : 'FAIL'}  self-test GOOD（声明 + 注入 bridge）不误报${goodClean ? '' : '：' + good.problems.join(' | ')}`)
  process.exit(badCaught && goodClean ? 0 : 2)
}

function main() {
  if (SELF_TEST) return selfTest()

  const root = candidates().find((p) => p && existsSync(join(p, 'lib/client.js')))
  if (!root) { console.error('找不到 lib/client.js，请传包目录'); process.exit(2) }
  const src = readFileSync(join(root, 'lib/client.js'), 'utf8')

  const { problems, notes } = runSource(src)

  console.log(`激活烟测：${root}`)
  for (const n of notes) console.log(`  · ${n}`)
  if (problems.length) {
    console.log(`\n✗ FAIL —— ${problems.length} 处问题（宿主装进去会同样失败）：`)
    for (const p of problems) console.log(`  - ${p}`)
    process.exit(1)
  }
  console.log('\n✓ PASS —— apply() 走通、register() 描述符过宿主 7 条校验、Panel 两种会话形态渲染不炸（桩件，非真宿主）')
}

main()
