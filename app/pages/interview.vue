<script setup>
useHead({ title: 'Interview – PreShape' })

const messageField = ref('')
const jobTitle = ref('')
const jobDescription = ref('')

// What the main card is doing: 'idle' | 'loading' | 'interview' | 'grading' | 'done'
// | 'review' (showing a past interview from the history)
const phase = ref('idle')
const errorMessage = ref('')

const questions = ref([])      // the 10 from /api/questions
const answers = ref([])        // the user's answers, same order
const currentIndex = ref(0)    // which question we're on
const chats = ref([])          // what the bubbles display
const result = ref(null)       // the saved, graded interview
const interviewId = ref(null)  // the row /api/questions saved when the interview started

const chatBody = ref(null)     // the scrolling message area
const answerInput = ref(null)  // the answer text box

// How far through the interview we are, 0–100 (for the progress bar)
const progress = computed(() => {
  if (phase.value === 'grading' || phase.value === 'done' || phase.value === 'review') return 100
  if (phase.value !== 'interview' || !questions.value.length) return 0
  return Math.round((currentIndex.value / questions.value.length) * 100)
})

// Interview is busy: don't allow starting a new one
const busy = computed(() => phase.value === 'loading' || phase.value === 'grading')

// An interview is running: opening a past one would throw it away
const inInterview = computed(() => ['loading', 'interview', 'grading'].includes(phase.value))
// Readable message from a failed $fetch
function errorText(error) {
  return error?.data?.message || error?.statusMessage || error?.message || 'Something went wrong.'
}

// Scroll the message area to the newest message
async function scrollToBottom() {
  await nextTick()
  if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
}

function addChat(message, sender) {
  chats.value.push({ id: chats.value.length + 1, message, sender })
  scrollToBottom()
}

async function startInterview() {
  phase.value = 'loading'
  errorMessage.value = ''
  chats.value = []
  answers.value = []
  questions.value = []
  currentIndex.value = 0
  result.value = null
  interviewId.value = null
  closeAd()

  try {
    const { $api } = useNuxtApp()
    // The server checks the monthly limit, then saves the interview as started
    const data = await $api('/api/questions', {
      method: 'POST',
      body: { job_title: jobTitle.value, job_description: jobDescription.value },
    })
    questions.value = data.questions
    interviewId.value = data.interviewId
    // Starting an interview uses one of this month's interviews
    if (account.value) {
      account.value.interviewsThisMonth = data.interviewsThisMonth
      account.value.interviewsPerMonth = data.interviewsPerMonth
    }
  } catch (error) {
    errorMessage.value = errorText(error)
    phase.value = 'idle'
    loadAccount()   // e.g. after "limit reached", show the up-to-date count
    return
  }

  phase.value = 'interview'
  addChat(questions.value[0], 'interviewer')   // ask question 1
  await nextTick()
  answerInput.value?.focus()
}

function sendAnswer() {
  const answer = messageField.value.trim()
  if (!answer || phase.value !== 'interview') return

  addChat(answer, 'user')
  answers.value.push(answer)
  messageField.value = ''
  currentIndex.value++

  if (currentIndex.value < questions.value.length) {
    addChat(questions.value[currentIndex.value], 'interviewer')   // next question
  } else {
    finishInterview()   // all 10 answered → grade and save
  }
}

// ---------- Interstitial ad (Free accounts only) ----------
// Shown after the last answer, WHILE grading runs, so it adds little waiting.
// The results appear once grading is done AND the countdown has finished
// AND the user clicks "See my results". Premium users never see it.
const AD_SECONDS = 5
const adActive = ref(false)        // the ad screen is covering the results
const adCountdown = ref(0)
let adTimer = null

function startAd() {
  adActive.value = true
  adCountdown.value = AD_SECONDS
  clearInterval(adTimer)
  adTimer = setInterval(() => {
    adCountdown.value--
    if (adCountdown.value <= 0) clearInterval(adTimer)
  }, 1000)
}

function closeAd() {
  adActive.value = false
  clearInterval(adTimer)
  scrollToBottom()
}

onBeforeUnmount(() => clearInterval(adTimer))

async function finishInterview() {
  phase.value = 'grading'
  errorMessage.value = ''
  // Only the first time (not when retrying after an error)
  if (!isPremium.value && !adActive.value) startAd()
  addChat("That's all my questions, thank you! Give me a moment to review your answers.", 'interviewer')

  try {
    const { $api } = useNuxtApp()
    // $api sends the login token, so the interview is saved to this account
    result.value = await $api('/api/interviews', {
      method: 'POST',
      body: {
        interview_id: interviewId.value,
        job_description: jobDescription.value,
        answers: answers.value,
      },
    })
    phase.value = 'done'
  } catch (error) {
    // Stay on 'grading' so the user can retry without losing their answers
    errorMessage.value = errorText(error)
  }
  scrollToBottom()
}

