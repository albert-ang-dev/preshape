// POST /api/stripe/portal   (logged-in users who have paid before)
// Returns: { url }  → Stripe's Customer Portal, where users can cancel,
// change their card and see their invoices.

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const { data: profile, error } = await useSupabase()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your profile: ${error.message}` })
  }
  if (!profile?.stripe_customer_id) {
    throw createError({ statusCode: 404, statusMessage: 'No subscription found for this account.' })
  }

  const session = await useStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteOrigin(event)}/interview`,
  })

  return { url: session.url }
})
