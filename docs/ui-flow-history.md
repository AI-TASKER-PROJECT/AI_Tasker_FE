# UI Flow History

This file records the history of Stitch-to-React UI conversion.

Each time the AI agent converts a screen, it must append a new entry here.

## History

<!-- New entries will be added below -->

### 2026-06-21 - Landing Page

* Screen name: `Landing Page`
* Route: `/`, shared with `/how-it-works` and `/about`
* Stitch raw file: `stitch/raw/landingPage.html`
* Stitch screenshot: `stitch/screenshots/landingPage.png`
* React files changed:
  `src/pages/PublicPages/PublicPages.helpers.tsx`,
  `src/layouts/PublicLayout/PublicLayout.tsx`
* Logic preserved:
  route sharing for `/`, `/how-it-works`, `/about`; CTA navigation via session-aware `getPublicExperience`; public jobs API load for featured jobs; anchor scrolling by pathname; existing public shell navigation/session actions
* Checks run:
  `npm run lint`, `npm run build`, `npm test`
* Result:
  Converted the available Landing Stitch export into the existing `LandingPage` and aligned the shared public footer copy to Vietnamese.
* Notes:
  `agent/ui-flow-state.json` referenced `landing.html`, but the available export was `landingPage.html`; tracking was normalized to the actual file name. `Login` has no matching Stitch export in `stitch/raw/` and was marked `needs-stitch-export`.
* TODOs:
  Export the Login Stitch screen as `stitch/raw/login.html` with a matching screenshot before the next run.

### 2026-06-21 - Landing Page (Reconversion)

* Screen name: `Landing Page`
* Route: `/`, shared with `/how-it-works` and `/about`
* Stitch raw file: `stitch/raw/landingPage.html`
* Stitch screenshot: `stitch/screenshots/landingPage.png`
* React files changed:
  `src/pages/PublicPages/LandingPage/LandingPage.tsx`,
  `src/layouts/PublicLayout/PublicLayout.tsx`
* Logic preserved:
  route sharing for `/`, `/how-it-works`, `/about`; CTA navigation via session-aware `getPublicExperience`; anchor scrolling by pathname; existing public shell navigation/session actions
* Checks run:
  `npm run lint`, `npm run build`, `npm test`
* Result:
  Reworked the Landing implementation so the hero, feature bento grid, and public shell footer/header align much more closely with the exported Stitch screen.
* Notes:
  Removed extra sections that were not present in the Stitch export and mapped `/about` to the shared footer anchor instead of rendering a separate made-up content section.
* TODOs:
  Export the Login Stitch screen as `stitch/raw/login.html` with a matching screenshot before the next run.
