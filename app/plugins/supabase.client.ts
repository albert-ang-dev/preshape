// Browser-side Supabase connection, used for logging in and out.
// Uses the PUBLISHABLE key, which is safe in the browser.
//
// Provides:
//   useState('authUser')  the logged-in Supabase user, or null
//   $supabase            the Supabase client
//   $api(url, options)   like $fetch, but sends the login token so server
//                        routes know who is asking
import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.public.supabaseKey as string

  // Safety net: never let the secret key reach the browser
  if (!url || !key || key.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_URL and the publishable SUPABASE_KEY must be set in .env.')
  }

  const supabase = createClient(url, key)
  const authUser = useState<any>('authUser', () => null)
  const authReady = useState('authReady', () => false)

  // Restore the login saved from an earlier visit
  const { data } = await supabase.auth.getSession()
  authUser.value = data.session?.user ?? null
  authReady.value = true

  // Keep authUser up to date on log in, log out and token refresh
  supabase.auth.onAuthStateChange((_event, session) => {
    authUser.value = session?.user ?? null
  })

  // $fetch that adds "Authorization: Bearer <token>" when logged in
  async function api<T = any>(request: string, options: any = {}): Promise<T> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    return $fetch<T>(request, { ...options, headers })
  }

  return { provide: { supabase, api } }
})
