// POST /api/account/delete   (logged-in users only)
// Body:    { password, confirm: 'DELETE' }
// Returns: { deleted: true }
//
// Permanently deletes the logged-in user's account. The user ID comes from the
// login token, never from the request body, so nobody can delete someone else.
//
// Order matters:
//   1. Check the password again (a stolen, logged-in laptop isn't enough)
//   2. Cancel the Stripe subscription, so they're never charged again.
//      If this fails, NOTHING is deleted.
//   3. Remember this month's usage (hashed email), so re-registering
//      can't reset the monthly limit
//   4. Delete their interviews
//   5. Delete the login (the profile is removed by "on delete cascade")
//
// Stripe customers and invoices are kept: payment records are needed for
// tax and accounting.

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const password = String(body?.password ?? '')
  const confirm = String(body?.confirm ?? '').trim()

  if (confirm !== 'DELETE') {
    throw createError({ statusCode: 400, statusMessage: 'Type DELETE to confirm.' })
  }
  if (!password) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter your password.' })
  }
  if (!user.email) {
    throw createError({ statusCode: 400, statusMessage: 'This account has no email address.' })
  }

  // --- 1. Check the password ---
  const { error: passwordError } = await useSupabasePublic().auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (passwordError) {
    throw createError({ statusCode: 403, statusMessage: 'That password is incorrect.' })
  }

  const supabase = useSupabase()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your profile: ${profileError.message}` })
  }

  // --- 2. Cancel the Stripe subscription (immediately) ---
  if (profile?.stripe_subscription_id) {
    try {
      await useStripe().subscriptions.cancel(profile.stripe_subscription_id)
    } catch (error: any) {
      // Already cancelled or gone in Stripe: nothing left to charge, so continue
      const alreadyGone = error?.code === 'resource_missing'
        || /canceled|cancelled/i.test(String(error?.message ?? ''))
      if (!alreadyGone) {
        throw createError({
          statusCode: 502,
          statusMessage: 'We couldn\'t cancel your subscription, so your account was not deleted. Please try again.',
        })
      }
    }
  }

  // --- 3. Remember this month's usage ---
  const { count, error: countError } = await supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonthUTC().toISOString())

  if (countError) {
    throw createError({ statusCode: 500, statusMessage: `Could not delete your account: ${countError.message}` })
  }

  if (count) {
    const { error: logError } = await supabase
      .from('deleted_accounts')
      .insert({ email_hash: hashEmail(user.email), interviews_used: count })

    if (logError) {
      throw createError({ statusCode: 500, statusMessage: `Could not delete your account: ${logError.message}` })
    }
  }

  // --- 4. Delete their interviews ---
  const { error: interviewsError } = await supabase
    .from('interviews')
    .delete()
    .eq('user_id', user.id)

  if (interviewsError) {
    throw createError({ statusCode: 500, statusMessage: `Could not delete your interviews: ${interviewsError.message}` })
  }

  // --- 5. Delete the login (the profile goes with it) ---
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: `Could not delete your account: ${deleteError.message}` })
  }

  return { deleted: true }
})
