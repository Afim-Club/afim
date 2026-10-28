# Monetization roadmap: plans, Lightning discounts and what comes next

Status: proposal (2026-10-28). Portuguese version: [monetization.pt-BR.md](monetization.pt-BR.md).

## Goals

1. **Paid plans.** Afim stays free for everyone in the directory. A paid plan for advertisers (profile owners) unlocks the features below. Afim charges through Stripe (card) and Lightning.
2. **Discounts between Afim profiles.** An advertiser offers a discount to Afim members, optionally only to members who share some affinities.
3. **Discount only when paying with Lightning.** Afim computes the amount with the discount and asks the advertiser's own wallet for the invoice. The payer may split the bill: part in Lightning (with discount), the rest in cash, Pix or card, paid straight to the advertiser.
4. **Afim is not a payment gateway.** Customer money goes from the payer's wallet to the advertiser's wallet. Afim never holds, routes or settles it.

Also approved: reviews after a payment, referral rewards on the existing invite link, affinity-targeted coupons and campaigns, an advertiser dashboard, a verified badge, and an installable app (PWA) with "near me".

## Why Lightning

The main argument for advertisers. Brazil's tax reform (EC 132/2023, LC 214/2025) brings **split payment** to electronic payments such as Pix and cards, phased in from 2026 on: the CBS/IBS tax is separated at the moment of payment and the seller receives only the net amount, even when the sale makes a loss. A Lightning payment reaches the advertiser in full, and the advertiser keeps paying their taxes the normal way, on their own books. The discount offer is how the advertiser shares that cash-flow gain with afins.

Afim never presents Lightning as a way to avoid taxes: the terms and the plans page say the advertiser stays responsible for every tax on the sale. How split payment applies to each case, and when, must be confirmed with an accountant.

**Integrator partners.** Advertisers who do not want to depend on third-party wallets can run their own Bitcoin and Lightning node. Integrator partners (IT companies that set up and support nodes) are listed in the directory as `company` profiles in an "Integradores Bitcoin" category, and the plans page and the Lightning Address form point to them. No new data model is needed; a partner badge or referral deal can come later.

## Plans

Two plans to start (KISS): Free and Pro. Prices are proposed below.

| Feature key | Free | Paid |
| --- | --- | --- |
| Profile in the directory, affinities, map, place pages | yes | yes |
| `lightningOffers`: Lightning discount offers and the pay page | | yes |
| `affinityCampaigns`: offers limited to affinities, dates and coupon codes | | yes |
| `dashboard`: views, clicks, payments and discount given | | yes |
| `verifiedBadge`: document check and badge | | yes |
| `reviewReplies`: answer reviews | | yes |
| `featuredListing`: highlighted card and listed first | | yes |
| `cityFeatured`: can buy "Destaque na sua cidade" slots (extra charge) | | yes |

Members (people looking for afins) never pay. Paying a discounted Lightning bill, writing a review and inviting are free.

### Pricing proposal

Estimates to validate, made on 2026-10-28 for the chosen hosting (static sites on Cloudflare Workers, Strapi and MariaDB in Docker on Dockge).

Monthly operating cost at launch:

| Item | Estimate (R$/month) | Notes |
| --- | --- | --- |
| Server for Strapi + MariaDB (VPS 4 GB) | 60 to 150 | backups included |
| BTCPay Server (VPS 4 GB, pruned node) | 60 to 150 | zero if a partner or a hosted wallet is used at first |
| Cloudflare Workers (sites, Turnstile) | 0 | free tier; paid plan about US$ 5 if builds or requests grow |
| Transactional e-mail | 0 to 50 | free tiers cover the start |
| Domain | about 5 | about R$ 60 a year |
| Accountant (company in Simples Nacional) | 200 to 400 | the largest fixed cost |
| **Total** | **about 330 to 750** | |

Stripe takes a fee per card payment (check the current Brazilian rate); Lightning costs almost nothing.

Proposed prices:

