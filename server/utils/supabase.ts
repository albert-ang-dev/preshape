// Shared Supabase client for server routes.
// Files in server/utils are available in every server route without an import,
// so routes can just call useSupabase().
//
// Uses the SECRET key, which bypasses Row Level Security.
// Never import this into app.vue or anything else that runs in the browser.
import { createClient } from '@supabase/supabase-js'

export function useSupabase() {
  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL or SUPABASE_SECRET_KEY is missing from .env (restart the dev server after adding them).',
    })
  }

  // The publishable key is public and is blocked by Row Level Security,
  // so inserts with it would fail with a confusing "permission denied"
  if (secretKey.startsWith('sb_publishable_')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_SECRET_KEY contains the publishable key. Use the secret key (sb_secret_...) instead.',
    })
  }

  return createClient(url, secretKey, {
    // The server doesn't log in as a user, so it shouldn't keep a session
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Supabase client with the PUBLISHABLE key, for normal user actions such as
// registering. It follows the same rules as a browser would (confirmation
// emails, rate limits, Row Level Security).
export function useSupabasePublic() {
  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_KEY

  if (!url || !publishableKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL or SUPABASE_KEY is missing from .env (restart the dev server after adding them).',
    })
  }

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