// ---------- Account ----------
// The logged-in user (set by app/plugins/supabase.client.ts) and their account
// information from /api/me (name, plan, interviews this month, ...)
const authUser = useState('authUser', () => null)
const account = ref(null)
const accountError = ref('')

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

// What the sidebar and Account settings display
const user = computed(() => ({
  name: account.value?.name || authUser.value?.user_metadata?.name || 'Your account',
  email: account.value?.email || authUser.value?.email || '',
  accountType: account.value?.plan === 'premium' ? 'Premium' : 'Free',
  memberSince: formatDate(account.value?.memberSince || authUser.value?.created_at),
  interviewsThisMonth: account.value?.interviewsThisMonth ?? 0,
  interviewsPerMonth: account.value?.interviewsPerMonth ?? 4,
}))

// Monthly limit used up? (The server enforces this too; this just updates the screen.)
const limitReached = computed(() =>
  !!account.value && account.value.interviewsThisMonth >= account.value.interviewsPerMonth
)

const interviewsLeft = computed(() => Math.max(0, user.value.interviewsPerMonth - user.value.interviewsThisMonth))

// "December 1": when the monthly count starts again
const resetDateText = computed(() =>
  account.value?.resetsAt
    ? new Date(account.value.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })
    : 'the 1st of next month'
)

const usagePercent = computed(() =>
  Math.min(100, Math.round((user.value.interviewsThisMonth / user.value.interviewsPerMonth) * 100))
)

async function loadAccount() {
  const { $api } = useNuxtApp()
  accountError.value = ''
  try {
    account.value = await $api('/api/me')
  } catch (error) {
    accountError.value = errorText(error)
  }
}

async function logout() {
  const { $supabase, $bootstrap } = useNuxtApp()
  // Close the modal first so its dark backdrop doesn't stay behind
  const el = document.getElementById('modalSettings')
  el.addEventListener('hidden.bs.modal', async () => {
    await $supabase.auth.signOut()
    navigateTo('/')
  }, { once: true })
  $bootstrap.Modal.getOrCreateInstance(el).hide()
}

// Only logged-in users may use the app; everyone else goes back to the home page
onMounted(() => {
  if (!authUser.value) {
    navigateTo('/')
    return
  }
  loadAccount()
  handleUpgradeReturn()
})

// ---------- History (Premium only) ----------
// The server refuses these requests for Free accounts; this just hides the button.
const isPremium = computed(() => account.value?.plan === 'premium')

// ---------- Stripe (Premium subscription) ----------
// These only OPEN Stripe's pages. The plan itself changes on the server,
// when Stripe confirms the payment to /api/stripe/webhook.
const billingBusy = ref(false)
const billingError = ref('')
const upgradeStatus = ref('')   // '' | 'waiting' | 'success' | 'cancelled' (after returning from Stripe)

async function openStripe(path) {
  const { $api } = useNuxtApp()
  billingBusy.value = true
  billingError.value = ''
  try {
    const { url } = await $api(path, { method: 'POST' })
    window.location.href = url   // Stripe's own page
  } catch (error) {
    billingError.value = errorText(error)
    billingBusy.value = false
  }
}

const upgrade = () => openStripe('/api/stripe/checkout')
const manageSubscription = () => openStripe('/api/stripe/portal')

