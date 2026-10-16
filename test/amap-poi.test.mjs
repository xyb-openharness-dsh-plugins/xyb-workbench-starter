import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAmapPoi, parseAmapLocation } from '../examples/amap-poi-normalize.mjs'
const options = { fetchedAt: '2026-10-16T08:00:00.000Z' }
const row = { id: 'POI-A', name: '合成地点', location: '120.5,31.2', typecode: '140100' }

test('malformed POI fields do not break a result batch or turn missing coordinates into zero', () => {
  const rows = [null, {}, [], { ...row, typecode: [] }, { ...row, typecode: {} }, { ...row, typecode: 140100 }, { ...row, location: [] }]
  const results = rows.map((r) => normalizeAmapPoi(r, options)).filter(Boolean)
  assert.equal(results.length, 4)
  assert.equal(results[0].typeCode, null)
  assert.equal(results[1].typeCode, null)
  assert.equal(results[2].typeCode, '140100')
  assert.equal(results[3].location, null)
  for (const value of ['', ' , ', ',31.2', '120.5,', '120.5,91', '181,31.2', '120.5,31.2,3']) assert.equal(parseAmapLocation(value), null)
  assert.deepEqual(parseAmapLocation(row.location), { longitude: 120.5, latitude: 31.2, crs: 'GCJ-02' })
})
test('same-name branches keep provider identity; provider data remains an unverified candidate', () => {
  const a = normalizeAmapPoi(row, options), b = normalizeAmapPoi({ ...row, id: 'POI-B' }, options)
  assert.notEqual(a.id, b.id)
  assert.equal(a.verificationStatus, 'unverified')
  assert.equal(a.candidateStatus, 'unreviewed')
  assert.equal(a.source.fetchedAt, options.fetchedAt)
  assert.equal(normalizeAmapPoi({ ...row, id: [] }, options), null)
})
test('normalization requires original fetch provenance instead of silently making cached data fresh', () => {
  assert.throws(() => normalizeAmapPoi(row), TypeError)
  assert.throws(() => normalizeAmapPoi(row, { fetchedAt: 'not-a-date' }), TypeError)
})