| Plan | Price | Notes |
| --- | --- | --- |
| Free | R$ 0 | every person and every business; the directory only has value with volume |
| Pro (card, Stripe) | R$ 29/month or R$ 290/year | 2 months free on the yearly plan |
| Pro (Lightning, prepaid) | R$ 26/month or R$ 261/year in sats | 10% off, the same pitch Afim sells to advertisers |
| Destaque na sua cidade | R$ 49 per city for 30 days | Pro only, at most 3 per city |
| Fundador launch offer | R$ 19/month for life | first 100 Pro subscribers, to start the outreach |

Break-even is about 15 to 30 Pro subscribers. The free plan has a cost per profile close to zero (static pages and one database row), so it is paid by Pro and the city slots. An optional "Apoie o Afim" button for a Lightning donation can help from day one.

### Data model (Strapi)

`plan` (collection, public `find`/`findOne`, read by the plans page of the public site):

| Field | Type | Notes |
| --- | --- | --- |
| `name`, `slug` | string, uid | the `free` row exists with price 0 |
| `description` | text | |
| `priceMonthlyBrl`, `priceYearlyBrl` | decimal | shown on the plans page |
| `priceMonthlySats` | integer, optional | fixed sats price; empty = convert from BRL at checkout |
| `features` | json | list of feature keys from the table above |
| `highlights` | json | list of sentences for the plan card |
| `featured`, `active` | boolean | |
| `sortOrder` | integer | |
| `stripePriceIdMonthly`, `stripePriceIdYearly` | string, private | Stripe Price ids |

`subscription` (collection, private, only through `/api/members/me/subscription`):

| Field | Type | Notes |
| --- | --- | --- |
| `member` | relation to `member` | the plan belongs to the member, so it covers all their profiles (up to the existing cap of 10) |
| `plan` | relation to `plan` | |
| `provider` | enum `stripe`, `lightning`, `gift` | `gift` = referral reward or manual grant |
| `status` | enum `active`, `past_due`, `canceled`, `expired` | |
| `currentPeriodEnd` | datetime | the only date that decides access |
| `stripeCustomerId`, `stripeSubscriptionId` | string, private | |

**Entitlement rule**, in one helper (`cms/src/lib/entitlements.ts`): a profile has feature X when its `owner` has a subscription with `status` in (`active`, `past_due`), `currentPeriodEnd` in the future, and a plan whose `features` contains X. Every feature endpoint calls this helper. When the plan lapses, data is kept but hidden (offers stop showing, the badge disappears), and it comes back on renewal.

### Charging with Stripe

