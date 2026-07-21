export const ENDING_SOON_DAYS = 14

export function getDateStatus(expiresAt, now = new Date()) {
  if (!expiresAt) return 'active'

  const end = new Date(`${expiresAt}T23:59:59.999Z`)
  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid expiry date: ${expiresAt}`)
  }

  const remainingMs = end.getTime() - now.getTime()
  if (remainingMs < 0) return 'expired'
  if (remainingMs <= ENDING_SOON_DAYS * 24 * 60 * 60 * 1000) return 'ending-soon'
  return 'active'
}

export function normalizeSourceText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US')
}

export function findMissingEvidence(sourceText, evidence) {
  const normalized = normalizeSourceText(sourceText)
  return evidence.filter((claim) => !normalized.includes(normalizeSourceText(claim)))
}
