export type AccessType = 'API' | 'Chatbot' | 'Agent'
export type OfferStatus = 'active' | 'ending-soon' | 'expired' | 'needs-review'

export interface Offer {
  id: string
  priority?: number
  provider: string
  name: string
  model: string
  accessTypes: AccessType[]
  summary: string
  detail: string
  expiresAt: string | null
  expiryNote: string
  primaryLimit: string
  limitations: string[]
  requirements: string[]
  sourceUrl: string
  sourceLabel: string
  status: OfferStatus
  lastCheckedAt: string
  evidence: string[]
  lastCheckError?: string | null
}

export interface OfferCatalog {
  version: number
  generatedAt: string
  offers: Offer[]
}
