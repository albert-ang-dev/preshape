// POST /api/stripe/webhook   (called by Stripe, not by the browser)
//
// The ONLY place a plan changes. Stripe signs every request with
// STRIPE_WEBHOOK_SECRET; requests without a valid signature are rejected,
// so nobody can fake "payment succeeded".
//
// Events (choose these when creating the webhook in Stripe):
//   checkout.session.completed      → the user paid: Premium
//   customer.subscription.updated   → renewed, payment failed, ...: Premium or Free
//   customer.subscription.deleted   → cancelled / ended: Free

export default defineEventHandler(async (event) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_WEBHOOK_SECRET is missing from .env.' })
  }

  // The signature is checked against the exact raw body, so don't use readBody here
  const payload = await readRawBody(event, 'utf8')
  const signature = getHeader(event, 'stripe-signature')
  if (!payload || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body or signature.' })
  }

  const stripe = useStripe()
  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature.' })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const userId = session.client_reference_id
      if (session.mode !== 'subscription' || !userId || !session.subscription) break

      // Ask Stripe for the subscription itself, to get its real status
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await setPlanFromSubscription(userId, subscription)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object
      const userId = subscription.metadata?.user_id
      if (!userId) break
      await setPlanFromSubscription(userId, subscription)
      break
    }
  }

  // Tell Stripe we got it (otherwise it retries)
  return { received: true }
})
