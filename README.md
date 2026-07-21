# Free AI Stuff

An automatically checked catalogue of current offers for free LLM API, chatbot, and agentic model access.

**Live site:** https://cheesejaguar.github.io/free-ai-stuff/

## What it tracks

Every listing includes:

- the provider, model or model pool, and access type;
- the official source and last successful verification time;
- a dated expiration or an explicit “no published end date” statement;
- account requirements, quotas, eligible-model limits, and production restrictions;
- an active, ending-soon, expired, or review-pending status.

The catalogue also publishes machine-readable [`offers.json`](https://cheesejaguar.github.io/free-ai-stuff/offers.json) and an [RSS feed](https://cheesejaguar.github.io/free-ai-stuff/feed.xml).

## Methodology

Listings must be supported by a provider-controlled pricing page, documentation page, terms page, changelog, or announcement. Third-party roundups may help discover an offer but are not accepted as evidence.

A scheduled GitHub Actions workflow runs daily. It fetches each official source and checks the evidence phrases stored with the listing. Dated offers are marked “ending soon” during their final 14 days and archived after expiration. If a source becomes unreachable or its supporting language changes, the listing becomes “review pending”; the workflow does not silently treat the offer as verified or delete it.

This is a conservative availability check, not an account-level API test. Providers can change quotas, eligibility, or availability before the next run, so visitors should confirm the linked official source before relying on an offer.

## Add or update an offer

Use the [offer submission form](https://github.com/cheesejaguar/free-ai-stuff/issues/new?template=offer.yml) or edit [`data/offers.json`](data/offers.json) in a pull request. A submission needs an official source, expiration information, all material limitations, and short evidence phrases that the checker can find on the source page.

Run the project locally with Node.js 24 or newer:

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run check
npm run refresh
```

## Automation and deployment

- `.github/workflows/pages.yml` rechecks sources on a daily schedule, saves verification state, builds the site, and deploys it with GitHub Pages.
- `scripts/refresh-offers.mjs` checks official evidence and recalculates offer status.
- `scripts/generate-public-data.mjs` produces the JSON feed, RSS feed, sitemap, and crawler directives in the deployment artifact.
- The React application is a static Vite build, so it needs no application server or runtime secrets.

## Privacy

The deployed site has no analytics, advertising, cookies, accounts, or third-party font requests. Search and filtering happen locally in the browser. Following an official-source link is governed by that provider's privacy policy.

## License

See [LICENSE](LICENSE).
