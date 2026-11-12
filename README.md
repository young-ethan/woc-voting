# WOC Voting Portal — Stage 1

This is a GitHub Pages-compatible site using WOC's supplied logo and photograph.

## Files for GitHub

Upload `index.html`, `style.css`, `script.js`, `config.js`, and the entire `assets/` folder to the **root** of your GitHub repository. The `supabase/` folder can also be committed for backup, but is not used by GitHub Pages.

## Supabase setup

1. Keep the `public.unixes` table you already created (with `unix text not null unique` and RLS enabled).
2. In Supabase > SQL Editor, run the contents of `supabase/setup.sql` once to install the basic attempt limiter.
3. In Supabase > Edge Functions, create a function named **validate-unix** and paste in the contents of `supabase/functions/validate-unix/index.ts`. Deploy it. For this public login endpoint, **disable Verify JWT** in its settings (it uses a public publishable key and has its own server-side checks). Do not turn off RLS for the unixes table.
4. In Supabase > Project Settings > API Keys, copy your **publishable** key (`sb_publishable_...`; legacy `anon` is also acceptable if applicable). In Project Settings find your **Project URL** (`https://...supabase.co`).
5. In GitHub's `config.js`, replace the two placeholders with those values. **Never use a secret/service_role key in GitHub.**
6. In GitHub > Settings > Pages, set **Deploy from a branch**, branch **main**, folder **/(root)**, and Save.

## Current behaviour and limitations

- A valid unix displays a success placeholder; an invalid unix displays an error.
- This stage **does not create a trusted voter session, prevent duplicate voting, or securely authorize ballots**. Do not build a real ballot by simply hiding HTML based on the returned `valid` flag. We will add server-side ballot authorization and one-vote-per-unix rules in the ballot stage.
- Basic rate limiting is 10 attempts per 15-minute window per IP. It can affect shared networks and is not bot-proof.
- `config.js` contains only public configuration. The Supabase service-role key remains only in the Edge Function's server-side environment.
- The `unix_attempt_limits` table will grow over time; periodically clear old entries from SQL Editor if desired.
- Make sure you have permission to publish the supplied photograph on the public website.
