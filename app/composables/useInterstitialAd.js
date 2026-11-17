// PropellerAds Vignette ad, shown to FREE users after the last answer,
// while the interview is being graded.
//
// The script is only added at that moment (never on the landing page and
// never for Premium users), and only once per visit.
//
// The ad must never block the results: if the script is blocked by an ad
// blocker or fails to load, the countdown and the button still work.

const AD_ZONE = '12281180'
const AD_SCRIPT_URL = 'https://n6wxm.com/vignette.min.js'
const AD_SCRIPT_ID = 'propeller-vignette'

export function useInterstitialAd() {
  function showInterstitial() {
    if (import.meta.server) return
    if (document.getElementById(AD_SCRIPT_ID)) return   // already loaded this visit

    try {
      // Same as the PropellerAds snippet, but run from code at the right moment
      const script = document.createElement('script')
      script.id = AD_SCRIPT_ID
      script.dataset.zone = AD_ZONE
      script.src = AD_SCRIPT_URL
      script.async = true
      script.onerror = () => console.warn('Vignette ad could not load (blocked or offline).')
      document.body.appendChild(script)
    } catch (error) {
      console.warn('Vignette ad could not load:', error)
    }
  }

  return { showInterstitial }
}
