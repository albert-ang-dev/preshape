// Stripe client for server routes. Reads STRIPE_SECRET_KEY from .env.
// Never import this in app/ — the secret key must stay on the server.
import Stripe from 'stripe'

export function useStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_SECRET_KEY is missing from .env.' })
  }
  if (key.startsWith('pk_')) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_SECRET_KEY must be the secret key (sk_...), not the publishable key.' })
  }
  return new Stripe(key)
}

// The site's address, for Stripe's "return to" links (e.g. http://localhost:3000)
export function siteOrigin(event: Parameters<typeof getRequestURL>[0]) {
  return getRequestURL(event).origin
}

// Sets a user's plan from a Stripe subscription status.
// 'active' and 'trialing' mean paid up; anything else (canceled, unpaid, ...) means Free.
export async function setPlanFromSubscription(
  userId: string,
  subscription: { id: string, status: string, customer: string | { id: string } },
) {
  const paid = subscription.status === 'active' || subscription.status === 'trialing'
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  let query = useSupabase()
    .from('profiles')
    .update({
      plan: paid ? 'premium' : 'free',
      stripe_customer_id: customerId,
      stripe_subscription_id: paid ? subscription.id : null,
    })
    .eq('id', userId)

  // Only the user's CURRENT subscription may downgrade them, so a late event
  // about an old, cancelled subscription can't remove a newer Premium.
  if (!paid) query = query.eq('stripe_subscription_id', subscription.id)

  const { error } = await query

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not update the plan: ${error.message}` })
  }
}
