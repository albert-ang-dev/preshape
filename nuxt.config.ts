// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // The Inter font, used on every page (set as the body font in theme.css)
  app: {
    head: {
      // SEO defaults for every page (pages can override these with useSeoMeta)
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Practice job interviews with AI. Get 10 questions tailored to the job you want, answer them, and receive a score with clear feedback.' },
        { name: 'theme-color', content: '#364652' },
        { property: 'og:site_name', content: 'PreShape' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_US' },
        // Switch to 'summary_large_image' once there's a 1200×630 og:image
        { name: 'twitter:card', content: 'summary' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' }
      ]
      // Ads are NOT loaded here (that would show them to everyone).
      // See app/plugins/ads.client.ts: they load only for logged-in Free users.
    }
  },
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
    'bootstrap-icons/font/bootstrap-icons.min.css',
    '~/assets/css/theme.css'
  ],
  // Values the browser is allowed to see. Only the PUBLISHABLE Supabase key goes here;
  // the secret key stays server-only in server/utils/supabase.ts.
  runtimeConfig: {
    public: {
      // The site's main address, used for SEO links (canonical URL, sitemap, social cards).
      // Override with NUXT_PUBLIC_SITE_URL if the domain changes.
      siteUrl: 'https://www.preshape.online',
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  }
})
