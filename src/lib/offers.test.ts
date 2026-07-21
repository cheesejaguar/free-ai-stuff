import { describe, expect, it } from 'vitest'

import type { Offer } from '../types'
import { deriveOfferStatus, filterAndSortOffers, formatExpiry, offerMatchesSearch } from './offers'

const offer: Offer = {
  id: 'example',
  provider: 'Example AI',
  name: 'Free model',
  model: 'Example 2',
  accessTypes: ['API'],
  summary: 'Free inference for prototypes.',
  detail: 'Official detail.',
  expiresAt: null,
  expiryNote: 'No fixed end date.',
  primaryLimit: '50 requests daily',
  limitations: ['Account required'],
  requirements: ['API key'],
  sourceUrl: 'https://example.com',
  sourceLabel: 'Official docs',
  status: 'active',
  lastCheckedAt: '2026-07-21T12:00:00Z',
  evidence: ['Free inference'],
}

describe('offer catalogue helpers', () => {
  it('searches provider, model, limits, and requirements', () => {
    expect(offerMatchesSearch(offer, 'example 2')).toBe(true)
    expect(offerMatchesSearch(offer, '50 requests')).toBe(true)
    expect(offerMatchesSearch(offer, 'api key')).toBe(true)
    expect(offerMatchesSearch(offer, 'chatbot')).toBe(false)
  })

  it('derives ending-soon and expired states from the expiry date', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    expect(deriveOfferStatus({ ...offer, expiresAt: '2026-07-29' }, now)).toBe('ending-soon')
    expect(deriveOfferStatus({ ...offer, expiresAt: '2026-07-20' }, now)).toBe('expired')
    expect(formatExpiry({ ...offer, expiresAt: '2026-07-22' }, now).secondary).toBe('1 day left')
  })

  it('filters active offers while retaining ending-soon listings', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const result = filterAndSortOffers(
      [offer, { ...offer, id: 'soon', expiresAt: '2026-07-29' }, { ...offer, id: 'old', expiresAt: '2026-07-20' }],
      {
        query: '',
        access: 'All access',
        provider: 'All providers',
        status: 'active',
        sort: 'ending',
        now,
      },
    )
    expect(result.map((item) => item.id)).toEqual(['soon', 'example'])
  })
})
