// Supabase Edge Function — create a Stripe Checkout session
//
// This is a starting template, not wired up by default. The frontend
// currently simulates upgrades instantly (see upgradeTo() in js/app.js)
// so you can demo the product without a payment processor. To take
// real payments:
//
//   1. Create a Stripe account and Price IDs for Plus ($9/mo) and Pro ($19/mo)
//   2. supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   3. supabase functions deploy create-checkout
//   4. In js/app.js, replace upgradeTo() with a call to this function's
//      URL, then redirect the browser to the returned Checkout URL
//   5. Add a second function (stripe-webhook) that listens for
//      checkout.session.completed and updates profiles.plan there —
//      never trust the client to set its own plan in production.
//
// deno-lint-ignore-file
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const PRICE_IDS: Record<string, string> = {
  plus: Deno.env.get("STRIPE_PRICE_PLUS")!,
  pro: Deno.env.get("STRIPE_PRICE_PRO")!,
};

Deno.serve(async (req) => {
  try {
    const { plan, userId, email } = await req.json();
    if (!PRICE_IDS[plan]) return new Response("Unknown plan", { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${Deno.env.get("APP_URL")}/app.html#/dashboard?upgraded=1`,
      cancel_url: `${Deno.env.get("APP_URL")}/app.html#/settings`,
      client_reference_id: userId,
      metadata: { plan },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
