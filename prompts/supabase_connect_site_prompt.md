# Prompt: Build a “Connect Supabase to CodeX” Documentation Site

Use this prompt in your site generator (e.g., v0) to create a single-page documentation site. The content below is the full spec and copy requirements.

---

## Project

- Title: Connect Supabase to CodeX
- Audience: Indie developers and small teams
- Style: Clean, developer-first, dark mode by default, accessible (WCAG AA)
- Tech output: Responsive static page (HTML/CSS or TSX), with code blocks, callouts, and checklists.
- Branding: Use “CodeX” everywhere. Do NOT mention Dyad.
- Primary CTAs: “Open CodeX” and “Open Supabase”
- Accent color: `#6366F1`

## Goals

- Explain how to connect a Supabase project to the CodeX desktop (Electron) app.
- Provide both a 5‑min Quick Start and a Deep Dive.
- Include exact deep link details that CodeX listens for.
- Include security best practices and troubleshooting.

## Sitemap / Sections

1. Hero
2. Prerequisites
3. Quick Start (5 minutes)
4. Deep Dive
   - Create Supabase Project
   - Configure Auth
   - Database and SQL
   - Storage (optional)
   - API Keys and Redirect URLs
5. Connect Inside CodeX (App Steps)
6. Environment Variables Mapping
7. Deep Link Spec (Electron)
8. Testing the Connection
9. Troubleshooting
10. FAQ

## Technical Details (Use Exactly)

- CodeX is an Electron app that registers and listens for the deep link protocol `codex://`.
- The Supabase OAuth return deep link is: `codex://supabase-oauth-return`.
- On success, CodeX expects three query parameters: `token`, `refreshToken`, `expiresIn` (seconds).
- The CodeX main process handles the return, updates session state, and refreshes the UI.

### Deep link (for reference)

- Protocol: `codex`
- Hostname: `supabase-oauth-return`
- Required query params: `token`, `refreshToken`, `expiresIn`
- Example:
  ```text
  codex://supabase-oauth-return?token=eyJhbGciOi...&refreshToken=eyJhbGciOi...&expiresIn=3600
  ```

## Prerequisites (Checklist)

- Supabase account
- Supabase project (Organization → New project)
- Region: nearest to your users
- Database password: store securely

## Quick Start (Copy/Paste)

1. Create a project in Supabase.
2. Go to Project Settings → API, copy:
   - Project URL (REST URL)
   - anon public key
   - service_role key (store securely; NEVER ship to the client)
3. Go to Authentication → URL Configuration → Add redirect URL(s):
   - `codex://supabase-oauth-return`
   - (Optional dev) `codex://supabase-oauth-return?env=dev`
4. In CodeX, open Settings → Integrations/Providers → Supabase and paste:
   - `SUPABASE_URL` = <Project URL>
   - `SUPABASE_ANON_KEY` = <anon key>
   - (Optional) `SUPABASE_SERVICE_ROLE_KEY` for your own server-side jobs (not used in the client)
5. Click “Test Connection” → expect “Connected”.

## Deep Dive

### Create Supabase Project

- Show steps with screenshots placeholders.

### Configure Auth

- Enable Email/Password (and optional OAuth providers).
- Redirect URL(s) must include `codex://supabase-oauth-return`.
- Supabase manages session; CodeX consumes `token`, `refreshToken`, `expiresIn` from the deep link.

### Database & SQL (Example)

```sql
create table if not exists codex_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

alter table codex_apps enable row level security;
create policy "Authenticated can read" on codex_apps
  for select
  using (auth.uid() is not null);
```

### Storage (Optional)

- Create a bucket `codex`.
- Choose public or JWT‑gated depending on needs.

### API Keys & Redirect URLs (Rules)

- Required in client: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Never embed `service_role` in CodeX or any client app.
- Always add `codex://supabase-oauth-return` in Auth → URL Configuration.

## Connect Inside CodeX (App Steps)

- Open CodeX → Settings → Integrations → Supabase.
- Paste `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Save → Test Connection.
- For OAuth inside CodeX, the browser flow completes and returns to `codex://supabase-oauth-return` automatically.

## Environment Variables Mapping (Table)

| Variable                    | Where to find in Supabase                  | Notes                            |
| --------------------------- | ------------------------------------------ | -------------------------------- |
| `SUPABASE_URL`              | Project Settings → API → Project URL       | REST base URL                    |
| `SUPABASE_ANON_KEY`         | Project Settings → API → `anon` public key | Safe for client use with RLS     |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role`    | Server-side only, never in CodeX |

## Deep Link Spec (Electron)

- Protocol: `codex`
- Callback URL: `codex://supabase-oauth-return`
- Params: `token`, `refreshToken`, `expiresIn`

## Testing the Connection

- From CodeX: Click “Test Connection”.
- From terminal (sanity check):
  ```bash
  curl -H "Authorization: Bearer <anon_key>" \
    "<SUPABASE_URL>/rest/v1/codex_apps?select=*"
  ```
  Expect `200 OK` and an array (possibly empty).

## Troubleshooting (Callouts)

- Invalid redirect: Ensure `codex://supabase-oauth-return` is added in Auth → URL Configuration.
- 401 Unauthorized: Verify anon key and REST URL.
- macOS deep link not opening CodeX: Move app to Applications, then reopen.
- Windows protocol not registered: Relaunch CodeX (or reinstall if needed).
- Never ship `service_role` to clients. Use on a server/Cloud Functions instead.

## FAQ

- Do I need a backend? Not for basic read flows with RLS; anon key is sufficient. Use server-side functions for privileged operations.
- Multiple environments? Use separate Supabase projects/keys and keep per‑env profiles in CodeX.
- Key rotation? You can rotate anon/service_role in Supabase and update CodeX settings.

## Design Notes

- Dark theme, large code blocks, numbered lists, and success/error callouts.
- Sticky right panel with a ready-to-copy `.env` snippet:
  ```env
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=eyJhbGciOi...
  # server-side only
  SUPABASE_SERVICE_ROLE_KEY=...
  ```
- Two prominent buttons: “Open Supabase Console” and “Open CodeX”.
- Include meta tags (title, description, og/twitter) for sharing.

---

### Deliverables for the AI

- A single responsive page (HTML/CSS or TSX) containing all sections and copy above.
- Placeholder images for screenshots with helpful alt text.
- Mobile friendly, accessible, copy‑edited, production‑ready.
