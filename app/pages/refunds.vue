<script setup>
// Refund & Cancellation Policy. Your email comes from app/utils/legal.js.
// This is a starting template, not legal advice: consumer laws on refunds
// differ a lot between countries.

const sections = [
  { id: 'summary', title: 'Summary' },
  { id: 'cancel', title: 'How to cancel' },
  { id: 'after', title: 'What happens when you cancel' },
  { id: 'refunds', title: 'Refunds' },
  { id: 'exceptions', title: 'When we do refund' },
  { id: 'request', title: 'How to ask for a refund' },
  { id: 'failed', title: 'Failed payments' },
  { id: 'delete', title: 'Deleting your account' },
  { id: 'changes', title: 'Price changes' },
  { id: 'contact', title: 'Contact' },
]
</script>

<template>
  <LegalPage
    title="Refund & Cancellation Policy"
    description="How to cancel PreShape Premium, what happens when you cancel, and when refunds are given."
    path="/refunds"
    :sections="sections"
  >
    <section id="summary">
      <h2>Summary</h2>
      <ul>
        <li>PreShape Premium costs <strong>$12 per month</strong> and renews automatically each month.</li>
        <li>You can <strong>cancel at any time</strong>, in a few clicks, with no fees.</li>
        <li>After cancelling, you keep Premium until the end of the month you've paid for.</li>
        <li>We don't refund partly used months, except in the cases listed below or where the law requires it.</li>
      </ul>
    </section>

    <section id="cancel">
      <h2>How to cancel</h2>
      <ol>
        <li>Log in and open <strong>Account settings</strong> (bottom of the sidebar).</li>
        <li>Click <strong>Manage subscription</strong>. This opens our payment provider Stripe's secure portal.</li>
        <li>Choose <strong>Cancel subscription</strong> and confirm.</li>
      </ol>
      <p>
        You'll see a confirmation straight away. If you have trouble cancelling, email us at
        {{ legal.email }} and we'll cancel it for you.
      </p>
    </section>

    <section id="after">
      <h2>What happens when you cancel</h2>
      <ul>
        <li>You <strong>won't be charged again</strong>.</li>
        <li>You keep all Premium features (8 interviews a month, full breakdowns, history and no ads) until the end of your current billing period.</li>
        <li>After that, your account moves to the <strong>Free plan</strong>: 4 interviews a month, score and summary only, with ads.</li>
        <li>Your past interviews are <strong>not deleted</strong>. If you subscribe again later, your full history and breakdowns are available again.</li>
        <li>You can subscribe again at any time from Account settings.</li>
      </ul>
    </section>

    <section id="refunds">
      <h2>Refunds</h2>
      <p>
        Because Premium gives you immediate access to digital features, payments are generally
        <strong>non-refundable</strong>, including for months you've only partly used or haven't
        used at all. Cancelling stops future payments but doesn't refund the current month.
      </p>
    </section>

    <section id="exceptions">
      <h2>When we do refund</h2>
      <p>We'll refund a payment if:</p>
      <ul>
        <li>you were <strong>charged twice</strong> for the same period, or charged after you had already cancelled;</li>
        <li>a <strong>technical problem on our side</strong> stopped you from using Premium for most of the billing period, and we couldn't fix it;</li>
        <li>you were charged <strong>without authorising it</strong> (for example, someone else used your card);</li>
        <li>the <strong>law where you live</strong> gives you a right to a refund or to withdraw from the purchase, for example the 14-day right of withdrawal for consumers in the EU and UK, where it applies.</li>
      </ul>
      <p>
        We may also make exceptions in other situations at our discretion. Approved refunds are
        returned to your original payment method. Your bank may take 5 to 10 business days to show
        it.
      </p>
    </section>

    <section id="request">
      <h2>How to ask for a refund</h2>
      <p>
        Email {{ legal.email }} from the email address on your PreShape account, within 30 days of
        the charge. Tell us the date and amount of the charge and why you're asking for a refund.
        We'll reply within 5 business days.
      </p>
      <p>
        Please contact us before disputing a charge with your bank. Disputes take much longer to
        resolve, and we can usually sort things out faster directly.
      </p>
    </section>

    <section id="failed">
      <h2>Failed payments</h2>
      <p>
        If a monthly payment fails, Stripe will try again over the following days and may email
        you to update your card. If the payment still doesn't go through, your subscription ends
        and your account moves to the Free plan. You can update your card at any time in
        <strong>Account settings → Manage subscription</strong>.
      </p>
    </section>

    <section id="delete">
      <h2>Deleting your account</h2>
      <p>
        If you delete your account in <strong>Account settings → Delete account</strong>, any Premium
        subscription is <strong>cancelled immediately</strong> and the remaining time in your
        billing period isn't refunded. If you only want to stop paying, cancel your subscription
        instead and keep your account.
      </p>
    </section>

    <section id="changes">
      <h2>Price changes</h2>
      <p>
        If the price of Premium changes, we'll tell you at least 30 days before the new price
        applies to you. You can cancel before then if you don't want to continue.
      </p>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>
        Questions about billing? Email {{ legal.email }}. See also our
        <NuxtLink to="/terms">Terms of Service</NuxtLink> and
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
      </p>
    </section>
  </LegalPage>
</template>
