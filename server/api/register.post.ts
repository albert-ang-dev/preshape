// POST /api/register
// Body:    { name, email, password }
// Returns: { needsConfirmation: boolean }
//
// Creates a Supabase account. The database trigger in supabase/profiles.sql
// then creates the user's profile with plan = 'free'. The plan is never taken
// from the request, so every new account starts on Free.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  // Check the input before contacting Supabase
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter your name.' })
  }
  if (name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Your name is too long.' })
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a valid email address.' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.` })
  }
  if (password.length > 72) {
    throw createError({ statusCode: 400, statusMessage: 'Your password is too long (72 characters at most).' })
  }

  const supabase = useSupabasePublic()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Saved on the account; the trigger copies it into profiles.name
      data: { name },
      // Where the link in the confirmation email takes the user
      emailRedirectTo: getRequestURL(event).origin,
    },
  })

  if (error) {
    // Supabase's messages are short and readable, e.g. "Password should contain..."
    throw createError({ statusCode: error.status && error.status < 500 ? error.status : 400, statusMessage: error.message })
  }

  // With "Confirm email" on (Supabase's default), there's no session until the
  // user clicks the link in the email.
  //
  // Note: if the email is already registered, Supabase still answers "success"
  // (so nobody can find out which emails have accounts). The user just won't
  // get a new confirmation email.
  return { needsConfirmation: !data.session }
})
