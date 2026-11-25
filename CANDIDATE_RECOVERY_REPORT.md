# Historical Candidate Recovery Report

Generated 2026-11-24 after the rejected Vite build was identified as a different PurePulse version. No candidate was made primary and no production service was changed.

## Candidate previews

| Preview | Source | Matching evidence | Missing/uncertain |
|---|---|---|---|
| http://127.0.0.1:3036 | `PurePulse`, detached `7af218c3b0590c11ec62dcc29f67008428885c4c` | First recovered splash implementation; pulsing rings, PurePulse logo, loading message, animated bar, violet/cyan palette; full `home.html` site | Earlier splash generation; no four-variant entrance system; footer uses portal/login wording rather than explicit Affiliate/Admin labels |
| http://127.0.0.1:3037 | `PurePulse`, detached `5e6d9f93c91c3b27b9bb843d7dced3f0193aed2a` | Four randomized splash variants (ECG, orbital, grid, bloom), canvas logo animation, skip/exit behavior, portfolio lookbook, four pricing cards, $150 deposit, 12-month contracts | Embedded splash code was later split/cleaned; footer labels in this commit are Affiliates, Client Portal, and Login |
| http://127.0.0.1:3038 | `PurePulse`, detached `821a2535a2314b6be46d02f864be0c235a8de9ab` | Cleanest recovered entrance architecture: animated `index.html` intro/skip flow transitions to `home.html`; home retains lookbook carousel, four plans, $150 deposit, 12-month contract, `contract.html`, screenshots, form, and portal/login links | Affiliate link was added later; exact Admin-vs-Login wording remains uncertain |
| http://127.0.0.1:3039 | `PurePulse`, detached `d2b3ed83298d3d3238bfcbcafbc4e85ec6f55187` | Latest static lineage: intro animation, `home.html` portfolio carousel, four plans (Starter/Growth/Premium/Business), $150 deposit, 12-month contracts, contract page, affiliate application path, client portal/login, lead form, chat | Later additions may differ from the user's remembered footer labels; backend is linked at `login.purepulse.one`, not embedded in this static repository |
| http://127.0.0.1:3035 | `PurePulse-Marketing`, Vite build | Rejected by user; newer alternate headline/design and no recovered splash/entrance flow | Not a restoration candidate |

## Exact source files

- Entrance animation: `PurePulse/index.html` at `821a253`, `5e6d9f9`, and `d2b3ed8`.
- Main landing site: `PurePulse/home.html` at the same commits.
- Shared visual system and carousel previews: `PurePulse/style.css` and inline `home.html` lookbook code.
- Contract: `PurePulse/contract.html`.
- Portfolio assets: `PurePulse/screenshots/*`.
- Splash reference variants: `PurePulse/splash_screens/splash-intro.html`, `splash-variant-a.html`, `splash-variant-b.html`, and `splash-variant-c.html`.
- Original video splash asset: `PurePulse/splash.mp4` in the earlier history and candidate worktrees.
- Backend: `purepulse-admin` history, especially affiliate/onboarding commits `8aafe17`, `78ec1d1`, payout commit `476751a`, and 38 Supabase migrations through the current branch.

## Chronological recovery timeline

| Date | Commit | Change |
|---|---|---|
| 2026-06-27 | `16b6044`, `a89607b` | Added original splash video/branding and dismiss logic. |
| 2026-08-12 | `15a3fb1` | Restored the styled production version from desktop. |
| 2026-08-12 | `7af218c` | Added pulsing splash screen and animated logo. |
| 2026-08-12 | `5e6d9f9` | Added four randomized splash animations. |
| 2026-08-12 | `821a253` | Split entrance animation into `index.html` and full site into `home.html`; removed embedded splash duplication. |
| 2026-08-12 | `33e6cb9`, `8e07d23`, `c86f7f2` | Fixed splash leakage, scroll lock, duplicate markup, and timeout behavior. |
| 2026-08-13 | `d09aac1` | Added six randomized splash taglines. |
| 2026-08-19 | `58e1d7f` | Linked Affiliates to prescreen video interview/onboarding. |
| 2026-08-20 | `d2b3ed8` | Latest static site with chat, full portfolio additions, pricing, contract, and affiliate entry. |

## Recovery conclusion

The most complete recoverable public baseline is `PurePulse:d2b3ed8`, with `PurePulse:821a253` as the cleanest pre-chat entrance split. The backend baseline is `purepulse-admin` at its existing main history, with affiliate/onboarding functionality concentrated in `8aafe17` and `78ec1d1`, and payout functionality in `476751a`. User confirmation is required before creating a restoration branch from either public candidate.
