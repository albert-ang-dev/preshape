<script setup>
// ---------- SEO ----------
const siteUrl = useRuntimeConfig().public.siteUrl
const seoTitle = 'PreShape – AI Job Interview Practice with Instant Feedback'
const seoDescription =
  'Practice job interviews with AI. Paste a job description, answer 10 tailored questions, '
  + 'and get a score with clear feedback. 4 free interviews every month.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: siteUrl + '/',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  robots: 'index, follow',
})

useHead({
  link: [{ rel: 'canonical', href: siteUrl + '/' }],
  // Structured data: helps Google understand what PreShape is and what it costs
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'PreShape',
      url: siteUrl + '/',
      description: seoDescription,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any (web browser)',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: '4 interviews per month, overall score and summary' },
        { '@type': 'Offer', name: 'Premium', price: '12', priceCurrency: 'USD', description: '8 interviews per month, full breakdown, interview history, no ads' },
      ],
    }),
  }],
})

const steps = [
  { icon: 'bi-briefcase', title: 'Describe the job', text: 'Paste the job title and description.' },
  { icon: 'bi-chat-dots', title: 'Answer 10 questions', text: 'One at a time, like a real interview.' },
  { icon: 'bi-graph-up-arrow', title: 'See how you did', text: 'Get a score and clear feedback.' },
]

// ---------- Log in / Register modal ----------
// Register creates a real account (always on the Free plan, see server/api/register.post.ts).
// Log in signs in with Supabase, then opens the app.
const authMode = ref('login')   // 'login' | 'register'
const authName = ref('')
const authEmail = ref('')
const authPassword = ref('')
const authBusy = ref(false)
const authError = ref('')
const authNotice = ref('')

function openAuth(mode) {
  authMode.value = mode
  authError.value = ''
  authNotice.value = ''
}

function switchAuth(mode) {
  authMode.value = mode
  authError.value = ''
}

// Close the modal first, then go to the app. Navigating while the modal is
// still open would leave Bootstrap's dark backdrop behind on the next page.
function closeAndOpenApp() {
  const { $bootstrap } = useNuxtApp()
  const el = document.getElementById('authModal')
  el.addEventListener('hidden.bs.modal', () => navigateTo('/interview'), { once: true })
  $bootstrap.Modal.getOrCreateInstance(el).hide()
}

async function register() {
  authBusy.value = true
  authError.value = ''
  authNotice.value = ''

  try {
    const { needsConfirmation } = await $fetch('/api/register', {
      method: 'POST',
      body: { name: authName.value, email: authEmail.value, password: authPassword.value },
    })

    authPassword.value = ''
    if (needsConfirmation) {
      // Supabase sends a confirmation email; the account works once it's confirmed
      authNotice.value = `Almost done! We sent a confirmation link to ${authEmail.value.trim()}. Click it, then log in.`
      authMode.value = 'login'
    } else {
      closeAndOpenApp()
    }
  } catch (error) {
    authError.value = error?.data?.message || error?.statusMessage || 'Registration failed. Please try again.'
  } finally {
    authBusy.value = false
  }
}

async function login() {
  const { $supabase } = useNuxtApp()
  authBusy.value = true
  authError.value = ''
  authNotice.value = ''

  const { error } = await $supabase.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  })

  authBusy.value = false
  if (error) {
    authError.value = error.message === 'Email not confirmed'
      ? 'Please confirm your email first: click the link we sent you.'
      : error.message === 'Invalid login credentials'
        ? 'Wrong email or password.'
        : error.message
    return
  }

  authPassword.value = ''
  closeAndOpenApp()
}

function submitAuth() {
  if (authMode.value === 'register') {
    register()
  } else {
    login()
  }
}

// Already logged in? The start buttons skip the modal and go straight to the app.
const authUser = useState('authUser', () => null)

function start(mode) {
  if (authUser.value) {
    navigateTo('/interview')
    return
  }
  openAuth(mode)
  const { $bootstrap } = useNuxtApp()
  $bootstrap.Modal.getOrCreateInstance(document.getElementById('authModal')).show()
}

// After "Delete account", the app sends users here with ?deleted=1
const accountDeleted = ref(false)
onMounted(() => {
  if (useRoute().query.deleted) {
    accountDeleted.value = true
    navigateTo('/', { replace: true })   // tidy the address bar
  }
})
</script>

