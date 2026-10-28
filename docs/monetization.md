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

Two plans to start (KISS). Prices are open (see the end).

| Feature key | Free | Paid |
| --- | --- | --- |
| Profile in the directory, affinities, map, place pages | yes | yes |
| `lightningOffers`: Lightning discount offers and the pay page | | yes |
| `affinityCampaigns`: offers limited to affinities, dates and coupon codes | | yes |
| `dashboard`: views, clicks, payments and discount given | | yes |
| `verifiedBadge`: document check and badge | | yes |
| `reviewReplies`: answer reviews | | yes |

Members (people looking for afins) never pay. Paying a discounted Lightning bill, writing a review and inviting are free.

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

This record is what reviews and the dashboard count on. Afim does not keep the invoice after it expires or is paid, only its hash.

## Reviews

- `review` (collection): `profile`, `payment` (one review per paid payment), `author` (member, private), `rating` 1–5, `text`, `showName` (boolean, default false: shown as "Membro Afim"), `reply` (owner, needs `reviewReplies`), `moderationStatus` like profiles.
- Public: the average rating and active reviews on the profile page (needs a rebuild today, like any content). Sorting by rating can come later.

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
5. **Payments link a member to a business.** The `payment` and `review` rows are personal data: the advertiser never sees the payer's identity, reviews are anonymous by default, and account deletion erases the member's payments and reviews (reviews may stay as anonymous text if we decide so; to define in the privacy notice). Pending payments older than 30 days are deleted.
6. **Stripe and BTCPay** are processors: list them in the privacy notice. Card data stays in Stripe.
7. **Geolocation** for "near me" never leaves the device; the existing profile position stays opt-in and rounded (about 1 km).

## Milestones

Each milestone is one or a few small PRs, in this order:

1. **Plans + Stripe.** `plan`, `subscription`, entitlement helper, Checkout, webhook, Customer Portal, `/conta/plano`. The public plans page reads `plan` (done in the public site work).
2. **Lightning for plans.** BTCPay in the stack, prepaid months, renewal reminder.
3. **Lightning discounts.** `lightningAddress`, `offer` with `audience = members`, quote + LNURL invoice, pay page with split, LUD-21 check.
4. **Reviews.** After a paid payment; replies on the paid plan.
5. **Campaigns.** `audience = affinities`, dates and coupon codes.
6. **Dashboard.** Daily counters and `/conta/painel`.
7. **Verified badge.**
8. **Referral rewards.** One free month per invited paying member.
9. **PWA and near me.**

## Open questions

- Plan name and prices (monthly, yearly, sats).
- BTCPay Server self-hosted (proposed) or a hosted provider for Afim's own wallet.
- BRL/BTC rate source.
- Should reviews stay public after the author deletes the account (as anonymous text) or be removed?
- Should the advertiser also be able to confirm payments when the wallet has no LUD-21 (proposed: yes)?
- Integrator partners: only a category for now, or a partner badge and referral deal?