- `POST /api/members/me/subscription/checkout {plan, interval}` creates a Stripe Checkout Session (mode `subscription`) and returns its URL. `POST /api/members/me/subscription/portal` returns a Customer Portal URL to change the card or cancel. No card data ever touches Afim.
- `POST /api/billing/stripe/webhook` (public, verified with the Stripe signature, which needs the raw request body) handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` and `invoice.payment_failed`, and only updates `subscription`.
- Web page `/conta/plano`: current plan, renewal date, buttons for Stripe and Lightning.
- Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Prices live in Stripe; the plan row stores their ids.

### Charging with Lightning (Afim's own revenue)

Here Afim is the one being paid, like any shop, so it needs its own receiving wallet. Proposal: a self-hosted **BTCPay Server** (open source, runs in the Swarm stack) with a Lightning node or a connected Lightning wallet.

- Lightning plans are **prepaid**: buy 1 or 12 months. There is no recurring pull in Lightning, so we send a renewal reminder instead.
- `POST /api/members/me/subscription/lightning {plan, months}` creates a BTCPay invoice (BRL amount, BTCPay converts to sats) and returns it. The BTCPay webhook (`InvoiceSettled`) extends `currentPeriodEnd`.
- Env: `BTCPAY_URL`, `BTCPAY_STORE_ID`, `BTCPAY_API_KEY`, `BTCPAY_WEBHOOK_SECRET`.

## Lightning discounts between afins

### Data model

On the profile (owner-managed, through `/api/members/me/profiles/:id/payment` and `/offers`, not re-moderated, since they do not change public text):

- `profile.lightningAddress` (string, public): the advertiser's Lightning Address (`name@domain`, LUD-16) or an LNURL-pay link. Checked on save by fetching its LNURL-pay metadata.

`offer` (collection, owner-managed; public read returns only active offers of entitled profiles):

| Field | Type | Notes |
| --- | --- | --- |
| `profile` | relation | |
| `title` | string | e.g. "10% for afins" |
| `percent` | integer 1–50 | |
| `maxDiscountBrl` | decimal, optional | cap per payment |
| `minAmountBrl` | decimal, optional | |
| `audience` | enum `members`, `affinities` | `affinities` needs `affinityCampaigns` |
| `affinities` | relation to `affinity` | used when `audience = affinities`; political issues (with `lean`) are refused, same rule as profiles |
| `startsAt`, `endsAt` | datetime, optional | campaigns |
| `code` | string, optional | coupon code typed by the payer |
| `active` | boolean | |

Discounts are always for signed-in members: "between Afim profiles" means the payer is an Afim member. A visitor sees the offer and is asked to sign in.

### Payment flow

```
Payer (member)            Afim CMS                          Advertiser's wallet
     |  open profile, "Pay with Lightning"                          |
     |  bill R$ 200, R$ 120 in Lightning, coupon?                   |
     |--------------------------->|                                 |
     |                            | pick best eligible offer        |
     |                            | (affinities checked server side)|
     |                            | BRL -> sats quote               |
     |                            | GET lnurlp metadata + callback  |
     |                            |-------------------------------->|
     |                            |<------- BOLT11 invoice ---------|
     |<-- QR: 108 BRL in sats, pay R$ 80 in Pix/cash to the shop    |
     |----------------------- pays the invoice -------------------->|
     |                            | poll LUD-21 verify URL          |
     |                            | (or advertiser confirms)        |
