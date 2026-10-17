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
| Invite user | You’re invited to Will Power | `invite-user.html` (sent when you invite someone from Authentication > Users > Invite user) |
| Magic link or OTP | Your Will Power sign-in code | `magic-link.html` (shows the 6-digit code, see "Sign-in codes" below) |
| Change email address | Confirm your new email for Will Power | `change-email.html` (uses `{{ .Email }}` and `{{ .NewEmail }}`) |
| Reset password | Reset your Will Power password | `reset-password.html` (the app's own forgot password uses the sign-in code below, so this email only goes out if you use "Send password recovery" in the dashboard. It tells the person to use "Forgot password? Email me a code" instead of linking to a reset page the app doesn't have) |
| Reauthentication | Your Will Power confirmation code | `reauthentication.html` (shows a code; only used if the app ever asks people to confirm a sensitive change) |

The files use Supabase's placeholders (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`). Supabase fills these in each time it sends, so paste them exactly as they are, with the double curly braces. Set **Authentication > URL Configuration > Site URL** to `https://wilpow.com` so the logo and links point at your site. Add `https://wilpow.com/**` under Redirect URLs.

## Step 4: warm up the domain so it stops going to spam
- Send real, wanted emails first: your own account, family, friends. Ask them to open it, click the link, and mark **Not spam** and add you to contacts. Replies help most.
- Start small (a few emails a day) and grow gradually over 2 to 4 weeks. Don't send a big burst on day one.
- Keep emails short, one clear button, no spammy words, no images beyond the logo. The templates are built that way.
- Always send from the same address and name.
- Test the score at mail-tester.com (send a sign-up email to the address it gives you). Aim for 9 out of 10 or better.
- Watch Resend's dashboard for bounces and complaints. Fix a bad address list quickly.

## Sign-in codes (forgot password, and signing in without a password)
The Log in tab has "Forgot password? Email me a code". The person enters their email, we send a 6-digit code, they type it into the app and are signed in, then asked to choose a new password (they can skip). It is one flow for both "I forgot my password" and "I'd rather not use one".

Why a code and not a link: on an iPhone, a link in an email opens in Safari, while the installed home-screen app keeps its own separate storage, so the link often cannot sign the app in. A code is typed into the app that is already open, so it always works.

Owner steps, in the Supabase dashboard:
1. **Authentication > Emails > Templates > Magic Link**: paste `docs/email-templates/magic-link.html` and set the subject to `Your Will Power sign-in code`. The template must contain `{{ .Token }}`, which is the code. (The app asks Supabase for a code through its "Magic Link" template.)
2. **Authentication > Sign In / Providers > Email**: leave **Email OTP Length** at 6. Set **Email OTP Expiration** to about 900 seconds (15 minutes) if you want codes to expire sooner than the default hour.
3. Do Steps 1 and 2 above first. Supabase's built-in sender allows only a few emails an hour, so codes (and sign-up confirmations) would arrive late or not at all.
4. Test with your own account: Log in tab > Forgot password > your email > type the code. You should land on "Choose a new password".

Good to know:
- A code can only sign in an account that already exists. It never creates one, so new sign-ups still go through the sign-up page and the age check.
- If the email has no account, the screen looks the same as if it did ("If that email has an account, we've sent a code"), so nobody can use it to find out who has an account.
- Someone who signed up but never confirmed their email gets the sign-up confirmation email instead (a link, not a code). The "Send it again" button on the Check your email page is the way for them.
- Supabase allows one code per address per minute, so the app counts down 60 seconds before "Send a new code" works.
- Anyone can ask for a code for any email address. That is the same as every "forgot password" form, and the code goes only to that inbox. The Cloudflare Turnstile item in `docs/TODO.md` is the extra protection against someone spamming it.

## Later: follow notifications
The same email service can send "X started following you" emails. See the TODO item "Email service (follows and sign-in)".
