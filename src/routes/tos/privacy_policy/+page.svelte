<script lang="ts">
  import Navigation from "$lib/components/Navigation.svelte";
</script>

<svelte:head>
  <title>Privacy Policy | CCPorted</title>
</svelte:head>

<Navigation />
<div class="privacy-policy-container">
  <h1>Privacy Policy</h1>
  <p class="last-updated">Last Updated: October 13, 2026</p>
  <main>
    <p>
      This policy explains what information CCPorted collects and how it is used
      when you use the site.
    </p>

    <section>
      <h2>Information We Collect</h2>
      <h3>Account Information</h3>
      <p>When you create an account, we collect and store your email address, name, password, and profile picture. Accounts are managed using AWS Cognito. See the <a href="https://aws.amazon.com/privacy/">AWS Privacy Policy</a> for information about AWS data practices.</p>

      <h3>Analytics and Usage Data</h3>
      <p>We use Google Analytics to understand site usage. It may collect standard internet log and visit information, including pages visited, time spent on pages, browser and device information, IP address, and approximate geographic location. See <a href="https://policies.google.com/privacy">Google's Privacy Policy</a>.</p>

      <h3>Activity Tracking</h3>
      <p>When you are logged in, we collect playtime statistics, page visit counts, and message counts across channels. We also maintain anonymous grade popularity statistics. Grade clicks increment a global counter and are not associated with individual users.</p>
    </section>

    <section>
      <h2>Data Retention</h2>
      <p>Message content and associated metadata, such as sender display names, are retained in our systems.</p>
    </section>

    <section>
      <h2>How We Use Information</h2>
      <ul>
        <li>Provide and maintain the site and its features</li>
        <li>Monitor and analyze site usage</li>
        <li>Improve functionality and user experience</li>
        <li>Generate anonymous usage statistics</li>
      </ul>
    </section>

    <section>
      <h2>Security</h2>
      <p>We use appropriate measures to protect information, including encrypted passwords and password-protected private channels.</p>
    </section>

    <section>
      <h2>Changes to This Policy</h2>
      <p>We may update this policy from time to time. Changes will be posted on this page with an updated revision date.</p>
    </section>

    <section>
      <h2>Contact Us</h2>
      <p>For questions about this policy, <a href="mailto:ccported@ccported.click">email us</a>.</p>
    </section>
  </main>
</div>

<style>
  .privacy-policy-container {
    background-color: #ffffff;
    margin: 0;
    padding: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  h1 {
    text-align: center;
    color: #333;
    padding: 20px 0;
    margin: 0;
    font-size: 48px;
  }

  h2 {
    color: #444;
    margin-top: 30px;
  }

  h3 {
    color: #444;
    margin-top: 20px;
  }

  main {
    width: 800px;
    max-width: 90%;
  }

  .last-updated {
    text-align: center;
    color: #666;
    margin-bottom: 30px;
  }

  section {
    margin-bottom: 30px;
  }
</style>
