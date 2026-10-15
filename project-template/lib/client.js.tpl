window.__ModuleLoader__.load({
  id: @@PACKAGE_QUOTED@@,
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const metadata = @@CLIENT_METADATA@@
    const theme = @@STYLE@@
    function Panel() {
      const [health, setHealth] = React.useState(null)
      const [error, setError] = React.useState('')
      const [large, setLarge] = React.useState(false)
      const [attempt, setAttempt] = React.useState(0)
      React.useEffect(() => {
        const controller = new AbortController()
        setHealth(null); setError('')
        fetch('/api/@@SLUG@@/health', { signal: controller.signal, credentials: 'same-origin' })
          .then(async (response) => {
            if (!response.ok) throw new Error(`服务连接失败 (${response.status})`)
            const result = await response.json()
            if (!controller.signal.aborted) setHealth(result)
          })
          .catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
        return () => controller.abort()
      }, [attempt])
      return h('main', { className: 'wb-@@SLUG@@', 'data-font': large ? 'large' : 'standard', style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, padding: 20, overflow: 'auto' } },
        h('header', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingInlineStart: 'var(--dsh-frame-leading-clearance, 0px)' } },
          h('strong', null, metadata.title),
          h('span', { 'aria-live': 'polite' }, health ? `v${health.version}` : '版本待连接'),
          h('button', { type: 'button', 'aria-pressed': large, onClick: () => setLarge(!large) }, large ? '标准字' : '大字')),
        h('style', null, theme),
        h('section', { style: { background: 'var(--wb-surface)', border: '1px solid var(--wb-line)', borderRadius: 'var(--wb-radius)', padding: 20 } },
          h('h1', { style: { fontSize: '1.6em', margin: '0 0 12px' } }, metadata.title),
          h('p', null, metadata.description),
          h('p', { role: 'status' }, error || (health ? '接入骨架：服务已连接，业务功能待按 spec 实现。' : '正在连接本机服务…')),
          h('button', { type: 'button', className: 'wb-primary', onClick: () => setAttempt((value) => value + 1) }, '重新检查连接')))
    }
    function apply(ctx) {
      ctx.effect(() => ctx.desktopWorkbenches.register(@@DESCRIPTOR@@, Panel))
    }
    return { apply, inject: ['desktopWorkbenches'] }
  }
})
