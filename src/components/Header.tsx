import { useState } from 'react'

import { MenuIcon } from './Icons'

const submitUrl =
  'https://github.com/cheesejaguar/free-ai-stuff/issues/new?template=offer.yml&title=%5BOffer%5D%3A%20'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="wordmark" href="#top" aria-label="Free AI Stuff home">
          FREE AI STUFF
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a className="active" href="#offers">Offers</a>
          <a href="#how-it-works">How it works</a>
          <a className="submit-button" href={submitUrl}>Submit an offer</a>
        </nav>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className={`mobile-nav ${menuOpen ? 'open' : ''}`}
        aria-label="Mobile navigation"
      >
        <a href="#offers" onClick={() => setMenuOpen(false)}>Offers</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
        <a href={submitUrl}>Submit an offer</a>
      </nav>
    </header>
  )
}
