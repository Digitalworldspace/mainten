# Hearth Ledger — AI Homeowner Assistant (MVP)

A working MVP: homeowner adds their home's real numbers once, gets a monthly
ranked action plan, and hits a paywall for the deeper features. Plain HTML/CSS/JS
— no build step, no framework, easy to read and easy to hand to another developer.

**Try it immediately, with zero setup:** open `index.html` in a browser, click
"Get started free," and sign up. The app runs in **demo mode** — your account
and data are stored in `localStorage` in your own browser. This is what "in
working condition" means before you connect a real backend. Nothing to install.

## What's in here

```
index.html              Marketing / landing page
app.html                The app shell (auth, onboarding, dashboard, etc.)
css/style.css           Design system ("ledger" visual style)
js/market-data.js       Real, sourced 2026 market benchmarks
js/supabase-client.js   ← put your Supabase URL + anon key here
js/db.js                Data layer (Supabase when configured, else demo mode)
js/insights.js          Rule-based recommendation engine + home health score
js/app.js               Router, views, paywall logic
supabase/schema.sql     Full Postgres schema + Row Level Security policies
supabase/functions/create-checkout/index.ts   Stripe Checkout template (optional)
```

## Go from demo mode to a real backend (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project: **SQL Editor → New query** → paste the contents of
   `supabase/schema.sql` → **Run**. This creates the tables, the trigger
   that auto-creates a profile on signup, and the Row Level Security
   policies that make sure a user can only ever see their own data.
3. In your project: **Settings → API** → copy the **Project URL** and the
   **anon public** key.
4. Paste them into `js/supabase-client.js`:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
5. Reload the app. `DEMO_MODE` turns off automatically and every signup,
   home profile, task, expense, and insight now lives in real Postgres.
6. Optional: **Authentication → Providers** → turn on email confirmations,
   or add Google/Apple sign-in — `db.js` already calls the standard
   Supabase Auth methods, so most providers work with no other changes.

The anon key is meant to be public in frontend code — it's safe because
every table has Row Level Security policies restricting rows to
`auth.uid()`. Don't disable RLS.

## Push it to GitHub

```bash
cd hearth-ledger
git init
git add .
git commit -m "Hearth Ledger MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hearth-ledger.git
git push -u origin main
```

Then deploy the static site for free with any of:
- **GitHub Pages**: repo → Settings → Pages → Deploy from branch → `main`
- **Netlify** or **Vercel**: "Import from GitHub," no build command needed
  (it's static HTML — just set the publish directory to the repo root)

## How the free/paid gating works (this is the earnings mechanism)

- Every homeowner gets a real, ranked **10-item monthly action plan**
  generated from their own numbers vs. the benchmarks in `market-data.js`.
- **Free** shows items **1–7**; items **8–10** are visibly present but
  blurred and locked (`renderInsightsList()` in `js/app.js`, controlled by
  `FREE_UNLOCK_LIMIT`). This is deliberate: free users see there's more
  value waiting, not a vague "upgrade to see more."
- **Cost tracking** (expenses page) and the **full maintenance schedule**
  are entirely gated behind **Plus ($9/mo)** — free users see their next
  3 tasks only.
- **Savings opportunity finder, document analysis, home value tracking,
  and the annual report** are entirely gated behind **Pro ($19/mo)**.
- Plan state lives in `profiles.plan` in the database (`free` / `plus` /
  `pro`), enforced by the UI. Change `FREE_UNLOCK_LIMIT` or any gate in
  `app.js` to tune the funnel.

## Connecting real payments (Stripe)

Right now, clicking "Upgrade" in the app calls `upgradeTo(plan)` in
`js/app.js`, which **instantly** sets `profiles.plan` — this is a demo
shortcut so you can preview every locked feature without a payment
processor. Before charging real customers:

1. Create a Stripe account, a product, and two recurring Prices (Plus
   $9/mo, Pro $19/mo).
2. Deploy `supabase/functions/create-checkout/index.ts` (a working
   template is included — see the comments at the top of that file for
   the exact `supabase functions deploy` steps and secrets to set).
3. Add a second Edge Function, `stripe-webhook`, that listens for
   `checkout.session.completed` and updates `profiles.plan` **from the
   server**, using the Stripe secret key — never let the browser set its
   own plan once real money is involved.
4. Replace the body of `upgradeTo()` in `js/app.js` with a `fetch()` to
   your `create-checkout` function, then redirect the browser to the
   returned Stripe Checkout URL.

## Where the benchmark numbers come from

All figures in `js/market-data.js` are sourced and dated inline:
Insurify's 2026 American Homeowner Report (home insurance), Freddie Mac's
PMMS (mortgage rates, week of Sept 3, 2026), and Bankrate's 2026 hidden
costs of homeownership report (property tax, utilities, maintenance).
These will drift over time — treat them as a starting point and refresh
periodically, or swap in a live rates API if you want them to auto-update.

## Extending the MVP

Natural next steps, roughly in order of value:
- Real Stripe billing (above)
- Actual insurance-quote comparison (partner API or affiliate links)
- Real document analysis (send uploaded PDFs to an LLM with OCR)
- Zillow/Redfin-style home value API instead of the mocked trend line
- Email/SMS reminders (Supabase Edge Function + cron + Resend/Twilio)
- Multi-home support (schema already allows more than one row per user)
