import { ChevronIcon, ExternalIcon } from './Icons'
import { deriveOfferStatus, formatCheckedAt, formatExpiry, STATUS_LABELS } from '../lib/offers'
import type { Offer } from '../types'

interface OfferRowProps {
  offer: Offer
  expanded: boolean
  onToggle: () => void
}

export function OfferRow({ offer, expanded, onToggle }: OfferRowProps) {
  const status = deriveOfferStatus(offer)
  const expiry = formatExpiry(offer)
  const detailsId = `${offer.id}-details`

  return (
    <article className={`offer-row status-${status}`}>
      <button
        className="expand-button"
        type="button"
        aria-label={`${expanded ? 'Hide' : 'Show'} details for ${offer.provider} ${offer.name}`}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <ChevronIcon direction={expanded ? 'up' : 'down'} />
      </button>

      <div className="offer-identity">
        <h2>{offer.provider} / {offer.name}</h2>
        <p>{offer.model}</p>
      </div>

      <div className="access-types" aria-label={`Access types: ${offer.accessTypes.join(', ')}`}>
        {offer.accessTypes.map((type) => <span key={type}>{type}</span>)}
      </div>

      <div className="offer-summary">
        <strong>{offer.summary}</strong>
        <span>{offer.detail}</span>
      </div>

      <div className="offer-expiry">
        <span>{expiry.primary}</span>
        <small>{expiry.secondary}</small>
      </div>

      <div className="offer-limits">
        <span>{offer.primaryLimit}</span>
        <small>{offer.limitations[0]}</small>
      </div>

      <div className={`offer-status ${status}`}>
        <span className="status-dot" aria-hidden="true" />
        <span>{STATUS_LABELS[status]}</span>
      </div>

      <div className="last-checked">
        <span>{formatCheckedAt(offer.lastCheckedAt)}</span>
        <small>{offer.sourceLabel}</small>
      </div>

      <a
        className="external-button"
        href={offer.sourceUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open official source for ${offer.provider} ${offer.name}`}
      >
        <ExternalIcon />
      </a>

      <a className="source-link desktop-source" href={offer.sourceUrl} target="_blank" rel="noreferrer">
        Official source <span aria-hidden="true">·</span> checked {formatCheckedAt(offer.lastCheckedAt).toLowerCase()}
      </a>

      <a className="source-link mobile-source" href={offer.sourceUrl} target="_blank" rel="noreferrer">
        Official source <span aria-hidden="true">·</span> checked {formatCheckedAt(offer.lastCheckedAt).toLowerCase()}
      </a>

      {expanded && (
        <div className="offer-details" id={detailsId}>
          <section>
            <h3>Usage limitations</h3>
            <ul>{offer.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h3>Requirements</h3>
            <ul>{offer.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h3>Expiration</h3>
            <p>{offer.expiryNote}</p>
          </section>
        </div>
      )}
    </article>
  )
}
