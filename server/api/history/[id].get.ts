// GET /api/history/:id   (Premium users only)
// Returns: { id, job_title, overall_score, overall_feedback, created_at,
//            questions: [{ question, answer, score, feedback }] }
//
// One finished interview with its full breakdown. Only the owner can load it.

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  await requirePremium(user.id)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'The interview ID is missing.' })
  }

  const { data, error } = await useSupabase()
    .from('interviews')
    .select('id, job_title, overall_score, overall_feedback, created_at, questions')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Could not load the interview: ${error.message}` })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Interview not found.' })
  }

  return data
})
