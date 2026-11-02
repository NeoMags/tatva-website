# TATVA website

Astro + TypeScript site with a Three.js tesseract scene, three languages (English, Kannada, Hindi),
a guided assistant with a senior-help flow, and Cloudflare Pages Functions for forms.

## Run locally
```
npm install
npm run dev                      # site only, http://localhost:4321
npm run build && npx wrangler d1 migrations apply tatva --local && npx wrangler pages dev dist   # site + functions
```

## Where things live
| Path | What |
| --- | --- |
| `src/styles/tokens.css` | Colours, type, spacing, motion (dark/light/system) |
| `src/i18n/ui.ts`, `src/i18n/assistant.ts` | All text, per language (Kannada/Hindi are drafts) |
| `src/data/projects.ts` | Portfolio. One entry per project page; add screenshots under `public/images/work/<slug>/` |
| `src/data/site.ts` | Contact details, pricing, budget ranges |
| `src/scripts/scene/` | 3D: `hypercube.ts` (4D maths), `tesseract.ts` (drawing), `choreographer.ts` (motion), `stage.ts` (renderer) |
| `src/scripts/ui/assistant.ts` | Assistant and TATVA Care flow |
| `functions/api/` | `enquiry` and `assist` endpoints |
| `migrations/` | D1 database schema |

## Deploy (Cloudflare Pages, free plan)
1. Push this repo to GitHub (private), connect it in Cloudflare Pages. Build command `npm run build`, output `dist`.
2. Create a D1 database named `tatva`, put its id in `wrangler.toml`, run `npx wrangler d1 migrations apply tatva --remote`.
3. Set secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `IP_SALT` (any random string), optionally `TURNSTILE_SECRET`
   and the public `PUBLIC_TURNSTILE_SITE_KEY` build variable.
4. Test the form and the assistant on the live URL: an alert must arrive on Telegram.

`npm run build` also runs `scripts/postbuild.mjs`, which writes `dist/_headers` (security headers and a
Content-Security-Policy with the hash of every inline script). It is regenerated on each build; never edit it by hand.

## Privacy
`src/pages/privacy.astro` describes exactly what the backend collects and keeps. Records are deleted automatically
(`RETENTION` in `functions/_lib/shared.ts`: enquiries 24 months, assistant requests 12 months, rate-limit rows 7 days).
If either changes, change the other in the same commit. Copies in the Telegram chat must be deleted by hand on the same schedule.

## Before launch
- Confirm project statuses marked `statusConfirmed: false` in `src/data/projects.ts`.
- Native-speaker check of Kannada and Hindi; then set `reviewed: true` in `src/i18n/ui.ts` (pages are `noindex` until then).
- Confirm TATVA Care name, area, hours and cost (`careHours` in `src/i18n/assistant.ts`).
- Confirm the domain and update `site` in `astro.config.mjs`.
- Confirm the used/exploring flags in `src/data/capabilities.ts` (groups marked `confirmed: false`).
- Confirm the retention periods and have the privacy notice reviewed.
