// Monthly interview limits per plan, and how many a user has used this month.
// An interview counts as soon as it's STARTED (questions generated), whether
// or not it's finished, because that's when the OpenAI cost happens.

import { createHash } from 'node:crypto'

export const PLAN_LIMITS: Record<string, number> = { free: 4, premium: 8 }

// Midnight UTC on the 1st of the current month
export function startOfMonthUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

// Midnight UTC on the 1st of next month: when the count resets
export function startOfNextMonthUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

// The user's plan, read from the database: 'free' or 'premium'
export async function getPlan(userId: string): Promise<'free' | 'premium'> {
  const { data, error } = await useSupabase()
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your profile: ${error.message}` })
  }
  return data?.plan === 'premium' ? 'premium' : 'free'
}

// Throws 403 unless the user is on the Premium plan (for Premium-only routes)
export async function requirePremium(userId: string) {
  if (await getPlan(userId) !== 'premium') {
    throw createError({ statusCode: 403, statusMessage: 'Interview history is part of the Premium plan.' })
  }
}

// SHA-256 of a lowercased email, so deleted accounts can be recognised
// without storing the address itself
export function hashEmail(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

// Interviews used this month by DELETED accounts with this email, so deleting
// and re-registering doesn't reset the monthly limit
async function deletedAccountUsage(email: string | undefined) {
  if (!email) return 0
  const { data, error } = await useSupabase()
    .from('deleted_accounts')
    .select('interviews_used')
    .eq('email_hash', hashEmail(email))
    .gte('deleted_at', startOfMonthUTC().toISOString())

  if (error) {
    // Table not created yet (supabase/delete-account.sql not run): don't break the app
    if (error.code === 'PGRST205' || error.code === '42P01') {
      console.warn('deleted_accounts table is missing. Run supabase/delete-account.sql.')
      return 0
    }
    throw createError({ statusCode: 500, statusMessage: `Could not check your usage: ${error.message}` })
  }
  return (data ?? []).reduce((sum, row) => sum + (row.interviews_used ?? 0), 0)
}

export async function getMonthlyUsage(userId: string, email?: string) {
  const supabase = useSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, plan')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your profile: ${profileError.message}` })
  }

  const { count, error: countError } = await supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonthUTC().toISOString())

  if (countError) {
    throw createError({ statusCode: 500, statusMessage: `Could not count your interviews: ${countError.message}` })
  }

  const plan = profile?.plan === 'premium' ? 'premium' : 'free'
  const limit = PLAN_LIMITS[plan]
  const used = (count ?? 0) + await deletedAccountUsage(email)

  return {
    name: profile?.name ?? '',
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: startOfNextMonthUTC().toISOString(),
  }
}
