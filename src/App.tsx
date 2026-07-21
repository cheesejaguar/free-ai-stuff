import { useMemo, useRef, useState } from 'react'

import rawCatalog from '../data/offers.json'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { FilterIcon, SearchIcon } from './components/Icons'
import { MethodBand } from './components/MethodBand'
import { OfferRow } from './components/OfferRow'
import {
  ACCESS_FILTERS,
  filterAndSortOffers,
  type AccessFilter,
  type SortMode,
  type StatusFilter,
} from './lib/offers'
import type { OfferCatalog } from './types'

const catalog = rawCatalog as OfferCatalog

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'active', label: 'Active only' },
  { value: 'all', label: 'All statuses' },
  { value: 'ending-soon', label: 'Ending soon' },
  { value: 'needs-review', label: 'Review pending' },
]

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'ending', label: 'Ending soon' },
  { value: 'provider', label: 'Provider A–Z' },
  { value: 'checked', label: 'Recently checked' },
]

export default function App() {
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState<AccessFilter>('All access')
  const [provider, setProvider] = useState('All providers')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [sort, setSort] = useState<SortMode>('ending')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const filterDialog = useRef<HTMLDialogElement>(null)

  const providers = useMemo(
    () => ['All providers', ...Array.from(new Set(catalog.offers.map((offer) => offer.provider))).sort()],
    [],
  )

  const visibleOffers = useMemo(
    () => filterAndSortOffers(catalog.offers, { query, access, provider, status, sort }),
    [query, access, provider, status, sort],
  )

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <>
      <Header />
      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <h1 id="page-title">Free model access, before it disappears.</h1>
          <p>Current, sourced offers for LLM APIs, chatbots, and coding agents—checked daily.</p>
        </section>

        <section className="catalogue" id="offers" aria-label="Free model access offers">
          <label className="search-box">
            <span className="sr-only">Search providers or models</span>
            <SearchIcon />
            <input
              type="search"
              value={query}
              placeholder="Search providers or models"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="filter-toolbar">
            <div className="access-filter" role="group" aria-label="Filter by access type">
              {ACCESS_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={access === option ? 'selected' : ''}
                  aria-pressed={access === option}
                  onClick={() => setAccess(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="desktop-selects">
              <label>
                <span className="sr-only">Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  {providers.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Offer status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <label className="sort-select desktop-sort">
              <span className="sr-only">Sort offers</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <button
              className="mobile-filter-button"
              type="button"
              aria-label="Open provider, status, and sort filters"
              onClick={() => filterDialog.current?.showModal()}
            >
              <FilterIcon />
            </button>
          </div>

          <dialog className="filter-dialog" ref={filterDialog}>
            <form method="dialog">
              <div className="dialog-heading">
                <h2>Filter offers</h2>
                <button type="submit" aria-label="Close filters">Close</button>
              </div>
              <label>
                <span>Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  {providers.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button className="apply-filters" type="submit">Show offers</button>
            </form>
          </dialog>

          <div className="offer-table">
            <div className="table-heading" aria-hidden="true">
              <span />
              <span>Provider / Model</span>
              <span>Access type</span>
              <span>Offer summary</span>
              <span>Expires</span>
              <span>Limits</span>
              <span>Status</span>
              <span>Last checked</span>
              <span />
            </div>

            <div aria-live="polite" className="results-announcement">
              {visibleOffers.length === 0 ? 'No offers match the selected filters.' : ''}
            </div>

            {visibleOffers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                expanded={expandedIds.includes(offer.id)}
                onToggle={() => toggleExpanded(offer.id)}
              />
            ))}

            {visibleOffers.length === 0 && (
              <div className="empty-state">
                <h2>No matching offers</h2>
                <p>Try a broader search or reset the access and status filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setAccess('All access')
                    setProvider('All providers')
                    setStatus('active')
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          <p className="result-count">Showing {visibleOffers.length} of {catalog.offers.length} offers</p>
        </section>

        <MethodBand />
      </main>
      <Footer />
    </>
  )
}