// Back from Stripe Checkout: the webhook may take a few seconds,
// so check the plan a few times before giving up.
const route = useRoute()
async function handleUpgradeReturn() {
  const outcome = route.query.upgrade
  if (!outcome) return
  navigateTo('/interview', { replace: true })   // tidy the address bar

  if (outcome === 'cancelled') {
    upgradeStatus.value = 'cancelled'
    return
  }
  upgradeStatus.value = 'waiting'
  for (let i = 0; i < 10; i++) {
    await loadAccount()
    if (isPremium.value) {
      upgradeStatus.value = 'success'
      return
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  upgradeStatus.value = ''   // still processing; the plan will update on the next visit
}
const history = ref([])        // [{ id, job_title, overall_score, created_at }]
const historyLoading = ref(false)
const historyError = ref('')
const viewing = ref(null)      // the past interview being shown: { job_title, created_at }

// The title in the panel header
const headerTitle = computed(() => (phase.value === 'review' ? viewing.value?.job_title : jobTitle.value))

async function loadHistory() {
  const { $api } = useNuxtApp()
  historyLoading.value = true
  historyError.value = ''
  try {
    history.value = await $api('/api/history')
  } catch (error) {
    historyError.value = errorText(error)
  } finally {
    historyLoading.value = false
  }
}

async function openPastInterview(item) {
  const { $api, $bootstrap } = useNuxtApp()
  $bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHistory')).hide()

  phase.value = 'review'
  viewing.value = { job_title: item.job_title, created_at: item.created_at }
  errorMessage.value = ''
  chats.value = []
  result.value = null

  try {
    result.value = await $api(`/api/history/${item.id}`)
  } catch (error) {
    errorMessage.value = errorText(error)
  }
  if (chatBody.value) chatBody.value.scrollTop = 0
}

const tips = [
  'Use the STAR method: Situation, Task, Action, Result.',
  'Give a real example whenever you can.',
  'Keep answers focused: two to four sentences is often enough.',
]
</script>

<template>
  <div class="app">
    <!-- ================= Sidebar ================= -->
    <aside class="sidebar">
      <NuxtLink to="/" class="logo">
        <span class="logo-mark"><i class="bi bi-backpack2"></i></span>
        <span>PreShape</span>
      </NuxtLink>

      <button
        class="btn btn-new"
        data-bs-toggle="modal"
        data-bs-target="#exampleModal"
        :disabled="busy || limitReached"
      >
        <i class="bi bi-plus-lg"></i>
        <span>New interview</span>
      </button>

      <!-- Interview history: Premium only -->
      <button
        v-if="isPremium"
        class="btn-history"
        data-bs-toggle="modal"
        data-bs-target="#modalHistory"
        :disabled="inInterview"
        @click="loadHistory"
      >
        <i class="bi bi-clock-history"></i>
        <span>History</span>
      </button>

      <!-- Monthly usage -->
      <div class="side-card side-extra">
        <div class="d-flex justify-content-between align-items-baseline mb-2">
          <span class="side-label">This month</span>
          <span class="side-value">{{ user.interviewsThisMonth }} / {{ user.interviewsPerMonth }}</span>
        </div>
        <div class="usage-bar"><div class="usage-fill" :style="{ width: usagePercent + '%' }"></div></div>
        <p class="side-small mb-0 mt-2">
          <template v-if="limitReached">All used. Resets on {{ resetDateText }}</template>
          <template v-else>{{ interviewsLeft }} {{ interviewsLeft === 1 ? 'interview' : 'interviews' }} left</template>
        </p>
      </div>

      <!-- Tips -->
      <div class="side-card side-extra">
        <div class="side-label mb-2"><i class="bi bi-lightbulb"></i> Interview tips</div>
        <ul class="tips">
          <li v-for="tip in tips" :key="tip">{{ tip }}</li>
        </ul>
      </div>

      <!-- Account -->
      <button class="account-button" data-bs-toggle="modal" data-bs-target="#modalSettings">
        <span class="account-avatar-sm"><i class="bi bi-person-fill"></i></span>
        <span class="account-text">
          <span class="account-name">{{ user.name }}</span>
          <span class="account-plan">{{ user.accountType }} plan</span>
        </span>
        <i class="bi bi-gear account-gear"></i>
      </button>
    </aside>

    <!-- ================= Main chat panel ================= -->
    <main class="main">
      <div class="panel" id="main-card">
        <!-- Header: job title, progress text and bar -->
        <header v-if="['interview', 'grading', 'done', 'review'].includes(phase)" class="panel-header">
          <div class="d-flex justify-content-between align-items-center gap-3">
            <div class="text-truncate">
              <div class="panel-eyebrow">
                <template v-if="phase === 'review'">Past interview · {{ formatDate(viewing?.created_at) }}</template>
                <template v-else>Practice interview</template>
              </div>
              <div class="panel-title text-truncate">{{ headerTitle }}</div>
            </div>
            <span class="progress-pill">
              <template v-if="phase === 'interview'">Question {{ currentIndex + 1 }} of {{ questions.length }}</template>
              <template v-else-if="phase === 'grading'">Grading…</template>
              <template v-else-if="phase === 'review'"><i class="bi bi-clock-history"></i> History</template>
              <template v-else><i class="bi bi-check2"></i> Complete</template>
            </span>
          </div>
          <div class="progress-track"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
        </header>

        <!-- Messages: fills the free space and scrolls when full -->
        <div class="panel-body" ref="chatBody">
          <!-- Back from Stripe Checkout -->
          <div v-if="upgradeStatus" class="notice-box">
            <i class="bi" :class="upgradeStatus === 'success' ? 'bi-stars' : 'bi-info-circle'"></i>
            <span class="flex-grow-1">
              <template v-if="upgradeStatus === 'waiting'">Payment received. Activating Premium…</template>
              <template v-else-if="upgradeStatus === 'success'">Welcome to Premium! Your history and full breakdowns are unlocked.</template>
              <template v-else>Checkout cancelled. You haven't been charged.</template>
            </span>
            <button class="btn-close btn-sm" aria-label="Dismiss" @click="upgradeStatus = ''"></button>
          </div>

          <!-- Error from generating, grading or saving -->
          <div v-if="errorMessage" class="error-box">
            <i class="bi bi-exclamation-circle"></i>
            <span class="flex-grow-1">{{ errorMessage }}</span>
            <button v-if="phase === 'grading'" class="btn btn-sm btn-primary rounded-pill" @click="finishInterview">Try again</button>
          </div>

          <!-- Before an interview -->
          <!-- Monthly limit used up -->
          <div v-if="phase === 'idle' && limitReached" class="empty">
            <div class="empty-icon"><i class="bi bi-calendar-check"></i></div>
            <h2 class="empty-title">That's all for this month</h2>
            <p class="empty-text mb-0">
              You've used all {{ user.interviewsPerMonth }} interviews for this month.
              Your interviews reset on {{ resetDateText }}.
            </p>
          </div>

          <div v-else-if="phase === 'idle'" class="empty">
            <div class="empty-icon"><i class="bi bi-chat-square-text"></i></div>
            <h2 class="empty-title">Ready when you are</h2>
            <p class="empty-text">
              Tell us about the job and we'll run a 10-question practice interview,
              then score your answers.
            </p>
            <button class="btn btn-primary rounded-pill px-4 py-2" data-bs-toggle="modal" data-bs-target="#exampleModal">
              <i class="bi bi-play-fill"></i> Start an interview
            </button>
          </div>

          <!-- Generating the questions -->
          <div v-else-if="phase === 'loading'" class="empty">
            <div class="typing typing-lg"><span></span><span></span><span></span></div>
            <p class="empty-text mb-0">Preparing your questions…</p>
          </div>

          <!-- Loading a past interview -->
          <div v-else-if="phase === 'review' && !result && !errorMessage" class="empty">
            <div class="typing typing-lg"><span></span><span></span><span></span></div>
            <p class="empty-text mb-0">Loading your interview…</p>
          </div>

          <template v-else>
            <div
              v-for="chat in chats"
              :key="chat.id"
              class="msg-row"
              :class="chat.sender === 'user' ? 'msg-row-user' : 'msg-row-interviewer'"
            >
              <span v-if="chat.sender !== 'user'" class="msg-avatar"><i class="bi bi-person-badge"></i></span>
              <div class="bubble" :class="chat.sender === 'user' ? 'bubble-user' : 'bubble-interviewer'">
                {{ chat.message }}
              </div>
            </div>

            <!-- Ad screen (Free accounts): covers the results until the user continues -->
            <section v-if="adActive" class="ad-screen">
              <div class="ad-label">Advertisement</div>
              <!-- Ad space: add an ad network's code here later -->
              <div class="ad-slot">
                <i class="bi bi-megaphone"></i>
                <span>Thanks for practicing with PreShape!</span>
              </div>
              <p class="ad-status">
                <template v-if="phase === 'grading'">Grading your answers…</template>
                <template v-else>Your results are ready!</template>
              </p>
              <button
                class="btn btn-primary rounded-pill px-4 py-2"
                :disabled="phase !== 'done' || adCountdown > 0"
                @click="closeAd"
              >
                <template v-if="adCountdown > 0">See my results in {{ adCountdown }}…</template>
                <template v-else-if="phase !== 'done'">Almost there…</template>
                <template v-else>See my results <i class="bi bi-arrow-right"></i></template>
              </button>
            </section>

            <!-- Grading in progress -->
            <div v-if="phase === 'grading' && !errorMessage && !adActive" class="msg-row msg-row-interviewer">
              <span class="msg-avatar"><i class="bi bi-person-badge"></i></span>
              <div class="bubble bubble-interviewer">
                <div class="typing"><span></span><span></span><span></span></div>
              </div>
            </div>

            <!-- The result -->
            <section v-if="(phase === 'done' || phase === 'review') && result && !adActive" class="result">
              <div class="score-card">
                <div class="score-label">Overall score</div>
                <div class="score-number">{{ result.overall_score }}<span>/100</span></div>
                <div class="score-track"><div class="score-fill" :style="{ width: result.overall_score + '%' }"></div></div>
                <p class="score-summary">{{ result.overall_feedback }}</p>
              </div>

              <!-- Only Premium results include the breakdown (the server leaves it out for Free) -->
              <template v-if="result.questions?.length">
              <h3 class="result-heading">Question by question</h3>
              <div class="result-list">
                <div v-for="(item, i) in result.questions" :key="i" class="result-item">
                  <div class="d-flex justify-content-between align-items-start gap-3">
                    <div class="result-question"><span class="result-index">{{ i + 1 }}</span>{{ item.question }}</div>
                    <span class="score-pill">{{ item.score }}/10</span>
                  </div>
                  <p v-if="item.answer" class="result-answer"><span>Your answer</span>{{ item.answer }}</p>
                  <p class="result-feedback">{{ item.feedback }}</p>
                </div>
              </div>
              </template>

              <div class="text-center mt-4">
                <button
                  v-if="!limitReached"
                  class="btn btn-primary rounded-pill px-4 py-2"
                  data-bs-toggle="modal"
                  data-bs-target="#exampleModal"
                >
                  <i class="bi bi-arrow-repeat"></i> New interview
                </button>
                <p v-else class="result-limit mb-0">
                  That was your last interview for this month. Your interviews reset on {{ resetDateText }}.
                </p>
              </div>
            </section>
          </template>
        </div>

        <!-- Message bar -->
        <footer class="composer">
          <form class="composer-form" @submit.prevent="sendAnswer">
            <input
              ref="answerInput"
              type="text"
              class="composer-input"
              :placeholder="phase === 'interview' ? 'Type your answer…' : 'Start an interview to answer'"
              v-model="messageField"
              :disabled="phase !== 'interview'"
            >
            <button
              class="composer-send"
              type="submit"
              :disabled="phase !== 'interview' || !messageField.trim()"
              aria-label="Send answer"
            >
              <i class="bi bi-arrow-up"></i>
            </button>
          </form>
        </footer>
      </div>
    </main>
  </div>

  <!-- ================= Account settings modal ================= -->
  <div class="modal fade" id="modalSettings" tabindex="-1" aria-labelledby="modalSettingsLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalSettingsLabel">Account settings</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="accountError" class="error-box mb-3">
            <i class="bi bi-exclamation-circle"></i>
            <span class="flex-grow-1">{{ accountError }}</span>
            <button class="btn btn-sm btn-primary rounded-pill" @click="loadAccount">Retry</button>
          </div>

          <!-- The logged-in user's information -->
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="account-avatar"><i class="bi bi-person-fill"></i></div>
            <div class="text-break">
              <div class="fw-bold fs-5">{{ user.name }}</div>
              <div class="small text-body-secondary">{{ user.email }}</div>
            </div>
            <span class="badge ms-auto" :class="user.accountType === 'Premium' ? 'account-badge-premium' : 'account-badge-free'">
              {{ user.accountType }}
            </span>
          </div>

          <div class="info-list">
            <div class="info-row"><span>Name</span><strong>{{ user.name }}</strong></div>
            <div class="info-row"><span>Email</span><strong class="text-break">{{ user.email }}</strong></div>
            <div class="info-row"><span>Account type</span><strong>{{ user.accountType }}</strong></div>
            <div class="info-row"><span>Member since</span><strong>{{ user.memberSince }}</strong></div>
            <div class="info-row"><span>Interviews this month</span><strong>{{ user.interviewsThisMonth }} of {{ user.interviewsPerMonth }}</strong></div>
          </div>

          <div v-if="billingError" class="error-box mt-3">
            <i class="bi bi-exclamation-circle"></i>
            <span class="flex-grow-1">{{ billingError }}</span>
          </div>

          <!-- Premium: manage or cancel in Stripe's Customer Portal -->
          <button
            v-if="isPremium"
            type="button"
            class="btn btn-secondary rounded-pill w-100 mt-3"
            :disabled="billingBusy"
            @click="manageSubscription"
          >
            <i class="bi bi-credit-card"></i> {{ billingBusy ? 'Opening…' : 'Manage subscription' }}
          </button>

          <!-- Upgrade option: Free accounts only. Opens Stripe Checkout;
               the plan changes only when Stripe confirms the payment. -->
          <div v-if="account && !isPremium" class="upgrade-card">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <span class="upgrade-title"><i class="bi bi-stars"></i> Premium</span>
              <span class="upgrade-price">$12<span>/month</span></span>
            </div>
            <ul class="upgrade-list">
              <li><i class="bi bi-check2"></i> 8 interviews every month</li>
              <li><i class="bi bi-check2"></i> Full question-by-question breakdown</li>
              <li><i class="bi bi-check2"></i> Your interview history</li>
              <li><i class="bi bi-check2"></i> No ads</li>
            </ul>
            <button type="button" class="btn btn-primary rounded-pill w-100" :disabled="billingBusy" @click="upgrade">
              {{ billingBusy ? 'Opening checkout…' : 'Upgrade to Premium' }}
            </button>
            <p class="upgrade-notice mb-0">
              <i class="bi bi-lock"></i> Secure payment by Stripe. Cancel any time.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-accent rounded-pill me-auto" @click="logout">
            <i class="bi bi-box-arrow-right"></i> Log out
          </button>
          <button type="button" class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= History modal (Premium) ================= -->
  <div class="modal fade" id="modalHistory" tabindex="-1" aria-labelledby="modalHistoryLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalHistoryLabel">Interview history</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="historyError" class="error-box">
            <i class="bi bi-exclamation-circle"></i>
            <span class="flex-grow-1">{{ historyError }}</span>
            <button class="btn btn-sm btn-primary rounded-pill" @click="loadHistory">Retry</button>
          </div>

          <div v-else-if="historyLoading && !history.length" class="d-flex justify-content-center py-4">
            <div class="typing typing-lg mb-0"><span></span><span></span><span></span></div>
          </div>

          <div v-else-if="!history.length" class="text-center py-4">
            <div class="empty-icon mx-auto"><i class="bi bi-clock-history"></i></div>
            <p class="empty-text mb-0">Your finished interviews will appear here.</p>
          </div>

          <div v-else class="history-list">
            <button
              v-for="item in history"
              :key="item.id"
              type="button"
              class="history-item"
              @click="openPastInterview(item)"
            >
              <span class="history-text">
                <span class="history-title">{{ item.job_title }}</span>
                <span class="history-date">{{ formatDate(item.created_at) }}</span>
              </span>
              <span class="score-pill">{{ item.overall_score }}/100</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= New interview modal ================= -->
  <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLabel">New interview</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <label class="form-label fw-semibold" for="jobTitleInput">Job title</label>
          <input id="jobTitleInput" type="text" class="form-control mb-3" v-model="jobTitle" placeholder="e.g. Frontend Developer">
          <label class="form-label fw-semibold" for="jobDescriptionInput">Job description</label>
          <textarea id="jobDescriptionInput" class="form-control" rows="6" v-model="jobDescription" placeholder="Paste the job description here"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Cancel</button>
          <button
            type="button"
            class="btn btn-primary rounded-pill px-4"
            @click="startInterview"
            data-bs-dismiss="modal"
            :disabled="!jobTitle.trim() || !jobDescription.trim() || busy || limitReached"
          >
            Generate questions
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* ================= Layout ================= */
  .app{
    --muted: #B5BEC6;
    --line: rgba(181, 190, 198, 0.16);
    --panel-line: #eceef3;
    display: flex;
    height: 100dvh;
    gap: 16px;
    padding: 16px;
  }

  .sidebar{
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--ps-light);
  }

  .main{
    flex: 1;
    min-width: 0;
    display: flex;
  }

  /* ================= Sidebar ================= */
  .logo{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
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
  }

  .btn-new{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    font-weight: 600;
    background-color: var(--ps-accent);
    border: none;
    color: var(--ps-dark);
    transition: background-color 0.15s ease, transform 0.15s ease;
  }

  .btn-new:hover{
    background-color: var(--ps-light);
    color: var(--ps-dark);
    transform: translateY(-1px);
  }

  .btn-new:disabled{
    background-color: var(--ps-accent);
    color: var(--ps-dark);
    opacity: 0.5;
  }

  .btn-history{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 14px;
    font-weight: 600;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--ps-light);
    transition: background-color 0.15s ease;
  }

  .btn-history:hover:not(:disabled){
    background: rgba(255, 255, 255, 0.08);
  }

  .btn-history:disabled{
    opacity: 0.5;
  }

  .side-card{
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .side-label{
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .side-value{
    font-weight: 700;
  }

  .side-small{
    font-size: 0.85rem;
    color: var(--muted);
  }

  .usage-bar{
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .usage-fill{
    height: 100%;
    border-radius: 999px;
    background-color: var(--ps-soft);
  }

  .tips{
    margin: 0;
    padding-left: 18px;
    font-size: 0.88rem;
    color: var(--muted);
  }

  .tips li + li{
    margin-top: 6px;
  }

  .account-button{
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--ps-light);
    text-align: left;
    transition: background-color 0.15s ease;
  }

  .account-button:hover{
    background: rgba(255, 255, 255, 0.08);
  }

  .account-avatar-sm{
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background-color: var(--ps-soft);
    color: var(--ps-dark);
  }

  .account-text{
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.2;
  }

  .account-name{
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .account-plan{
    font-size: 0.8rem;
    color: var(--muted);
  }

  .account-gear{
    margin-left: auto;
    color: var(--muted);
  }

  /* ================= Chat panel ================= */
  .panel{
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background-color: #fff;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.45);
    color: var(--ps-dark);
  }

  .panel-header{
    padding: 18px 24px 0;
    border-bottom: 1px solid var(--panel-line);
  }

  .panel-eyebrow{
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7a8094;
  }

  .panel-title{
    font-size: 1.1rem;
    font-weight: 700;
  }

  .progress-pill{
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
    background-color: #f2f4f8;
  }

  .progress-track{
    height: 3px;
    margin: 16px -24px 0;
    background-color: var(--panel-line);
  }

  .progress-fill{
    height: 100%;
    background-color: var(--ps-dark);
    transition: width 0.4s ease;
  }

  .panel-body{
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ----- Empty and loading states ----- */
  .empty{
    margin: auto;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 0;
  }

  .empty-icon{
    width: 64px;
    height: 64px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    font-size: 1.75rem;
    margin-bottom: 20px;
    background-color: var(--ps-light);
    color: var(--ps-dark);
  }

  .empty-title{
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }

  .empty-text{
    color: #6b7186;
    margin-bottom: 24px;
  }

  /* ----- Messages ----- */
  .msg-row{
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }

  .msg-row-user{
    justify-content: flex-end;
  }

  .msg-avatar{
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.95rem;
    background-color: var(--ps-light);
    color: var(--ps-dark);
  }

  .bubble{
    max-width: min(75%, 560px);
    padding: 12px 16px;
    border-radius: 18px;
    line-height: 1.5;
  }

  .bubble-user{
    background-color: var(--ps-dark);
    color: var(--ps-light);
    border-bottom-right-radius: 6px;
  }

  .bubble-interviewer{
    background-color: #eef2fa;
    color: var(--ps-dark);
    border-bottom-left-radius: 6px;
  }

  /* Three animated dots */
  .typing{
    display: flex;
    gap: 5px;
    padding: 4px 2px;
  }

  .typing span{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--ps-dark);
    opacity: 0.35;
    animation: typing 1.2s infinite ease-in-out;
  }

  .typing span:nth-child(2){ animation-delay: 0.15s; }
  .typing span:nth-child(3){ animation-delay: 0.3s; }

  .typing-lg{
    margin-bottom: 16px;
  }

  .typing-lg span{
    width: 10px;
    height: 10px;
  }

  @keyframes typing{
    0%, 60%, 100%{ transform: translateY(0); opacity: 0.35; }
    30%{ transform: translateY(-5px); opacity: 0.9; }
  }

  .error-box{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    background-color: #fdecee;
    color: #8a1c2b;
  }

  .ad-screen{
    margin-top: 12px;
    padding: 24px;
    border-radius: 20px;
    border: 1px solid var(--panel-line);
    text-align: center;
  }

  .ad-label{
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7a8094;
    margin-bottom: 10px;
  }

  .ad-slot{
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    background-color: #f6f7fa;
    color: #6b7186;
    font-size: 0.95rem;
  }

  .ad-slot i{
    font-size: 1.75rem;
  }

  .ad-status{
    margin: 16px 0 12px;
    color: #6b7186;
  }

  .notice-box{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    background-color: var(--ps-light);
    color: var(--ps-dark);
  }

  /* ----- Result ----- */
  .result{
    margin-top: 12px;
  }

  .score-card{
    padding: 28px;
    border-radius: 20px;
    background-color: var(--ps-light);
    text-align: center;
  }

  .score-label{
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #685044;
  }

  .score-number{
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .score-number span{
    font-size: 1.25rem;
    font-weight: 600;
    color: #685044;
  }

  .score-track{
    height: 8px;
    max-width: 320px;
    margin: 12px auto 16px;
    border-radius: 999px;
    background-color: rgba(58, 64, 90, 0.12);
    overflow: hidden;
  }

  .score-fill{
    height: 100%;
    border-radius: 999px;
    background-color: var(--ps-dark);
  }

  .score-summary{
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .result-heading{
    font-size: 1.05rem;
    font-weight: 700;
    margin: 28px 0 12px;
  }

  .result-list{
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .result-item{
    padding: 16px 18px;
    border-radius: 16px;
    border: 1px solid var(--panel-line);
  }

  .result-question{
    font-weight: 600;
  }

  .result-index{
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-right: 8px;
    border-radius: 8px;
    font-size: 0.8rem;
    background-color: #f2f4f8;
  }

  .score-pill{
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    background-color: var(--ps-dark);
    color: var(--ps-light);
  }

  .result-limit{
    color: #6b7186;
  }

  .result-answer{
    margin: 10px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    background-color: #f6f7fa;
    font-size: 0.93rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .result-answer span{
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7a8094;
    margin-bottom: 2px;
  }

  .result-feedback{
    margin: 8px 0 0;
    color: #555b70;
    font-size: 0.93rem;
    line-height: 1.55;
  }

  /* ----- Message bar ----- */
  .composer{
    padding: 16px 24px 20px;
    border-top: 1px solid var(--panel-line);
  }

  .composer-form{
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 18px;
    border-radius: 999px;
    border: 1px solid #dfe2ea;
    background-color: #f8f9fb;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .composer-form:focus-within{
    border-color: var(--ps-soft);
    box-shadow: 0 0 0 4px rgba(153, 178, 221, 0.25);
  }

  .composer-input{
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    padding: 8px 0;
    color: var(--ps-dark);
  }

  .composer-input:disabled{
    cursor: not-allowed;
  }

  .composer-send{
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 50%;
    border: none;
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    background-color: var(--ps-dark);
    color: var(--ps-light);
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }

  .composer-send:hover:not(:disabled){
    background-color: #685044;
  }

  .composer-send:disabled{
    opacity: 0.3;
  }

  /* ================= Modals ================= */
  .modal-content{
    border: none;
    border-radius: 20px;
  }

  .modal-header,
  .modal-footer{
    border-color: var(--panel-line);
  }

  .modal-title{
    font-weight: 700;
  }

  .upgrade-card{
    margin-top: 16px;
    padding: 18px;
    border-radius: 16px;
    background-color: var(--ps-light);
    color: var(--ps-dark);
  }

  .upgrade-title{
    font-weight: 700;
    font-size: 1.05rem;
  }

  .upgrade-price{
    font-weight: 800;
    font-size: 1.25rem;
  }

  .upgrade-price span{
    font-size: 0.85rem;
    font-weight: 600;
    color: #685044;
  }

  .upgrade-list{
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    font-size: 0.93rem;
  }

  .upgrade-list li + li{
    margin-top: 4px;
  }

  .upgrade-list i{
    color: #685044;
    margin-right: 6px;
  }

  .upgrade-notice{
    margin-top: 10px;
    font-size: 0.88rem;
    text-align: center;
    color: #685044;
  }

  .history-list{
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item{
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--panel-line);
    background: #fff;
    color: var(--ps-dark);
    text-align: left;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .history-item:hover{
    background-color: #f6f7fa;
    border-color: var(--ps-soft);
  }

  .history-text{
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin-right: auto;
  }

  .history-title{
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-date{
    font-size: 0.85rem;
    color: #6b7186;
  }

  .account-avatar{
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 1.75rem;
    background-color: var(--ps-soft);
    color: var(--ps-dark);
  }

  .account-badge-free{
    background-color: var(--ps-soft);
    color: var(--ps-dark);
  }

  .account-badge-premium{
    background-color: var(--ps-accent);
    color: var(--ps-dark);
  }

  .info-list{
    border: 1px solid var(--panel-line);
    border-radius: 14px;
    overflow: hidden;
  }

  .info-row{
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
  }

  .info-row + .info-row{
    border-top: 1px solid var(--panel-line);
  }

  .info-row span{
    color: #6b7186;
  }

  .info-row strong{
    text-align: right;
  }

  /* ================= Tablets and phones ================= */
  @media (max-width: 991.98px){
    .app{
      flex-direction: column;
      padding: 12px;
      gap: 12px;
    }

    /* Sidebar becomes a slim top bar */
    .sidebar{
      width: auto;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    .side-extra{
      display: none;
    }

    .logo{
      margin-right: auto;
    }

    .btn-new{
      padding: 10px 14px;
    }

    .account-button{
      margin-top: 0;
      width: auto;
      padding: 6px;
      border-radius: 50%;
    }

    .account-text,
    .account-gear{
      display: none;
    }

    .main{
      min-height: 0;
    }
  }

  @media (max-width: 575.98px){
    .btn-new span,
    .btn-history span{
      display: none;
    }

    .panel{
      border-radius: 18px;
    }

    .panel-header{
      padding: 14px 16px 0;
    }

    .progress-track{
      margin: 14px -16px 0;
    }

    .panel-body{
      padding: 16px;
    }

    .composer{
      padding: 12px 16px 14px;
    }

    .bubble{
      max-width: 85%;
    }
  }
</style>
