# Catalyst upgrade plan: gitool.com → Catalyst Makeswift 1.13

_Assessed 2026-11-07. Upstream refs: `bigcommerce/catalyst` `integrations/makeswift` @ 1.13.1 (2026-10-28), `canary` @ 45627f21 (2026-11-06). Our ref: `origin/main` @ f13bbcb3._

## Summary

Getting up to date is realistic if we merge BigCommerce's **`integrations/makeswift`** branch, not plain `canary`. Our site is the Makeswift edition. Plain `canary` no longer carries Makeswift and is much further from our code.

A trial merge (done in a throwaway worktree, then deleted) gave these results:

| | Against plain `canary` | Against `integrations/makeswift` |
|---|---|---|
| Common starting point | 2025-02-18 (0a017d77) | 2025-03-31 (9d07a716) |
| Our commits since | 644 | 586 (excluding merges) |
| Upstream commits since | 632 | 725 (excluding merges) |
| Files that conflict | 178 | **72** |
| Conflict spots (excluding `pnpm-lock.yaml`) | ~700 | **183** |

Most of our own work comes across without conflicts: the P21 and ORS sync, the B2B components and lib, the API routes and `lib/seo.ts`. It lives in files BigCommerce never touched.

## Framework changes underneath

| Package | Ours | Upstream `integrations/makeswift` |
|---|---|---|
| next | 15.5.7 | ~16.3.4 |
| Node (`engines`) | 22 | >=24.0.0 |
| next-intl | ^3.26.5 | ^4.6.1 (breaking) |
| next-auth | 5.0.0-beta.25 | 5.0.0-beta.30 |
| @makeswift/runtime | ^0.28.9 | 0.29.2 |
| react / react-dom | ^19.1.2 | 19.1.7 |
| tailwindcss | ^3.4.16 | ^3.4.17 (no major change) |
| typescript | ^5.8.2 | ^5.8.3 |
| UI libraries | Radix | Radix (newer) + `@base-ui/react`, `@c15t/nextjs` (cookie consent) |

Known Next 16 work items:
- `middleware.ts` becomes `proxy` (upstream has `core/proxies/with-makeswift.ts`). Our Makeswift and B2B routing lives there.
- next-intl 4 API changes.
- next-auth beta.30 changes, which touch the B2B and portal SSO.

## Where the conflicts are

The conflicts concentrate in the areas both sides customised:
- **Product page:** the B2B widget, backorder messages and reviews.
- **Cart:** the B2B cart drawer and cart behaviour.
- **Header and navigation:** the B2B Portal link.
- **Category, search and brand pages.**
- **Makeswift wiring.**

| Spots | File |
|---:|---|
| 10 | core/vibes/soul/sections/product-detail/index.tsx |
| 10 | core/vibes/soul/primitives/navigation/index.tsx |
| 10 | core/app/[locale]/(default)/product/[slug]/page.tsx |
| 9 | core/vibes/soul/sections/cart/client.tsx |
| 8 | core/vibes/soul/sections/product-detail/product-detail-form.tsx |
| 7 | core/app/[locale]/(default)/(faceted)/search/page.tsx |
| 6 | core/vibes/soul/sections/product-detail/product-gallery.tsx |
| 6 | core/vibes/soul/sections/footer/index.tsx |
| 6 | core/components/header/index.tsx |
| 6 | core/app/[locale]/(default)/(faceted)/category/[slug]/page.tsx |
| 5 | core/vibes/soul/primitives/product-card/index.tsx |
| 5 | core/app/[locale]/(default)/(faceted)/brand/[slug]/page.tsx |
| 4 | core/vibes/soul/sections/sign-in-section/sign-in-form.tsx |
| 4 | core/app/[locale]/(default)/product/[slug]/page-data.ts |
| 3 | core/vibes/soul/sections/cart/index.tsx |
| 3 | core/package.json |
| 3 | core/next.config.ts |
| 3 | core/lib/makeswift/client.ts |
| 3 | core/data-transformers/product-card-transformer.ts |
| 3 | core/auth/index.ts |
| 3 | core/app/[locale]/layout.tsx |
| 3 | core/app/[locale]/(default)/webpages/[id]/normal/page.tsx |
| 3 | core/app/[locale]/(default)/product/[slug]/_components/reviews.tsx |
| 3 | core/app/[locale]/(default)/cart/page.tsx |
| 3 | core/app/[locale]/(default)/[...rest]/page.tsx |
| 1–2 | 42 more files (pages, Makeswift lib, cart lib, forms, `messages/en.json`, `globals.css`, `tailwind.config.js`, `.env.example`) |
| delete/edit | core/middleware.ts, core/middlewares/with-makeswift.ts, core/lib/bodl/bodl.ts, core/lib/bodl/analytics.d.ts, core/lib/makeswift/components/button-link/button-link.makeswift.tsx |

