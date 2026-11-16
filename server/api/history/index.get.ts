// GET /api/history   (Premium users only)
// Returns: [{ id, job_title, overall_score, created_at }], newest first
//
// The list of the user's finished interviews. Free accounts get a 403:
// history is a Premium feature, so the server checks the plan itself
// instead of trusting the page.

const MAX_ITEMS = 100

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  await requirePremium(user.id)

  const { data, error } = await useSupabase()
    .from('interviews')
    .select('id, job_title, overall_score, created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(MAX_ITEMS)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not load your history: ${error.message}` })
  }

  return data
})
