# Torrea Tailor — Handoff Document

_Last updated: 2026-11-05_

---

## Goal

Build and ship **Torrea Tailor**, a personalised coffee quiz app for the artisan roaster Torrea. Users answer 6 mandatory questions (plus 4 optional) about their taste preferences, extraction method, and roast preference. The app matches them to a named archetype ("L'Espresso Purist", etc.) and generates a custom coffee blend. They can then order via:

1. **"Commander & payer"** — redirects to a WooCommerce product page on `torrea.fr` with the blend composition encoded in URL params.
2. **"Envoyer la commande par email"** — fills in a form (name, email, optional phone, weight, qty, pickup market) and opens a pre-filled `mailto:` to `contact@torrea.fr`.

---

## Tech Stack

- **React 18 + Vite** — SPA, deployed to Vercel
- **No routing library** — step flow is managed with local state in `App.jsx`
- **No backend** — matching logic is pure JS (`src/lib/matching.js`), data is static JSON
- **Vitest** — unit tests for matching and storage
- Target: French-language UI, mobile-first

Key files:
```
src/
  main.jsx                      # Entry point
  components/
    Welcome.jsx                 # Intro screen
    BubbleQuestion.jsx          # Reusable bubble-select question
    ProgressBar.jsx             # Step indicator
    DeepenPrompt.jsx            # "Aller plus loin?" optional questions gate
    Result/
      Result.jsx                # Orchestrates result sub-views
      ArchetypeCard.jsx         # Archetype display
      BlendComposition.jsx      # Blend breakdown
      Alternatives.jsx          # Pure-origin alternatives
      SensoryProfile.jsx        # Kiviat radar chart
      OrderRecap.jsx            # WooCommerce redirect recap + "Commander & payer"
      EmailRecap.jsx            # Email order form (pickup only)
  lib/
    matching.js                 # Core algorithm — archetype + blend selection
    storage.js                  # localStorage persistence for quiz state
  data/
    coffees.json                # Catalogue of 4 single-origin coffees
    archetypes.json             # Archetype definitions with sensory profiles
    brewing_methods.json        # Extraction method metadata
```

---

## Current Progress

The app is **feature-complete for MVP**. All committed features work end-to-end:

### Done
- Full 6-question mandatory quiz (Q0–Q5): extraction method, moment, flavour profile, intensity, roast, grind type
- Optional deepening questions (Q5–Q8) behind a "go further" gate
- Archetype matching algorithm with tie-break and fallback (`matching.js`)
- Result page: archetype card, blend composition, pure-origin alternatives, sensory Kiviat chart, pedagogical note about aromas
- **OrderRecap** (`src/components/Result/OrderRecap.jsx`): recap screen with "Commander & payer" → WooCommerce URL with blend params; secondary "Envoyer par email" CTA
- **EmailRecap** (`src/components/Result/EmailRecap.jsx`): in-app form for pickup-market orders — name, email, optional phone, weight (bubble buttons), quantity, pickup location selector, opens pre-filled `mailto:` on submit
- Pickup locations hardcoded: _Marché Place de la Sardane à Amélie-les-Bains (jeudis matin)_ and _Marché de Producteurs de Pays à Arles-sur-Tech (mercredis matin)_
- Postal/delivery reminder on EmailRecap: banner directing users to "Commander & payer" for shipped orders
- Hero image on Welcome screen (WebP, dark overlay)
- Fraunces typography, paper-texture design, SVG botanical decorations
- URL-based state sharing (stateless, shareable result links)
- Vercel SPA fallback configured (`vercel.json`)
- Unit tests for matching and storage
- Coffee catalogue resserré à 4 origines — El Triunfo (Mexique), San Rafael (Brésil), Kitché (Guatemala), Salomon (Éthiopie) ; retrait de Capucas, El Palomar et Palanda (2026-11-05)
- `computeAlternatives` exclut désormais **tous** les cafés du blend (plus seulement les majoritaires) — corrige le recoupement entre « cafés purs » et blend

### Pending / Known TODOs
- **`BLEND_PRODUCT_URL`** in `OrderRecap.jsx:8` is a placeholder — needs updating once the real WooCommerce product is created on `torrea.fr`
- No payment flow on the app side (intentionally delegated to WooCommerce)
- No analytics / tracking yet
- `.gitignore` has an unstaged modification (minor, check before next commit)

---

## What Worked

- Pure-JS matching without a backend keeps deployment trivial and latency zero
- `mailto:` approach for pickup orders avoids needing a server or form endpoint
- URL param encoding for WooCommerce (`blend=60-san_rafael,30-el_triunfo,10-salomon`) — separating composition items with `,` and percent+id with `-` avoids conflicts with coffee IDs that contain `_`
- Bubble-button UI pattern for question answers was reused cleanly for weight selection in EmailRecap

## What Didn't Work / Watch Out For

- Coffee IDs contain underscores, so the blend param originally used `_` as a separator — this broke parsing. Fixed by using `,` between coffees and `-` between percent and id.
- Old app structure had a nested `trouvons-ton-cafe-ideal/` subfolder — this was refactored flat to the repo root (`ed94063`). The old subfolder still has a stale `node_modules/` inside it; ignore it.
- Vercel build was failing because `vite` is in `devDependencies` — fixed by setting `installCommand: npm install` (not `npm ci --omit=dev`) in `vercel.json` (`aed09b4`).

---

## Next Steps

Likely priorities (confirm with Chris):

1. **Create the WooCommerce product** on `torrea.fr` and update `BLEND_PRODUCT_URL` in `src/components/Result/OrderRecap.jsx:8`
2. **User testing** — run through the quiz with real customers at the market; gather feedback on archetype names, blend accuracy, and order flow UX
3. **Analytics** — add minimal event tracking (quiz completion, CTA clicks) — Plausible or a simple custom event would fit the no-backend philosophy
4. **SEO / OG tags** — add Open Graph meta tags to `index.html` so result page shares nicely
5. **Expand coffee catalogue** — `src/data/coffees.json` currently has 4 single-origins (El Triunfo, San Rafael, Kitché, Salomon); add more as the Torrea catalogue grows
6. **Email order notifications** — currently relies on the user's own email client for `mailto:`. Consider a lightweight form backend (e.g. Formspree, Resend) to make this more reliable and get CC copies

---

## Running Locally

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run test:run   # Run Vitest unit tests
npm run build      # Production build
```

Deployed on Vercel (linked to this repo). No environment variables required.
