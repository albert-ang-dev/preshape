<script setup>
// Shared layout for the legal pages (Terms, Privacy, Refunds):
// top bar, white card with title and table of contents, and footer.
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  path: { type: String, required: true },          // e.g. '/privacy'
  sections: { type: Array, default: () => [] },     // [{ id, title }] for the contents box
})

const siteUrl = useRuntimeConfig().public.siteUrl
const effectiveDate = legal.effectiveDate   // from app/utils/legal.js
const pageTitle = `${props.title} – PreShape`

useSeoMeta({
  title: pageTitle,
  description: props.description,
  ogTitle: pageTitle,
  ogDescription: props.description,
  ogUrl: siteUrl + props.path,
})
useHead({ link: [{ rel: 'canonical', href: siteUrl + props.path }] })
</script>

<template>
  <div class="legal-page">
    <nav class="container nav-bar">
      <NuxtLink to="/" class="logo">
        <span class="logo-mark"><i class="bi bi-backpack2"></i></span>
        PreShape
      </NuxtLink>
      <NuxtLink to="/" class="back-link"><i class="bi bi-arrow-left"></i> Home</NuxtLink>
    </nav>

    <main class="container">
      <article class="legal-card">
        <h1>{{ title }}</h1>
        <p class="legal-meta">Effective {{ effectiveDate }}</p>

        <nav v-if="sections.length" class="toc" aria-label="Contents">
          <a v-for="s in sections" :key="s.id" :href="'#' + s.id">{{ s.title }}</a>
        </nav>

        <slot />
      </article>
    </main>

    <footer class="container footer">
      <span>© {{ new Date().getFullYear() }} PreShape</span>
      <span class="footer-links">
        <NuxtLink to="/terms">Terms of Service</NuxtLink>
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
        <NuxtLink to="/refunds">Refunds &amp; Cancellation</NuxtLink>
      </span>
    </footer>
  </div>
</template>

<style scoped>
  .legal-page{
    --muted: #B5BEC6;
    min-height: 100dvh;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: var(--ps-light);
  }

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

  .back-link{
    color: var(--muted);
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover{
    color: var(--ps-light);
  }

  .legal-card{
    max-width: 780px;
    margin: 12px auto 0;
    padding: 40px;
    border-radius: 24px;
    background-color: #fff;
    color: var(--ps-dark);
    line-height: 1.7;
  }

  .legal-card h1{
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .legal-meta{
    color: #6b7186;
    margin-bottom: 24px;
  }

  .toc{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 4px 16px;
    padding: 16px 20px;
    margin-bottom: 32px;
    border-radius: 16px;
    background-color: #f6f7fa;
    font-size: 0.92rem;
  }

  .toc a{
    color: var(--ps-dark);
    text-decoration: none;
  }

  .toc a:hover{
    color: #685044;
    text-decoration: underline;
  }

  /* Content comes from the page through the slot */
  .legal-card :slotted(section){
    scroll-margin-top: 24px;
  }

  .legal-card :slotted(h2){
    font-size: 1.2rem;
    font-weight: 700;
    margin: 32px 0 8px;
  }

  .legal-card :slotted(h3){
    font-size: 1rem;
    font-weight: 700;
    margin: 20px 0 6px;
  }

  .legal-card :slotted(ul),
  .legal-card :slotted(ol){
    padding-left: 20px;
  }

  .legal-card :slotted(li + li){
    margin-top: 4px;
  }

  .legal-card :slotted(a){
    color: #685044;
  }

  .legal-card :slotted(table){
    width: 100%;
    margin: 8px 0 16px;
    font-size: 0.92rem;
    border-collapse: collapse;
  }

  .legal-card :slotted(th),
  .legal-card :slotted(td){
    padding: 8px 10px;
    border-bottom: 1px solid #eceef3;
    vertical-align: top;
    text-align: left;
  }

  .legal-card :slotted(.table-wrap){
    overflow-x: auto;
  }

  .footer{
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 24px;
    padding-top: 32px;
    padding-bottom: 32px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .footer-links{
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 16px;
  }

  .footer-links a{
    color: var(--muted);
    text-decoration: none;
  }

  .footer-links a:hover{
    color: var(--ps-light);
  }

  @media (max-width: 575.98px){
    .legal-card{
      padding: 24px 20px;
      border-radius: 18px;
    }

    .legal-card h1{
      font-size: 1.75rem;
    }
  }
</style>
