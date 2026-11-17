// GET /api/me
// Returns the logged-in user's account information for Account settings:
// { name, email, plan, memberSince, interviewsThisMonth, interviewsPerMonth, resetsAt }

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const usage = await getMonthlyUsage(user.id, user.email)

  return {
    name: usage.name || user.user_metadata?.name || '',
    email: user.email,
    plan: usage.plan,
    memberSince: user.created_at,
    interviewsThisMonth: usage.used,
    interviewsPerMonth: usage.limit,
    resetsAt: usage.resetsAt,
  }
})
