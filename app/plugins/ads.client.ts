// PropellerAds Multitag (zone 311307), for logged-in FREE users only.
//
// Visitors who aren't logged in and Premium users never load the script.
// The plan comes from useState('accountPlan'), which app/pages/interview.vue
// sets from /api/me (the plan stored in the database).
//
// Once loaded, an ad script can't be "unloaded", so logging out does a full
// page reload (see logout() in interview.vue), which removes it.
// Needs public/sw.js for the push formats.

const AD_SCRIPT_ID = 'propeller-multitag'

function loadMultitag() {
  if (document.getElementById(AD_SCRIPT_ID)) return   // already loaded

  const script = document.createElement('script')
  script.id = AD_SCRIPT_ID
  script.src = 'https://quge5.com/88/tag.min.js'
  script.dataset.zone = '311307'
  script.dataset.cfasync = 'false'
  script.async = true
  document.head.appendChild(script)
}

export default defineNuxtPlugin(() => {
  const plan = useState<string | null>('accountPlan', () => null)

  watch(plan, (value) => {
    if (value === 'free') loadMultitag()
  }, { immediate: true })
})
