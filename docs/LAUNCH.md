# Launching the tattoo flash

Every reading is free. The one paid thing is the €7 tattoo flash (nine designs on two print-ready
sheets and the files). The code is ready; nothing charges money until you finish these steps.

## 0 · Before you sell anything (Portugal)

- Make sure you have an **open activity at Finanças** (início de atividade) that covers
  selling digital content online. Ask a *contabilista* which activity code fits.
- **VAT:** under €15,000 a year you can stay in the Article 53 exemption regime; above it
  you charge VAT, and EU buyers' VAT goes through the OSS. `STRIPE_TAX` in
  `worker/wrangler.toml` switches on Stripe Tax when you need it.
- **Invoices:** Portugal expects an invoice for each sale, including small ones. Decide with
  your contabilista how to issue them (certified invoicing software that imports Stripe
  payments is the usual answer). This is the one real piece of admin — settle it first.
- Fill in every highlighted `[…]` in `terms.html` **and** `termos.html` (the Portuguese
  version): name, NIF, fiscal address, email, ADR entity, date.

## 1 · Stripe

1. Create an account at stripe.com (business type: individual / sole proprietor).
   Website: `https://miguelmalungo.github.io/starot/`. Statement descriptor: `STAROT`.
2. **Settings → Business → Public details:** support email, and set both *Terms of
   service* and *Privacy policy* to `https://miguelmalungo.github.io/starot/terms.html`.
   Checkout's "I agree to the Terms" box needs this; without it, checkout fails.
   (Portuguese buyers see a consent line that links to `termos.html` instead.)
3. **Settings → Payment methods:** keep cards, Apple Pay, Google Pay; turn on **MB WAY**.
   Leave **Multibanco off**: it settles days later, and the designs should open at once.
   If **Pix** is offered to your account, turn it on for Brazilian buyers — the page waits
   up to ~40 seconds for a payment to confirm, which covers Pix.
4. **Settings → Customer emails:** turn on receipts for successful payments.
5. **Developers → API keys:** create a **restricted key** with *Checkout Sessions: Write*
   and nothing else. Make one in **test mode** first (`rk_test_…`).
6. For the offering bowl: **Payment Links → New**, choose *Customers choose what to pay*,
   name it "An offering". Copy the link.

## 2 · The payment worker (Cloudflare, free)

```bash
cd worker
npm install
npm test                               # 13 checks against a mock Stripe
npx wrangler login                     # opens the browser once
npx wrangler secret put STRIPE_SECRET_KEY   # paste the rk_test_… key
npx wrangler deploy                    # prints https://starot-pay.<you>.workers.dev
curl https://starot-pay.<you>.workers.dev/health
```

## 3 · Point the site at it

At the top of the `<script>` in `index.html`:

```js
const CONFIG={
  payApi:"https://starot-pay.<you>.workers.dev",
  price:"€7",
  donationUrl:"https://buy.stripe.com/…",   // the offering link
  goatcounter:"starot",                     // optional, see step 5
};
```

Commit, then publish: `git push origin main && git push origin main:gh-pages`.

## 4 · Test, then go live

In test mode, on the live site, open **Your tattoos**, draw a set and buy it with card `4242 4242 4242 4242`, any future
date, any CVC. Check that:

- the watermark goes, the downloads appear, and the address changes to `?sheet=cs_test_…`
- that address opens the same designs on your phone too
- the flash sheet and the ZIP download (on a phone, the sheet opens the share sheet)
- cancelling at checkout brings you back to the preview with "No payment was taken"

Then switch to real money: create the same restricted key in **live mode** and run
`npx wrangler secret put STRIPE_SECRET_KEY` again with `rk_live_…`. Buy one tattoo flash yourself
with a real card and refund it from the Stripe dashboard.

## 5 · Measure (optional)

Create a site at goatcounter.com (no cookies, no consent banner needed) and put its code
in `CONFIG.goatcounter`. Check its plans — the free tier is for non-commercial use.
The page reports these events under `ev/…`:

| event | meaning |
|---|---|
| `open-ink` | opened the tattoo door |
| `goink-astro`, `goink-num` | tapped "Make it a tattoo" from a free reading |
| `ink-preview` | drew a set of tattoo designs (free preview) |
| `ink-view-…` | looked at one design on paper |
| `unlock-open` | opened the tattoo flash dialog |
| `checkout-start` | went to Stripe |
| `paid` | came back paid |
| `flash`, `zip`, `ink-svg`, `ink-png` | downloaded the sheet, the ZIP, a single file |
| `map-cast`, `numbers-read`, `tarot-dealt`, `poster` | the free readings and the star poster |
| `share`, `offering-open`, `offering-click`, `lang-pt` | the rest |

`paid ÷ ink-preview` is the number to watch; `ink-preview ÷ map-cast` shows whether the
free readings lead people to the tattoos.

## Changing things later

- **Every deploy:** raise `MEDIA_V` in `index.html` by one and write the same number in
  `version.txt`. Browsers holding the old page then reload it once, and new images bypass the cache.

- **Price:** `PRICE_CENTS` in `worker/wrangler.toml` (now 700, then `npx wrangler deploy`)
  *and* `CONFIG.price` in `index.html`.
- **Custom domain:** update `SITE_URL`, `TERMS_URL` (and `ALLOWED_ORIGINS` if you keep
  both) in `wrangler.toml`, the canonical / `og:` URLs in `index.html`, and Stripe's public
  details.
- **Promotion codes** are on at checkout: create coupons in Stripe (e.g. 100 % off for
  friends, 50 % off per influencer) and hand out the codes.
- **Trying the flow locally:** `npm run dev:mock` in `worker/` starts a fake Stripe on
  `localhost:8787`. Serve the site on localhost, then in its console run
  `localStorage['starot.api']='"http://localhost:8787"'` and reload.

## How safe is the paywall?

The designs are drawn in the browser, so someone could screenshot the watermarked preview
or dig the drawing code out with developer tools. That is normal for a cheap web purchase:
the clean A3 sheet, the vector files and the permanent link are what people pay for. If it
ever matters, the next step is to render the files in the worker, only for paid sessions.
