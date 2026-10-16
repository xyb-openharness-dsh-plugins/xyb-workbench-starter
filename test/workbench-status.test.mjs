import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveWorkbenchStatus } from '../examples/workbench-status.mjs'

const bound = {
  directory: { phase: 'ready' }, selectedProjectId: 'project-a',
  session: { context: 'desktop', phase: 'ready', snapshotProjectId: 'project-a', active: true,
    currentSessionId: 'session-a', snapshotSessionId: 'session-a', ownership: 'owned', mappedProjectId: 'project-a', mappingSaved: true },
}
test('a session needs all current ownership and persisted mapping conditions before showing green', () => {
  assert.equal(deriveWorkbenchStatus(bound).session.code, 'session-bound')
  for (const change of [
    { active: false }, { currentSessionId: null }, { ownership: 'not-owned' },
    { ownership: 'unavailable' }, { mappedProjectId: 'project-b' },
    { mappingSaved: false }, { phase: 'checking' }, { phase: 'error' },
  ]) {
    assert.notEqual(deriveWorkbenchStatus({ ...bound, session: { ...bound.session, ...change } }).session.tone, 'ok')
  }
})
test('late project-A snapshot cannot light the badge for selected project B', () => {
  const view = deriveWorkbenchStatus({ ...bound, selectedProjectId: 'project-b' })
  assert.equal(view.session.code, 'session-checking')
  assert.equal(view.directory.tone, 'ok')
  const changedSession = deriveWorkbenchStatus({ ...bound, session: { ...bound.session, currentSessionId: 'session-b' } })
  assert.equal(changedSession.session.code, 'session-checking')
})
test('directory and session readiness remain independent and require verified phases', () => {
  assert.equal(deriveWorkbenchStatus({ directory: { phase: 'ready' } }).session.tone, 'warning')
  const view = deriveWorkbenchStatus({ ...bound, directory: { phase: 'error' } })
  assert.equal(view.directory.tone, 'error')
  assert.equal(view.session.tone, 'ok')
  assert.notEqual(deriveWorkbenchStatus({ directory: { path: '/example' } }).directory.tone, 'ok')
})
test('preview, unavailable ownership, absent session and another mapped session stay distinguishable', () => {
  const derive = (change) => deriveWorkbenchStatus({ ...bound, session: { ...bound.session, ...change } }).session.code
  assert.equal(derive({ context: 'preview' }), 'session-preview')
  assert.equal(derive({ ownership: 'unavailable' }), 'session-unavailable')
  assert.equal(derive({ currentSessionId: null, snapshotSessionId: null }), 'session-none')
  assert.equal(derive({ currentSessionId: null, snapshotSessionId: null, hasProjectSession: true }), 'session-other')
})
