import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { findMissingEvidence, getDateStatus } from './offer-status.mjs'

const dataPath = resolve('data/offers.json')
const catalog = JSON.parse(await readFile(dataPath, 'utf8'))
const checkedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

async function fetchSource(offer) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(offer.sourceUrl, {
      headers: {
        Accept: 'text/html, text/markdown;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'free-ai-stuff-offer-checker/1.0 (+https://github.com/cheesejaguar/free-ai-stuff)',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.text()
  } finally {
    clearTimeout(timer)
  }
}

async function refreshOffer(offer) {
  const dateStatus = getDateStatus(offer.expiresAt, new Date(checkedAt))
  if (dateStatus === 'expired') {
    return { ...offer, status: 'expired', lastCheckError: null }
  }

  try {
    const sourceText = await fetchSource(offer)
    const missing = findMissingEvidence(sourceText, offer.evidence)

    if (missing.length > 0) {
      return {
        ...offer,
        status: 'needs-review',
        lastCheckError: `Source text changed; missing evidence: ${missing.join(' | ')}`,
      }
    }

    return {
      ...offer,
      status: dateStatus,
      lastCheckedAt: checkedAt,
      lastCheckError: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ...offer,
      status: 'needs-review',
      lastCheckError: `Source check failed: ${message}`,
    }
  }
}

const refreshedOffers = await Promise.all(catalog.offers.map(refreshOffer))
const refreshedCatalog = {
  ...catalog,
  generatedAt: checkedAt,
  offers: refreshedOffers,
}

await writeFile(dataPath, `${JSON.stringify(refreshedCatalog, null, 2)}\n`)

const counts = Object.groupBy(refreshedOffers, (offer) => offer.status)
console.log(`Checked ${refreshedOffers.length} official sources at ${checkedAt}`)
for (const [status, offers] of Object.entries(counts)) {
  console.log(`${status}: ${offers.length}`)
}
