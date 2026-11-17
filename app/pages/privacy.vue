<script setup>
// Privacy Policy. Your name, country and email come from app/utils/legal.js.
// It describes what PreShape actually collects and which services it uses.
// If you add a new service (analytics, email, another ad network...), update it.
// This is a starting template, not legal advice.

const sections = [
  { id: 'who', title: '1. Who we are' },
  { id: 'collect', title: '2. What we collect' },
  { id: 'use', title: '3. How we use it' },
  { id: 'share', title: '4. Who we share it with' },
  { id: 'ai', title: '5. AI processing' },
  { id: 'cookies', title: '6. Cookies and ads' },
  { id: 'retention', title: '7. How long we keep it' },
  { id: 'rights', title: '8. Your rights' },
  { id: 'security', title: '9. Security' },
  { id: 'transfers', title: '10. International transfers' },
  { id: 'children', title: '11. Children' },
  { id: 'changes', title: '12. Changes' },
  { id: 'contact', title: '13. Contact' },
]
</script>

<template>
  <LegalPage
    title="Privacy Policy"
    description="How PreShape collects, uses and protects your information, which services we use, and the choices and rights you have."
    path="/privacy"
    :sections="sections"
  >
    <p>
      This Privacy Policy explains what information PreShape collects when you use our AI
      interview practice service, why we collect it, and the choices you have. We only collect
      what we need to run PreShape, and we never sell your personal information.
    </p>

    <section id="who">
      <h2>1. Who we are</h2>
      <p>
        PreShape is run by {{ legal.owner }}, based in {{ legal.country }}. We are responsible
        for your personal information (the "data controller"). You can contact us at
        {{ legal.email }}.
      </p>
    </section>

    <section id="collect">
      <h2>2. What we collect</h2>

      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password. Your password is stored securely by our authentication provider in hashed form; we can never see it.</li>
        <li><strong>Interview content:</strong> the job titles you enter, the questions generated for you, your answers, and the scores and feedback you receive.</li>
        <li><strong>Job descriptions:</strong> used to generate questions and grade answers. We don't store them with your interview.</li>
      </ul>

      <h3>Information created as you use PreShape</h3>
      <ul>
        <li><strong>Account and usage information:</strong> your plan (Free or Premium), when you joined, and how many interviews you've started each month.</li>
        <li><strong>Payment information:</strong> if you subscribe, our payment provider Stripe collects your card details. We only receive a customer ID, a subscription ID and the subscription's status. We never see or store your full card number.</li>
        <li><strong>Technical information:</strong> like most websites, our hosting provider automatically records information such as your IP address, browser type and the pages you request, for security and to keep the service running.</li>
      </ul>

      <h3>After you delete your account</h3>
      <p>
        We keep a one-way, irreversible code (a "hash") of your email address and the number of
        interviews you used that month. It can't be turned back into your email address. We use
        it only so that deleting and re-creating an account can't reset the monthly limit.
      </p>
    </section>

    <section id="use">
      <h2>3. How we use it</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Purpose</th><th>Legal basis (where GDPR applies)</th></tr>
          </thead>
          <tbody>
            <tr><td>Creating and running your account, generating questions, grading answers, showing results and history</td><td>Performing our contract with you</td></tr>
            <tr><td>Processing Premium payments and managing subscriptions</td><td>Performing our contract with you</td></tr>
            <tr><td>Enforcing monthly limits and preventing abuse</td><td>Our legitimate interests</td></tr>
            <tr><td>Security, fixing problems and keeping the service available</td><td>Our legitimate interests</td></tr>
            <tr><td>Showing ads to Free accounts</td><td>Our legitimate interests, or your consent where required by law</td></tr>
            <tr><td>Keeping payment and tax records</td><td>Legal obligation</td></tr>
            <tr><td>Replying when you contact us</td><td>Our legitimate interests</td></tr>
          </tbody>
        </table>
      </div>
      <p>We don't use your interview content for marketing, and we don't sell or rent your personal information.</p>
    </section>

    <section id="share">
      <h2>4. Who we share it with</h2>
      <p>We use trusted service providers to run PreShape. They may only use your information to provide their service to us.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Provider</th><th>What they do</th><th>What they receive</th></tr>
          </thead>
          <tbody>
            <tr><td>Supabase</td><td>Database and login</td><td>Account details, interview content, plan and usage</td></tr>
            <tr><td>OpenAI</td><td>Generates questions and grades answers</td><td>Job title, job description, questions and your answers</td></tr>
            <tr><td>Stripe</td><td>Payments and subscriptions</td><td>Your email, payment details and billing information</td></tr>
            <tr><td>Vercel</td><td>Website hosting</td><td>Technical information such as IP address</td></tr>
            <tr><td>PropellerAds</td><td>Ads for Free accounts only</td><td>Technical and device information, and cookies or similar identifiers</td></tr>
            <tr><td>Google Fonts</td><td>Delivers the website's font</td><td>Your IP address when the font loads</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        We may also share information if the law requires it, to protect our rights or users'
        safety, or as part of a sale or merger of PreShape (in which case this policy would
        continue to apply).
      </p>
    </section>

    <section id="ai">
      <h2>5. AI processing</h2>
      <p>
        To create your questions and feedback, we send your job title, job description, the
        questions and your answers to OpenAI through its API. Under OpenAI's API terms, this data
        is not used to train their models by default and is kept by OpenAI only for a limited
        time for abuse monitoring.
      </p>
      <p>
        Scores and feedback are generated automatically. They're for practice only and have no
        legal or similar effect on you. Please don't include sensitive information in your
        answers, such as health details, government ID numbers or financial details.
      </p>
    </section>

    <section id="cookies">
      <h2>6. Cookies and ads</h2>
      <ul>
        <li><strong>Essential storage:</strong> we store your login session in your browser so you stay logged in. PreShape doesn't work without it.</li>
        <li><strong>Payments:</strong> Stripe uses cookies on its checkout pages to process payments and prevent fraud.</li>
        <li><strong>Ads (Free accounts only):</strong> once you're logged in on the Free plan, we load ads from PropellerAds. PropellerAds may use cookies and similar technologies to show and measure ads and may show notification prompts, which you can decline. Premium accounts and visitors who aren't logged in don't load any ads.</li>
      </ul>
      <p>You can block or delete cookies in your browser settings. Blocking essential storage will log you out.</p>
    </section>

    <section id="retention">
      <h2>7. How long we keep it</h2>
      <ul>
        <li><strong>Account and interviews:</strong> until you delete your account. Deleting your account permanently removes your account, profile and interviews right away.</li>
        <li><strong>Email hash and monthly usage after deletion:</strong> no longer than 12 months.</li>
        <li><strong>Payment records:</strong> kept by us and Stripe for as long as tax and accounting laws require, even after you delete your account.</li>
        <li><strong>Technical logs:</strong> kept for a short time by our hosting provider for security.</li>
      </ul>
    </section>

    <section id="rights">
      <h2>8. Your rights</h2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal information we hold about you and get a copy;</li>
        <li><strong>Correct</strong> information that is wrong;</li>
        <li><strong>Delete</strong> your information, which you can do yourself in <strong>Account settings → Delete account</strong>;</li>
        <li><strong>Export</strong> your data in a portable format;</li>
        <li><strong>Object to</strong> or <strong>restrict</strong> certain processing, and withdraw consent where we rely on it;</li>
        <li><strong>Complain</strong> to your local data protection authority.</li>
      </ul>
      <p>
        To use any of these rights, email us at {{ legal.email }}. We'll reply within 30 days and
        may ask you to confirm your identity first.
      </p>
    </section>

    <section id="security">
      <h2>9. Security</h2>
      <p>
        We protect your information with encrypted connections (HTTPS), access controls so each
        user can only reach their own data, and by keeping secret keys on our servers only. No
        method of storage or transmission is completely secure, but we work to protect your
        information and will tell you and the authorities about a serious breach where the law
        requires it.
      </p>
    </section>

    <section id="transfers">
      <h2>10. International transfers</h2>
      <p>
        Our service providers may process your information in countries other than your own,
        including the United States. Where required, these transfers are protected by
        safeguards such as the European Commission's Standard Contractual Clauses.
      </p>
    </section>

    <section id="children">
      <h2>11. Children</h2>
      <p>
        PreShape is not meant for anyone under 16. We don't knowingly collect information from
        children. If you believe a child has created an account, contact us and we'll delete it.
      </p>
    </section>

    <section id="changes">
      <h2>12. Changes</h2>
      <p>
        We may update this policy as PreShape changes. If a change is significant, we'll tell you
        by email or in the app before it takes effect. The date at the top shows when it was
        last updated.
      </p>
    </section>

    <section id="contact">
      <h2>13. Contact</h2>
      <p>
        Questions or requests about your privacy? Email {{ legal.email }}. See also our
        <NuxtLink to="/terms">Terms of Service</NuxtLink> and
        <NuxtLink to="/refunds">Refund &amp; Cancellation Policy</NuxtLink>.
      </p>
    </section>
  </LegalPage>
</template>
