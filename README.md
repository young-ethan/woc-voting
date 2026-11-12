# WOC Admin Dashboard — Stage 2

This package **adds** the admin dashboard to your existing GitHub Pages site. Do not delete or overwrite your existing `index.html`, `style.css`, `script.js`, `config.js`, or `assets` folder.

## 1. Upload files to GitHub
Upload `admin.html`, `admin.css`, `admin.js` to the **root** of the existing repository. Upload `supabase/functions/manage-unixes/index.ts` and `supabase/admin-setup.sql` to the matching paths (optional as backups; they are NOT automatically deployed by GitHub Pages).

Your existing `config.js` must contain `window.WOC_CONFIG = { supabaseUrl: 'https://YOUR-PROJECT.supabase.co', supabasePublishableKey: 'sb_publishable_...' };`.

## 2. SQL setup
In Supabase → SQL Editor, run the contents of `supabase/admin-setup.sql` once. Your existing `public.unixes` table must already exist.

## 3. Create administrator login
In Supabase → Authentication → Users, add/invite your administrator email and set up a password. For a small club, disable public email signups under Authentication settings so only manually created users can log in. You must also explicitly allowlist the admin email in Step 4.

## 4. Deploy Edge Function
In Supabase → Edge Functions, create a function named **manage-unixes** and paste `supabase/functions/manage-unixes/index.ts`. Deploy it. In function settings, **disable Verify JWT**: the function verifies the signed-in user's token itself via `auth.getUser()` and separately checks an allowlist. In Edge Functions → Secrets, set `ADMIN_EMAILS` to your administrator email address (comma-separated for multiple admins). Supabase normally provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions automatically. Never paste the service-role key into your GitHub site.

## 5. Open dashboard
Visit `https://YOUR-USERNAME.github.io/YOUR-REPO/admin.html` and sign in with the administrator credentials. The dashboard lets you paste codes, upload a CSV, add one, remove one, and replace the entire list.

CSV examples:
```
unix
ejy2
abc7
xyz9
```
Or a single-column CSV without a header.

## Important limitations
- The dashboard protects admin operations via Supabase Auth and a server-side email allowlist. RLS on `public.unixes` should remain enabled with no public read/write policies.
- **Replace entire list** is destructive and should only be used between elections. It changes the existing list; it does not archive results or reset future ballot tables.
- Your existing voter `validate-unix` function only checks whether a code exists. It does **not** establish a secure ballot session, limit guesses, or enforce one vote per unix. Add those before conducting a real election.
- Unixes are limited to 4–32 lowercase letters/numbers, matching the existing validation function.
