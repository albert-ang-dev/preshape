// PropellerAds Interstitial, shown to FREE users after the last answer,
// while the interview is being graded.
//
// SETUP: in the PropellerAds dashboard, create an Interstitial zone for your
// site and copy its code. Paste the JavaScript that is INSIDE their
// <script> ... </script> tag where it says "PASTE HERE" below.
// (Paste only the code, not the <script> tags themselves.)
//
// The ad must never block the results: if the code is missing, blocked by an
// ad blocker, or throws an error, the countdown and the button still work.

export function useInterstitialAd() {
  function showInterstitial() {
    if (import.meta.server) return

    try {
      // ---------- PASTE HERE: your PropellerAds Interstitial code ----------

      // ----------------------------------------------------------------------
    } catch (error) {
      console.warn('Interstitial ad could not load:', error)
    }
  }

  return { showInterstitial }
}
