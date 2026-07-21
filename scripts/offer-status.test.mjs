import test from 'node:test'
import assert from 'node:assert/strict'

import { findMissingEvidence, getDateStatus, normalizeSourceText } from './offer-status.mjs'

test('classifies dated offers using a fourteen-day ending-soon window', () => {
  const now = new Date('2026-07-21T12:00:00Z')
  assert.equal(getDateStatus(null, now), 'active')
  assert.equal(getDateStatus('2026-08-10', now), 'active')
  assert.equal(getDateStatus('2026-07-30', now), 'ending-soon')
  assert.equal(getDateStatus('2026-07-20', now), 'expired')
})

test('normalizes source markup before checking evidence', () => {
  const source = '<main>Free&nbsp;access &amp; <strong>50 requests daily</strong></main>'
  assert.equal(normalizeSourceText(source), 'free access & 50 requests daily')
  assert.deepEqual(findMissingEvidence(source, ['Free access', '50 requests daily']), [])
  assert.deepEqual(findMissingEvidence(source, ['No credit card']), ['No credit card'])
})
