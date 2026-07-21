import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDir = resolve(process.argv[2] ?? 'dist')
const catalog = JSON.parse(await readFile(resolve('data/offers.json'), 'utf8'))
const siteUrl = 'https://cheesejaguar.github.io/free-ai-stuff/'

await mkdir(outputDir, { recursive: true })
await writeFile(resolve(outputDir, 'offers.json'), `${JSON.stringify(catalog, null, 2)}\n`)

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const feedItems = catalog.offers
  .filter((offer) => offer.status !== 'expired')
  .map(
    (offer) => `    <item>
      <title>${escapeXml(`${offer.provider}: ${offer.name}`)}</title>
      <link>${escapeXml(offer.sourceUrl)}</link>
      <guid isPermaLink="false">${escapeXml(offer.id)}</guid>
      <pubDate>${new Date(offer.lastCheckedAt).toUTCString()}</pubDate>
      <description>${escapeXml(`${offer.summary} Limits: ${offer.limitations.join(' ')}`)}</description>
    </item>`,
  )
  .join('\n')

const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Free AI Stuff</title>
    <link>${siteUrl}</link>
    <description>Current, sourced offers for free LLM APIs, chatbots, and coding agents.</description>
    <lastBuildDate>${new Date(catalog.generatedAt).toUTCString()}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`

await writeFile(resolve(outputDir, 'feed.xml'), feed)
await writeFile(
  resolve(outputDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc><lastmod>${catalog.generatedAt.slice(0, 10)}</lastmod></url></urlset>\n`,
)
await writeFile(
  resolve(outputDir, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`,
)
await writeFile(resolve(outputDir, '.nojekyll'), '')
