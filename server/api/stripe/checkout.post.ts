// POST /api/stripe/checkout   (logged-in Free users)
// Returns: { url }  → the browser goes to Stripe's payment page.
//
// This does NOT make anyone Premium. The plan only changes when Stripe
// tells the webhook (/api/stripe/webhook) that the payment went through.

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_PRICE_ID is missing from .env.' })
  }

  const { data: profile, error } = await useSupabase()
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your profile: ${error.message}` })
  }
  if (profile?.plan === 'premium') {
    throw createError({ statusCode: 409, statusMessage: 'You already have Premium.' })
  }

  const stripe = useStripe()
  const origin = siteOrigin(event)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Reuse the Stripe customer if this user has paid before; otherwise Stripe creates one
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    // How the webhook knows which PreShape user paid
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/interview?upgrade=success`,
    cancel_url: `${origin}/interview?upgrade=cancelled`,
  })

  if (!session.url) {
    throw createError({ statusCode: 502, statusMessage: 'Could not start the payment. Please try again.' })
  }

  return { url: session.url }
})
