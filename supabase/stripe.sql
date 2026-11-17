-- PreShape: link profiles to Stripe.
-- Run once in the Supabase dashboard: SQL Editor → paste → Run.
--
-- Only the server (secret key) writes these columns, from the Stripe webhook.
-- Users still can't update their own profile, so they can't make themselves Premium.

alter table public.profiles
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text;