<template>
  <div class="home">
    <!-- Shown once after deleting an account -->
    <div v-if="accountDeleted" class="container pt-3">
      <div class="deleted-notice">
        <i class="bi bi-check-circle"></i>
        <span class="flex-grow-1">Your account has been deleted. Thanks for practicing with PreShape.</span>
        <button type="button" class="btn-close btn-close-white btn-sm" aria-label="Dismiss" @click="accountDeleted = false"></button>
      </div>
    </div>

    <!-- Top bar -->
    <nav class="container nav-bar">
      <NuxtLink to="/" class="logo">
        <span class="logo-mark"><i class="bi bi-backpack2"></i></span>
        PreShape
      </NuxtLink>
      <div class="d-flex align-items-center gap-3">
        <a href="#pricing" class="nav-link-plain">Pricing</a>
        <button
          type="button"
          class="btn btn-pill btn-ghost"
          @click="start('login')"
        >Start practicing</button>
      </div>
    </nav>

    <!-- Hero -->
    <section class="container hero">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <h1 class="hero-title">
            Practice the interview<br>
            <span class="highlight">before it counts.</span>
          </h1>
          <p class="hero-text">
            Get 10 questions written for the job you want, answer them at your own pace,
            and find out exactly what to improve.
          </p>
          <div class="d-flex flex-wrap align-items-center gap-3">
            <button
              type="button"
              class="btn btn-pill btn-main"
              @click="start('register')"
            >
              Start a free interview <i class="bi bi-arrow-right"></i>
            </button>
            <span class="hint">4 free interviews every month</span>
          </div>
        </div>

        <!-- Preview of the app -->
        <div class="col-lg-6">
          <div class="preview" aria-hidden="true">
            <div class="preview-header">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="preview-title">Frontend Developer</span>
              <span class="preview-progress">3 of 10</span>
            </div>
            <div class="preview-body">
              <div class="msg msg-interviewer">How do you turn a design mockup into a responsive page?</div>
              <div class="msg msg-user">I start mobile-first, split the design into components, then use grid and flexbox.</div>
              <div class="msg msg-interviewer">Great. Tell me about a time you worked under pressure.</div>
              <div class="score-chip">
                <i class="bi bi-check-circle-fill"></i>
                <span><strong>8/10</strong> · Clear, structured answer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="container steps">
      <div class="row g-4">
        <div v-for="(step, i) in steps" :key="step.title" class="col-md-4">
          <div class="step">
            <div class="step-icon"><i class="bi" :class="step.icon"></i></div>
            <div>
              <div class="step-number">Step {{ i + 1 }}</div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-text">{{ step.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="container pricing">
      <div class="text-center mb-5">
        <h2 class="section-title">Simple pricing</h2>
        <p class="section-text">Practice for free. Upgrade for more interviews, full breakdowns and your history.</p>
      </div>

      <div class="row g-4 justify-content-center">
        <!-- Free -->
        <div class="col-md-6 col-lg-5">
          <div class="plan">
            <div class="plan-name">Free</div>
            <div class="plan-price">$0</div>
            <div class="plan-note">forever</div>
            <ul class="plan-list">
              <li><i class="bi bi-check-lg"></i> With Ads</li>
              <li><i class="bi bi-check-lg"></i> 4 interviews every month</li>
              <li><i class="bi bi-check-lg"></i> 10 questions tailored to the job</li>
              <li><i class="bi bi-check-lg"></i> Overall score and summary</li>
              <li><i class="bi bi-check-lg"></i> See how many interviews you have left</li>
            </ul>
            <NuxtLink to="/interview" class="btn btn-pill btn-ghost w-100 justify-content-center">
              Start for free
            </NuxtLink>
          </div>
        </div>

        <!-- Premium -->
        <div class="col-md-6 col-lg-5">
          <div class="plan plan-featured">
            <div class="plan-name">Premium</div>
            <div class="plan-price">$12</div>
            <div class="plan-note">per month, cancel anytime</div>
            <ul class="plan-list">
              <li><i class="bi bi-check-lg"></i> No Ads</li>
              <li><i class="bi bi-check-lg"></i> 8 interviews every month</li>
              <li><i class="bi bi-check-lg"></i> Full breakdown: a score and feedback for every answer</li>
              <li><i class="bi bi-check-lg"></i> Interview history to track your progress</li>
              <li><i class="bi bi-check-lg"></i> Overall score and summary</li>
            </ul>
            <NuxtLink to="/interview" class="btn btn-pill btn-dark-pill w-100 justify-content-center">
              Go Premium
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Closing call to action -->
    <section class="container">
      <div class="cta">
        <h2 class="cta-title">Your next interview starts here.</h2>
        <button
          type="button"
          class="btn btn-pill btn-dark-pill"
          @click="start('login')"
        >
          Start practicing <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </section>

    <footer class="container footer">
      <span>© {{ new Date().getFullYear() }} PreShape</span>
      <span class="footer-links">
        <NuxtLink to="/terms">Terms of Service</NuxtLink>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
        <NuxtLink to="/refunds">Refunds &amp; Cancellation</NuxtLink>
      </span>
    </footer>
  </div>

  <!-- ================= Log in / Register modal (placeholder) ================= -->
  <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content auth-modal">
        <button type="button" class="btn-close auth-close" data-bs-dismiss="modal" aria-label="Close"></button>

        <div class="auth-head">
          <span class="logo-mark auth-logo"><i class="bi bi-backpack2"></i></span>
          <h2 class="auth-title" id="authModalLabel">
            {{ authMode === 'login' ? 'Welcome back' : 'Create your account' }}
          </h2>
          <p class="auth-subtitle">
            {{ authMode === 'login' ? 'Log in to continue practicing.' : 'Get 4 free interviews every month.' }}
          </p>
        </div>

        <!-- Log in / Register switch -->
        <div class="auth-tabs" role="tablist">
          <button
            type="button"
            class="auth-tab"
            :class="{ active: authMode === 'login' }"
            role="tab"
            :aria-selected="authMode === 'login'"
            @click="switchAuth('login')"
          >Log in</button>
          <button
            type="button"
            class="auth-tab"
            :class="{ active: authMode === 'register' }"
            role="tab"
            :aria-selected="authMode === 'register'"
            @click="switchAuth('register')"
          >Register</button>
        </div>

        <div v-if="authNotice" class="auth-alert auth-alert-info"><i class="bi bi-envelope-check"></i> {{ authNotice }}</div>
        <div v-if="authError" class="auth-alert auth-alert-error"><i class="bi bi-exclamation-circle"></i> {{ authError }}</div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <div v-if="authMode === 'register'" class="mb-3">
            <label class="form-label" for="authName">Name</label>
            <input id="authName" v-model="authName" type="text" class="form-control auth-input" placeholder="Jane Doe" autocomplete="name" required maxlength="100">
          </div>

          <div class="mb-3">
            <label class="form-label" for="authEmail">Email</label>
            <input id="authEmail" v-model="authEmail" type="email" class="form-control auth-input" placeholder="you@example.com" autocomplete="email" required>
          </div>

          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <label class="form-label" for="authPassword">Password</label>
              <a v-if="authMode === 'login'" href="#" class="auth-link small" @click.prevent>Forgot password?</a>
            </div>
            <input
              id="authPassword"
              v-model="authPassword"
              type="password"
              class="form-control auth-input"
              :placeholder="authMode === 'login' ? 'Your password' : 'At least 8 characters'"
              :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
              required
              :minlength="authMode === 'register' ? 8 : undefined"
              maxlength="72"
            >
          </div>

          <button type="submit" class="btn btn-pill btn-dark-pill w-100 justify-content-center mt-3" :disabled="authBusy">
            <span v-if="authBusy" class="spinner-border spinner-border-sm" role="status"></span>
            <template v-if="authMode === 'login'">{{ authBusy ? 'Logging in…' : 'Log in' }}</template>
            <template v-else>{{ authBusy ? 'Creating account…' : 'Create free account' }}</template>
          </button>

          <p v-if="authMode === 'register'" class="auth-terms">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>
        </form>

        <p class="auth-switch">
          <template v-if="authMode === 'login'">
            New to PreShape? <a href="#" class="auth-link" @click.prevent="switchAuth('register')">Create an account</a>
          </template>
          <template v-else>
            Already have an account? <a href="#" class="auth-link" @click.prevent="switchAuth('login')">Log in</a>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .deleted-notice{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    border: 1px solid rgba(249, 222, 201, 0.25);
    background: rgba(255, 255, 255, 0.05);
    color: var(--ps-light);
  }

  .home{
    --muted: #B5BEC6;
    --line: rgba(181, 190, 198, 0.16);
    min-height: 100dvh;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: var(--ps-light);
    /* soft glow behind the hero */
    background:
      radial-gradient(600px 400px at 85% 10%, rgba(153, 178, 221, 0.18), transparent 70%),
      radial-gradient(500px 350px at 10% 30%, rgba(233, 175, 163, 0.12), transparent 70%);
  }

  /* ---------- Top bar ---------- */
  .nav-bar{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .logo{
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--ps-light);
    text-decoration: none;
  }

  .logo-mark{
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background-color: var(--ps-accent);
    color: var(--ps-dark);
    font-size: 1.05rem;
  }

  /* ---------- Buttons ---------- */
  .btn-pill{
    border-radius: 999px;
    font-weight: 600;
    padding: 10px 22px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
  }

  .btn-pill:hover{
    transform: translateY(-1px);
  }

  .btn-main{
    background-color: var(--ps-accent);
    color: var(--ps-dark);
    border: 1px solid var(--ps-accent);
    padding: 14px 28px;
    font-size: 1.05rem;
  }

  .btn-main:hover{
    background-color: var(--ps-light);
    border-color: var(--ps-light);
    color: var(--ps-dark);
  }

  .btn-ghost{
    color: var(--ps-light);
    border: 1px solid var(--line);
    background: transparent;
  }

  .btn-ghost:hover{
    color: var(--ps-light);
    border-color: var(--muted);
  }

  .btn-dark-pill{
    background-color: var(--ps-dark);
    color: var(--ps-light);
    border: 1px solid var(--ps-dark);
    padding: 14px 28px;
  }

  .btn-dark-pill:hover{
    background-color: #2b3048;
    color: var(--ps-light);
  }

  /* ---------- Hero ---------- */
  .hero{
    padding-top: 56px;
    padding-bottom: 88px;
  }

  .eyebrow{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 24px;
  }

  .hero-title{
    font-size: clamp(2.4rem, 5.5vw, 4rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--ps-light);
    margin-bottom: 20px;
  }

  .highlight{
    color: var(--ps-accent);
  }

  .hero-text{
    font-size: 1.15rem;
    line-height: 1.6;
    color: var(--muted);
    max-width: 520px;
    margin-bottom: 32px;
  }

  .hint{
    color: var(--muted);
    font-size: 0.9rem;
  }

  /* ---------- App preview ---------- */
  .preview{
    background-color: #fff;
    border-radius: 20px;
    box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    max-width: 520px;
    margin-left: auto;
    color: var(--ps-dark);
  }

  .preview-header{
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 14px 18px;
    border-bottom: 1px solid #eef0f4;
    font-size: 0.85rem;
  }

  .dot{
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #e3e6ec;
  }

  .preview-title{
    font-weight: 600;
    margin-left: 10px;
  }

  .preview-progress{
    margin-left: auto;
    color: #7a8094;
  }

  .preview-body{
    padding: 20px 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .msg{
    max-width: 82%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .msg-interviewer{
    align-self: flex-start;
    background-color: var(--ps-soft);
    border-bottom-left-radius: 4px;
  }

  .msg-user{
    align-self: flex-end;
    background-color: var(--ps-dark);
    color: var(--ps-light);
    border-bottom-right-radius: 4px;
  }

  .score-chip{
    align-self: center;
    margin-top: 6px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background-color: var(--ps-light);
    font-size: 0.85rem;
  }

  .score-chip i{
    color: #685044;
  }

  /* ---------- Steps ---------- */
  .steps{
    padding-top: 40px;
    padding-bottom: 88px;
    border-top: 1px solid var(--line);
  }

  .step{
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .step-icon{
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    background: rgba(153, 178, 221, 0.15);
    color: var(--ps-soft);
  }

  .step-number{
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ps-accent);
    margin-bottom: 4px;
  }

  .step-title{
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ps-light);
    margin-bottom: 4px;
  }

  .step-text{
    color: var(--muted);
    margin-bottom: 0;
  }

  .nav-link-plain{
    color: var(--muted);
    text-decoration: none;
    font-weight: 500;
  }

  .nav-link-plain:hover{
    color: var(--ps-light);
  }

  /* ---------- Pricing ---------- */
  .pricing{
    padding-bottom: 88px;
  }

  .section-title{
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ps-light);
    margin-bottom: 8px;
  }

  .section-text{
    color: var(--muted);
    font-size: 1.05rem;
    margin-bottom: 0;
  }

  .plan{
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 32px 28px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .plan-name{
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .plan-price{
    font-size: 3rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--ps-light);
  }

  .plan-note{
    color: var(--muted);
    font-size: 0.9rem;
    margin-top: 6px;
    margin-bottom: 24px;
  }

  .plan-list{
    list-style: none;
    padding: 0;
    margin: 0 0 28px;
    flex-grow: 1;
  }

  .plan-list li{
    display: flex;
    gap: 10px;
    padding: 6px 0;
  }

  .plan-list i{
    color: var(--ps-accent);
  }

  /* The paid option stands out in the light Powder Petal colour */
  .plan-featured{
    background-color: var(--ps-light);
    border-color: var(--ps-light);
    color: var(--ps-dark);
  }

  .plan-featured .plan-name,
  .plan-featured .plan-note{
    color: #685044;
  }

  .plan-featured .plan-price{
    color: var(--ps-dark);
  }

  .plan-featured .plan-list i{
    color: #685044;
  }

  /* ---------- Log in / Register modal ---------- */
  .auth-modal{
    position: relative;
    border: none;
    border-radius: 24px;
    padding: 36px 32px 28px;
    color: var(--ps-dark);
  }

  .auth-close{
    position: absolute;
    top: 18px;
    right: 18px;
  }

  .auth-head{
    text-align: center;
    margin-bottom: 24px;
  }

  .auth-logo{
    width: 48px;
    height: 48px;
    border-radius: 14px;
    font-size: 1.4rem;
    margin: 0 auto 16px;
  }

  .auth-title{
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
    color: var(--ps-dark);
  }

  .auth-subtitle{
    color: #6b7186;
    margin-bottom: 0;
  }

  .auth-tabs{
    display: flex;
    gap: 4px;
    padding: 4px;
    margin-bottom: 24px;
    border-radius: 999px;
    background-color: #f2f4f8;
  }

  .auth-tab{
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 999px;
    background: transparent;
    font-weight: 600;
    color: #6b7186;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .auth-tab.active{
    background-color: #fff;
    color: var(--ps-dark);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .auth-alert{
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 14px;
    margin-bottom: 16px;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .auth-alert-info{
    background-color: #eef2fa;
    color: var(--ps-dark);
  }

  .auth-alert-error{
    background-color: #fdecee;
    color: #8a1c2b;
  }

  .auth-form .form-label{
    font-weight: 600;
    font-size: 0.9rem;
  }

  .auth-input{
    padding: 10px 14px;
    border-radius: 12px;
    border-color: #dfe2ea;
    background-color: #f8f9fb;
  }

  .auth-input:focus{
    background-color: #fff;
    border-color: var(--ps-soft);
    box-shadow: 0 0 0 4px rgba(153, 178, 221, 0.25);
  }

  .auth-link{
    color: var(--ps-dark);
    font-weight: 600;
  }

  .auth-terms{
    margin: 12px 0 0;
    text-align: center;
    font-size: 0.8rem;
    color: #6b7186;
  }

  .auth-switch{
    margin: 20px 0 0;
    text-align: center;
    font-size: 0.9rem;
    color: #6b7186;
  }

  /* ---------- Call to action ---------- */
  .cta{
    background-color: var(--ps-light);
    color: var(--ps-dark);
    border-radius: 24px;
    padding: 56px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }

  .cta-title{
    font-size: clamp(1.6rem, 3.5vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ps-dark);
    margin: 0;
  }

  /* ---------- Footer ---------- */
  .footer{
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 24px;
    padding-top: 32px;
    padding-bottom: 32px;
    color: var(--muted);
    font-size: 0.9rem;
    text-align: center;
  }

  .footer-links{
    display: flex;
    gap: 16px;
  }

  .footer-links a{
    color: var(--muted);
    text-decoration: none;
  }

  .footer-links a:hover{
    color: var(--ps-light);
  }

  /* ---------- Phones ---------- */
  @media (max-width: 991.98px){
    .preview{
      margin-left: 0;
      margin-right: auto;
    }
  }

  @media (max-width: 575.98px){
    .hero{
      padding-top: 32px;
      padding-bottom: 56px;
    }

    .cta{
      padding: 40px 20px;
    }
  }
</style>
