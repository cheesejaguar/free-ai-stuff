export function Footer() {
  const base = import.meta.env.BASE_URL

  return (
    <footer className="site-footer">
      <nav aria-label="Footer navigation">
        <a href="https://github.com/cheesejaguar/free-ai-stuff#methodology">Methodology</a>
        <a href="https://github.com/cheesejaguar/free-ai-stuff">GitHub</a>
        <a href={`${base}feed.xml`}>RSS</a>
        <a href="https://github.com/cheesejaguar/free-ai-stuff#privacy">Privacy</a>
      </nav>
      <p>Offer terms can change. Verify the official source before relying on any listing.</p>
    </footer>
  )
}