```

1. `POST /api/payments/quote {profile, billBrl, lightningBrl, code?}` (authenticated). The server finds the offers that apply (active, dates, minimum, code, and, for `affinities`, an intersection with the member's own affinity preferences read server side) and picks the one with the largest discount. Offers never stack.
2. Math, only on the Lightning part: `discount = min(lightningBrl × percent, maxDiscountBrl)`; `payLightning = lightningBrl − discount`; `payOther = billBrl − lightningBrl`. Example: bill R$ 200, R$ 120 in Lightning, 10% → R$ 108 in Lightning, R$ 80 in Pix/cash, R$ 12 saved.
3. Convert `payLightning` to sats with a BRL/BTC rate (cached for 60 s, source set by `BTC_RATE_URL`). The quote is valid for 5 minutes.
4. Resolve the Lightning Address (LUD-16 → LUD-06 callback) with the amount in millisats and get a BOLT11 invoice **from the advertiser's wallet**. Afim only shows it as a QR code and a `lightning:` link.
5. Confirmation: if the wallet supports LUD-21 (`verify` URL), the page polls it and marks the payment `paid`. Otherwise the advertiser confirms it in the dashboard. The Pix/cash part is never tracked by Afim.

`payment` (collection, private; the payer sees theirs, the advertiser sees the ones to their profiles without the payer's identity):

`profile`, `offer`, `payer` (member, private), `billBrl`, `lightningBrl`, `discountBrl`, `amountSats`, `rateBrlPerBtc`, `invoiceHash`, `verifyUrl`, `status` (`pending`, `paid`, `expired`), `createdAt`.

This record is what reviews and the dashboard count on. Afim keeps the invoice and the preimage only for payments that earned points (see Affinity Points); for the rest it keeps only the hash.

## Highlight, featured in your city and Afim recommended

Three different things, kept apart so the directory stays credible:

- **Highlight** (`featuredListing`, in the paid plan): a paid profile gets a highlighted card and comes first among the profiles that **already match** the page and the affinity filter. It never makes a profile show up where it does not match.
- **Featured in your city** (`cityFeatured`, paid add-on on top of the plan): a "Destaque na sua cidade" strip at the top of the city page, at most 3 slots per page, for 30 days. The card is labeled "Destaque" so visitors know it was paid (CDC transparency).
- **Afim recommended in the city** (free, never sold): a "Recomendados do Afim" strip chosen by the admin following criteria: verified badge, at least 5 reviews with average 4.5 or more, active in the last 90 days, and no open moderation. Selling it would break the trust the reviews section works to build.

`city-highlight` (collection, shared with the public site, which reads only current rows at build time): `profile`, `uf`, `citySlug`, `kind` (`recommended` or `paid`), `startsAt`, `endsAt`, `sortOrder`, plus private `provider` (stripe|lightning) and `paymentRef` on paid rows. A paid row lasts 30 days and is created when a one-off Stripe Checkout or a BTCPay invoice bought from `/conta/plano` is settled, only while the plan is active. `recommended` rows are created only by the admin, following the criteria above, and are never sold.

The site is static, so highlight order, slots and recommended strips change only on a rebuild: add a daily scheduled build in Jenkins so slots start and end on time.

## Affinity Points (Pontos de Afinidade)

Members earn **1 point per sat** paid in Lightning through Afim, and advertisers can give a bigger discount in exchange for points.

### What can be recorded faithfully

Afim never touches the money, so it can only count payments whose invoice **Afim itself requested** in the pay flow above. A payment made in a shop with any other QR code is invisible to Afim and earns nothing. Inside the flow, every payment has a cryptographic proof:

1. **The invoice is checked when it arrives.** Afim fetched it from the advertiser's LNURL callback, so it decodes the BOLT11 and checks the amount equals the quote, the expiry, and that its `payment_hash` was never used before. The hash is stored in `payment`.
2. **The proof of payment is the preimage.** A Lightning invoice is paid only when the payer's wallet receives a secret (the preimage) whose SHA-256 is the `payment_hash`. Nobody can produce it without the payment going through. Afim gets it in one of two ways, and checks `sha256(preimage) == payment_hash` before crediting anything:
   - **From the payer's wallet.** When the browser has a WebLN wallet (Alby and others), the pay page calls `webln.sendPayment(invoice)`, which returns the preimage. Otherwise the member can paste it from the wallet's payment details.
   - **From the advertiser's wallet.** The LUD-21 `verify` URL returns `settled` and the preimage.
3. **No preimage, no points.** A payment the advertiser only confirms by hand still counts for reviews and the dashboard, but earns no points: there is no proof, and it would let an advertiser and a member invent payments.

Points are credited on the **amount actually paid in sats** (after the discount). The Pix or cash part earns nothing.

### Ledger

`point-entry` (collection, private, written only by the server; no update or delete route):

| Field | Type | Notes |
| --- | --- | --- |
| `member` | relation | |
| `kind` | enum `earn`, `redeem`, `expire`, `reverse` | |
| `points` | integer | positive for `earn`, negative for the rest |
| `payment` | relation, unique for `earn` | one credit per proven payment |
| `status` | enum `pending`, `available` | `earn` starts `pending` for 7 days |
| `prevHash`, `hash` | string | `hash = sha256(prevHash + fields)`, a chain per member |

The balance is the sum of `available` entries. Entries are never edited: a mistake is fixed with a `reverse` entry. The hash chain makes any change in the database visible: a daily job re-checks every chain and alerts the admin. Points expire 12 months after they become available.

### Secure, idempotent and always verifiable

- **Secure:** a point exists only with a preimage that matches the invoice's `payment_hash`; the invoice was requested by Afim and is signed by the advertiser's Lightning node. Only the server writes the ledger, inside one database transaction.
- **Idempotent:** `point-entry` has a unique key on (`kind`, `payment_hash`), so the same payment can never be credited twice, however many times the wallet, the page or the LUD-21 check reports it. The claim endpoint `POST /api/members/me/points/claim {paymentId, preimage}` returns the existing entry on a repeat call instead of an error, and redeeming uses the quote id the same way.
- **Always verifiable:** each `earn` entry keeps the BOLT11 invoice and the preimage (the invoice text carries only the profile name and "Afim", no personal data). Anyone holding them can recheck the proof without trusting Afim: the invoice signature shows which node issued it and for how much, and `sha256(preimage) == payment_hash` shows it was paid. In `/conta/pontos` the member can download their ledger with these proofs, and the page rechecks them in the browser.
- **History cannot be rewritten in silence:** every day Afim publishes the head `hash` of every member chain combined into one Merkle root at `GET /api/points/roots/:day`, and stamps that root in the Bitcoin blockchain with OpenTimestamps (free, no wallet needed). A member's downloaded ledger includes the path from their chain head to that day's root, so they can prove their balance existed on that date, even against Afim.

### Daily anchoring in detail

Library: `javascript-opentimestamps` (npm `opentimestamps`), called from Strapi cron jobs. No wallet, no fee.

New collection `point-root` (public read): `day` (date, unique), `merkleRoot`, `leafCount`, `otsProof` (the `.ots` file, base64), `status` (`pending`, `confirmed`), `bitcoinBlock` (height, once confirmed).

1. **Every new entry extends the member's chain.** When a `point-entry` is written, the server reads the member's last `hash` (inside the same transaction, with a row lock) and stores `prevHash` and `hash = sha256(prevHash | member chain id | kind | points | payment_hash | createdAt)`. The first entry uses a fixed `prevHash` of zeros. The chain id is a random id per member, not their user id.
2. **00:05 every day: build the tree.** A job takes the current head `hash` of every member chain (only these hashes, which reveal nothing about anyone), sorts them, and builds a Merkle tree. It stores the root in `point-root` for the previous day. A day with no changes still gets a root, so there are no gaps.
3. **Stamp the root.** The job calls `OpenTimestamps.stamp` with the root. The library sends it to several public calendars and gets back a pending `.ots` proof, which is saved in `otsProof` with `status = pending`. The root is now public at `GET /api/points/roots/:day`.
4. **Every hour: upgrade.** A job calls `OpenTimestamps.upgrade` on pending proofs. Once the calendars' Bitcoin transaction is in a block (usually a few hours), the proof gains the path to that block, and the job sets `status = confirmed` and `bitcoinBlock`. A calendar that is down is simply retried; a root still pending after 48 hours alerts the admin.
5. **The member checks.** In `/conta/pontos` the member downloads a JSON file with their entries (invoice, preimage, hashes), the Merkle path from their chain head to each day's root, and that day's `.ots`. The page checks in the browser: every preimage against its invoice, the chain from the first entry to the head, the path up to the published root, and the `.ots` against Bitcoin (the library asks public block explorers for the block header; anyone can also drop the root and the `.ots` on opentimestamps.org, or use `ots verify` with their own node).
6. **What it guarantees.** Once a day is confirmed, Afim cannot change, remove or back-date any entry of that day without the member's file failing to verify against a root that is already in the Bitcoin blockchain. Entries newer than the last root are protected only by the database until the next day.
7. **If the public calendars ever disappear,** Afim runs its own calendar (open source) and pays one Bitcoin transaction per day for the whole system, not per member or per payment. That cost goes into the paid plan price; members never pay to earn or check points.

### Anti-fraud

The risk is an advertiser and a member (or one person with both roles) paying each other in a loop to farm points, since the sats come back to them.

- No points for payments to a profile the payer owns, or whose owner invited the payer.
- Caps: at most 100,000 points per member per month and 20,000 per member per profile per month (values to tune).
- `pending` for 7 days before use, so the admin can reverse a suspicious burst.
- The admin sees the same signals as for reviews (account age, shared inviter, repeated pairs).

### Redeeming

An `offer` gains optional `pointsCost` (integer) and `pointsBonusPercent` (integer): "use 5,000 points for 10% more". In the quote the member chooses to use points; the extra discount applies to the Lightning part and the total discount is still capped at 50% plus `maxDiscountBrl`. Points are deducted with a `redeem` entry only when that payment is proven; an expired quote releases them.

Each advertiser decides whether to accept points and how much they are worth there. Afim does not pay advertisers for redeemed points: it is a discount the advertiser chooses to give to afins with a history of paying in Lightning. Redeeming needs `lightningOffers` (paid plan); earning is free for every member.

### Points are not money

Points have no cash value, cannot be sold, transferred, or converted into sats or reais, and are only a right to a discount the advertiser offers. This keeps them a loyalty program and out of payment or virtual asset rules (to confirm in the legal review). The terms say Afim can end the program with notice.

### LGPD

The ledger links a member to the businesses they paid, so it is personal data. The member sees their own entries in `/conta/pontos`; the advertiser sees only how many points were redeemed with them, never by whom. Deleting the account deletes the member's ledger and balance.

## Reviews

- `review` (collection): `profile`, `payment` (one review per paid payment), `author` (member, private), `rating` 1–5, `text`, `showName` (boolean, default false: shown as "Membro Afim"), `reply` (owner, needs `reviewReplies`), `moderationStatus` like profiles.
- Public: the average rating and active reviews on the profile page (needs a rebuild today, like any content). Sorting by rating can come later.

### Telling real reviews from attacks

The risk is fake reviews meant to hurt a business, from competitors or from people boycotting it over a position it holds. Rules, from the cheapest to the most manual:

1. **Paid purchase only.** A review needs a `paid` payment confirmed by the wallet (LUD-21) or by the advertiser, at or above a minimum (e.g. R$ 10), made at most 60 days before. An attacker has to pay the business to review it, which makes a campaign costly. Each review shows "Pagamento confirmado".
2. **One voice per person.** One review per member per profile (a new payment updates it, it does not add one), and only accounts at least 7 days old.
3. **Rate the service, not the opinions.** The review form and the terms say a review is about the service received. Reviews about the business's beliefs, politics or affinities, insults or personal data are removed in moderation. This also keeps sensitive data out of public text.
4. **Right of reply before publication.** Ratings of 1 or 2 stay hidden for 48 hours: the advertiser is notified and can reply or report. Then they publish with the reply next to them. A report does not hide a review by itself; the admin decides.
5. **Burst brake.** When a profile gets an unusual number of low ratings in a short time (e.g. 3 or more ratings of 1 or 2 in 48 hours, above its normal pace), new reviews for it wait in `review` moderation and the profile shows "Avaliações em análise". This stops a coordinated attack while it is checked.
6. **Signals for the admin, never public.** In the moderation queue the admin sees per review: account age, payment amount, whether the payment was wallet-confirmed, whether other reviewers in the burst were invited by the same person (`invitedBy`), and how many reviews the author wrote elsewhere. Member affinities are never used to judge reviews: that would be a new use of sensitive data.
7. **Show more than the average.** The profile shows the number of reviews and the 1 to 5 distribution, not only the average, and the average is shown only from 3 reviews on.

`review` gains `heldUntil` (datetime), `reportReason` (text, private) and `reportedAt` (datetime, private).

## Referral rewards

Uses the invite already in place (`member.inviteCode`, `member.invitedBy`). When an invited member's first paid subscription is settled (Stripe or Lightning), the inviter gets **one free month**: a `gift` subscription, or one month added to their current period. Each invited member rewards once. Paying sats out was left out on purpose: sending money would make Afim pay people and needs a funded wallet; months cost nothing to give.

## Coupons and campaigns

They are `offer` rows with `audience = affinities`, dates and/or a `code`. Example: "15% in November for members who marked Software livre". The advertiser never learns who has which affinity: matching runs server side, the same way `/matches` works.

## Advertiser dashboard

- `profile-stat` (collection, private): `profile`, `day`, `views`, `contactClicks`, `quotes`, `paidPayments`, `discountBrl`. Daily counters only, no IP, no cookie, no visitor id.
- `POST /api/profiles/:slug/hit {kind: view|click}` increments today's row (rate-limited like the submit route). The static pages send it with `navigator.sendBeacon`.
- Web page `/conta/painel`: last 30 days per profile. Any audience number below 5 is shown as "<5" so a single member cannot be singled out.

## Verified badge

- `profile.verifiedAt` (datetime) and `profile.verificationMethod` (enum `cnpj`, `professionalRegistry`, `manual`), set only in the admin.
- The advertiser asks from `/conta/perfis`; the admin checks a public source (CNPJ lookup, professional council registry) and sets the date. Afim does not store document images.
- The badge shows only while the owner has `verifiedBadge`.

## PWA and "near me"

- `web/` gets a manifest and a small service worker (offline shell and the last visited pages).
- "Perto de mim" on `/mapa` and listings: the browser asks for geolocation and sorts or zooms **in the browser**, using the coordinates already embedded at build time. The member's location is never sent to Afim, so there is nothing to store or consent to on the server.

## LGPD, legal and regulatory notes

Not legal advice: get a lawyer to review before launch, mainly items 1 to 3.

1. **Not a gateway, not custody.** Afim never receives, holds or forwards customer money: the invoice comes from the advertiser's wallet and the payment goes there. Afim only computes a price. This is meant to keep Afim outside the rules for payment institutions and for virtual asset service providers (Lei 14.478/2022 and the Central Bank rules that followed). Afim receiving sats for its **own** plans is a normal sale of a service.
2. **Different price by payment method** is allowed in Brazil by Lei 13.455/2017, and the advertiser sets the discount. Afim's terms must say the advertiser is responsible for honoring the price shown and for issuing their own fiscal documents and taxes on the full sale.
3. **Afim's own revenue in sats** is revenue like any other: it must be recorded in BRL at the date received; check reporting duties for crypto received (Receita Federal) with an accountant.
4. **Affinities stay sensitive data.** Offers target affinities, but the match runs server side, the advertiser only sees aggregate counts (minimum 5), and nothing about a member's affinities goes into URLs, invoices (the invoice description is only the profile name and "Afim"), or the payment record.
5. **Payments link a member to a business.** The `payment` and `review` rows are personal data: the advertiser never sees the payer's identity and reviews are anonymous by default. When a member deletes their account, Afim erases: the `payer` link of each of their payments (the row stays without anyone attached, so the advertiser's history, dashboard counts and discount totals stay correct), their reviews (text, rating and the report data; the profile average is recalculated), and everything that already goes today (member, affinities, user, sessions, owned profiles). Pending payments older than 30 days are deleted.
6. **Stripe and BTCPay** are processors: list them in the privacy notice. Card data stays in Stripe.
7. **Geolocation** for "near me" never leaves the device; the existing profile position stays opt-in and rounded (about 1 km).

## Milestones

Each milestone is one or a few small PRs, in this order:

1. **Plans + Stripe.** `plan`, `subscription`, entitlement helper, Checkout, webhook, Customer Portal, `/conta/plano`. The public plans page reads `plan` (done in the public site work).
2. **Lightning for plans.** BTCPay in the stack, prepaid months, renewal reminder.
3. **Lightning discounts.** `lightningAddress`, `offer` with `audience = members`, quote + LNURL invoice, pay page with split, LUD-21 check, WebLN preimage check.
4. **Reviews.** After a paid payment; replies on the paid plan.
5. **Campaigns.** `audience = affinities`, dates and coupon codes.
6. **Dashboard.** Daily counters and `/conta/painel`.
7. **Verified badge.**
8. **Referral rewards.** One free month per invited paying member.
9. **PWA and near me.**
10. **Highlight, featured in your city and Afim recommended.** Highlight ordering can ship with milestone 1; the city slots and the recommended strip need reviews and the badge first.
11. **Affinity Points.** After the discounts (milestone 3), which already store each payment's hash and proof.

## Open questions

- Confirm the pricing proposal above (Pro, Lightning discount, city slot, Fundador offer).
- BTCPay Server self-hosted (proposed) or a hosted provider for Afim's own wallet.
- BRL/BTC rate source.
- Should the advertiser also be able to confirm payments when the wallet has no LUD-21 (proposed: yes)?
- Affinity Points: monthly caps, pending period and expiry values.
- Price and duration of a city slot (e.g. per month), and the slot cap per page.
- Integrator partners: only a category for now, or a partner badge and referral deal?
