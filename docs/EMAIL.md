# Will Power emails (sign-up confirmation and more)

Goal: every email says **Will Power**, comes from a **wilpow.com** address, and lands in the inbox.

## Why the first email looked unbranded and went to spam
- Supabase sends sign-up emails from its own address with its own plain template. Both are replaceable.
- Its built-in sender is for testing only (a few emails per hour). Real use needs your own email service ("custom SMTP").
- A brand-new domain with no sending history, or no SPF/DKIM/DMARC records, usually goes to spam at first. That is the "warm up" you were thinking of.

## Step 1: pick an email service (Resend is the simple one)
1. Create an account at resend.com (free tier covers early use).
2. Add your sending domain. Use a **subdomain**, for example `mail.wilpow.com`, so your main domain's reputation is protected.
3. Resend shows DNS records to add (SPF, DKIM, and a bounce/return-path record). Add them in **Route 53** for wilpow.com exactly as Resend lists. Wait until Resend shows the domain as **Verified**.
4. Add a DMARC record in Route 53: type TXT, name `_dmarc.wilpow.com`, value `v=DMARC1; p=none; rua=mailto:you@wilpow.com` (use an address you read). Start with `p=none`, move to `quarantine` later once everything sends cleanly.
5. Create an API key in Resend. **Keep it secret**: paste it only into Supabase, never into chat, GitHub or the app.

## Step 2: send Supabase's emails through it
Supabase dashboard > **Authentication** > **Emails** > **SMTP Settings** > turn on Custom SMTP:
- Sender email: `no-reply@mail.wilpow.com` (any address on the verified subdomain)
- Sender name: `Will Power`
- Host: `smtp.resend.com`   Port: `465`
- Username: `resend`   Password: your Resend API key
Save. Then in **Authentication** > **Rate limits** raise the email limit if you expect more sign-ups.

## Step 3: branded wording
Supabase dashboard > **Authentication** > **Emails** > **Templates**. For each template set the **Subject** and paste the matching HTML from `docs/email-templates/`:

| Template in Supabase | Subject line | File |
|---|---|---|
| Confirm sign up | Confirm your email to join Will Power | `confirm-signup.html` |
| Reset password | Reset your Will Power password | `reset-password.html` |
| Magic link | Your Will Power sign-in link | `magic-link.html` |

The files use Supabase's placeholders (`{{ .ConfirmationURL }}` and `{{ .SiteURL }}`). Set **Authentication > URL Configuration > Site URL** to `https://wilpow.com` so the logo and links point at your site. Add `https://wilpow.com/**` under Redirect URLs.

## Step 4: warm up the domain so it stops going to spam
- Send real, wanted emails first: your own account, family, friends. Ask them to open it, click the link, and mark **Not spam** and add you to contacts. Replies help most.
- Start small (a few emails a day) and grow gradually over 2 to 4 weeks. Don't send a big burst on day one.
- Keep emails short, one clear button, no spammy words, no images beyond the logo. The templates are built that way.
- Always send from the same address and name.
- Test the score at mail-tester.com (send a sign-up email to the address it gives you). Aim for 9 out of 10 or better.
- Watch Resend's dashboard for bounces and complaints. Fix a bad address list quickly.

## Later: follow notifications
The same email service can send "X started following you" emails. See the TODO item "Email service (follows and sign-in)".