## Plan

Production stays on `main` until the upgrade is approved and merged.

1. **Security patch on `main` (first, small).** Bump `next` to 15.5.28 and `react`/`react-dom` to 19.2.9. Check the Vercel preview, then merge. This keeps the live site patched while the upgrade is in progress. The patch includes CVE-2026-23864.
2. **Create `upgrade/catalyst-1.13`** from `main` and merge `upstream/integrations/makeswift`.
   - Resolve the 72 files, keeping our behaviour wherever we've customised.
   - Regenerate `pnpm-lock.yaml`; don't hand-merge it.
   - Push to `origin` (`eagle20/catalyst-gi`) only, never to `upstream`.
3. **Build on Next 16 and Node 24.**
   - Set `engines.node` to 24 in the branch's `package.json`, so only preview builds use Node 24 and production stays on 22.
   - Fix the type and build errors: the proxy rename, next-intl 4, next-auth beta.30 and Makeswift 0.29.
4. **Test on the Vercel preview.**
   - B2B: the product widget, B2B cart drawer, SSO into the portal, B2COnly/B2BOnly wrappers and the header portal link.
   - GMC checkout link, promotions page, review submission and backorder messages.
   - ORS and P21 stock: the sync crons, and stock shown on product pages.
   - SEO: one each of the title, og and twitter tags; canonical URLs; the sitemap.
   - Makeswift editor: on the preview with the production site key, since the local `.env.local` key points to a different Makeswift site.
   - Upstream's new behaviour: uncached stock, the quantity-over-stock check, the add-to-cart productId tamper fix, ProductViewed once per visit, cart quantity click combining, YouTube product videos.
5. **Merge to `main`,** and switch Vercel (catalyst-gi-core) to Node 24.x at the same time. Watch the first production deploy and the cron runs.
6. **Stay current.** Merge `integrations/makeswift` every one to two months so the gap stays small.

## Effort and risks

- **Estimate:** three to five working sessions. That's one or two for the merge and conflicts, one for build fixes on Next 16, and one or two for preview testing.
- **Highest risk:** cart and B2B flows, the SSO token handoff (next-auth change), and the Makeswift editor and rendering.
- **Mitigation:** everything stays on the branch with its own preview URL. Production changes only at step 5, and rolling back means reverting the merge.
- **Not needed:** Cloudflare or BigCommerce hosting changes and multi-language support (we're on Vercel, US English only). The agentic-commerce (UCP) endpoints come along with the merge but stay unused.

## Notes

- Local `git fetch upstream` needs AVG's certificate: `git -c http.sslCAInfo="C:/ProgramData/AVG/Antivirus/wscert.pem" fetch upstream integrations/makeswift:refs/remotes/upstream/integrations/makeswift`
- Local git is 2.31, which lacks `merge-tree --write-tree`. Use a throwaway `git worktree` for trial merges.
- Upstream also publishes `integrations/b2b-makeswift` (1.13.1), BigCommerce's own B2B edition. Compare it with our B2B overlay before any future rebuild; we're not moving to it in this plan.
