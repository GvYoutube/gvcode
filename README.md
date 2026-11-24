# gvcode
website placeholder for gvcode

## Signup thank-you email

The static site can remain hosted on GitHub Pages. Netlify hosts the serverless email function independently at:

`https://gvcode.netlify.app/.netlify/functions/send-thank-you`

In the Netlify site settings, configure these environment variables:

- `RESEND_API_KEY` — the Resend API key; mark it as a secret.
- `RESEND_TEMPLATE_ID` — the published Resend template ID for `gvcodeThankPre`. This identifier is not a secret.
- `ALLOWED_ORIGIN` — the exact origin serving the signup page, such as `https://owner.github.io` or a custom domain, with no path or trailing slash.

Deploy this repository to Netlify so it can build `netlify/functions/send-thank-you.js`. The `ALLOWED_ORIGIN` value enables the browser's cross-origin request from GitHub Pages; no DNS change is needed unless you want the website itself to move to Netlify or use a custom domain there. CORS/origin checks are not a substitute for rate limiting, so add an anti-abuse control before relying on this endpoint for public traffic.

The signup page first submits the signup to Formspree, then requests the thank-you email from the Netlify Function. The Resend API key is never included in browser code.

Run the function tests with `node --test`.
