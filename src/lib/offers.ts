import type { AccessType, Offer, OfferStatus } from '../types'

export const ACCESS_FILTERS = ['All access', 'API', 'Chatbot', 'Agent'] as const
export type AccessFilter = (typeof ACCESS_FILTERS)[number]
export type StatusFilter = 'active' | 'all' | 'ending-soon' | 'needs-review'
export type SortMode = 'ending' | 'provider' | 'checked'

const ENDING_SOON_MS = 14 * 24 * 60 * 60 * 1000

export function deriveOfferStatus(offer: Offer, now = new Date()): OfferStatus {
  if (offer.expiresAt) {
    const end = new Date(`${offer.expiresAt}T23:59:59.999Z`)
    const remaining = end.getTime() - now.getTime()
    if (remaining < 0) return 'expired'
    if (remaining <= ENDING_SOON_MS) return 'ending-soon'
  }

  if (offer.status === 'needs-review') return 'needs-review'
  return offer.status === 'expired' ? 'active' : offer.status
}

export function formatExpiry(offer: Offer, now = new Date()) {
  if (!offer.expiresAt) {
    return { primary: 'Ongoing', secondary: 'No published end date' }
  }

  const end = new Date(`${offer.expiresAt}T23:59:59.999Z`)
  const expiryDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days = Math.round((expiryDay - currentDay) / (24 * 60 * 60 * 1000))
  const primary = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(end)

  if (days < 0) return { primary, secondary: 'Expired' }
  if (days === 0) return { primary, secondary: 'Ends today' }
  if (days === 1) return { primary, secondary: '1 day left' }
  return { primary, secondary: `${days} days left` }
}

export function formatCheckedAt(value: string, now = new Date()) {
  const date = new Date(value)
  const sameUtcDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()

  if (sameUtcDay) return 'Today'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getUTCFullYear() === now.getUTCFullYear() ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function offerMatchesSearch(offer: Offer, query: string) {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true

  const searchable = [
    offer.provider,
    offer.name,
    offer.model,
    offer.summary,
    offer.detail,
    offer.primaryLimit,
    ...offer.accessTypes,
    ...offer.limitations,
    ...offer.requirements,
  ]
    .join(' ')
    .toLocaleLowerCase()

  return searchable.includes(normalized)
}

interface FilterOptions {
  query: string
  access: AccessFilter
  provider: string
  status: StatusFilter
  sort: SortMode
  now?: Date
}

export function filterAndSortOffers(offers: Offer[], options: FilterOptions) {
  const now = options.now ?? new Date()

  return offers
    .filter((offer) => offerMatchesSearch(offer, options.query))
    .filter((offer) =>
      options.access === 'All access'
        ? true
        : offer.accessTypes.includes(options.access as AccessType),
    )
    .filter((offer) => (options.provider === 'All providers' ? true : offer.provider === options.provider))
    .filter((offer) => {
      const status = deriveOfferStatus(offer, now)
      if (options.status === 'all') return true
      if (options.status === 'active') return status === 'active' || status === 'ending-soon'
      return status === options.status
    })
    .sort((a, b) => {
      if (options.sort === 'provider') return a.provider.localeCompare(b.provider)
      if (options.sort === 'checked') {
        return new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime()
      }

      const aEnd = a.expiresAt ? new Date(`${a.expiresAt}T23:59:59.999Z`).getTime() : Infinity
      const bEnd = b.expiresAt ? new Date(`${b.expiresAt}T23:59:59.999Z`).getTime() : Infinity
      return (
        aEnd - bEnd ||
        (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER) ||
        a.provider.localeCompare(b.provider)
      )
    })
}

export const STATUS_LABELS: Record<OfferStatus, string> = {
  active: 'Active',
  'ending-soon': 'Ending soon',
  expired: 'Expired',
  'needs-review': 'Review pending',
}
