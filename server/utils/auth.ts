// Finds out who is making a request, from the "Authorization: Bearer <token>"
// header the browser sends with $api (see app/plugins/supabase.client.ts).
// Supabase checks the token, so it can't be faked.
import type { H3Event } from 'h3'

// The logged-in user, or null if there's no valid token
export async function getAuthUser(event: H3Event) {
  const header = getHeader(event, 'authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null

  const { data, error } = await useSupabase().auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

// The logged-in user, or a 401 error if nobody is logged in
export async function requireAuthUser(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Please log in again.' })
  }
  return user
}
