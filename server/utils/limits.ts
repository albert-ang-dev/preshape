// Monthly interview limits per plan, and how many a user has used this month.
// An interview counts as soon as it's STARTED (questions generated), whether
// or not it's finished, because that's when the OpenAI cost happens.

export const PLAN_LIMITS: Record<string, number> = { free: 4, premium: 8 }

// Midnight UTC on the 1st of the current month
export function startOfMonthUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

// Midnight UTC on the 1st of next month: when the count resets
export function startOfNextMonthUTC(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

export async function getMonthlyUsage(userId: string) {
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
  const used = count ?? 0

  return {
    name: profile?.name ?? '',
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: startOfNextMonthUTC().toISOString(),
  }
}
