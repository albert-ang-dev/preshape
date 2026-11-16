// Loads Bootstrap's JS (dropdowns, modals, tooltips, etc.) in the browser only.
// The bundle build includes Popper, so no extra dependency is needed.
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min.js'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      bootstrap
    }
  }
})
