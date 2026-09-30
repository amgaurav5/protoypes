# Orbit — AI-native revenue workspace

Orbit is an early CRM build. Company, contact, deal, and task forms now create workspace records; companies include clickable website URLs. CRM tasks and deal-stage updates save to Supabase when configured, with browser-local storage as a development fallback. ViaSocket connection prompts are action-aware, but Gmail, Calendar, and Slack execution is still unavailable pending their exact published action schemas.

## Run locally

This project is a static frontend plus Vercel serverless functions. The sign-in screen requires the Vercel function `/api/auth-config` and the Supabase settings below; opening `index.html` directly will not provide authentication.

## What works today

- Responsive revenue dashboard with pipeline, deal watchlist, and activity feed
- Create company records with websites, contacts, deals, and tasks
- Persistent task list with open/done state; onboarding creates eight visible CRM task records
- Supabase workspace reads/writes when the configured migration is applied; account-scoped browser storage fallback
- Searchable deal list
- Model-free Orbit command planner that matches CRM requests against 100 built-in examples and previews supported changes
- Keyboard shortcut `Ctrl/Cmd + K` to focus the AI command

## Current limitations

The sign-in UI uses Supabase Auth (email/password, email confirmation, password reset, PKCE session flow). A signup trigger creates a private workspace and membership. `supabase/migrations/202609300001_initial_crm.sql` adds workspace-scoped CRM, approval, integration, and audit tables with row-level security. Apply and review this migration in your Supabase project before launch.

Orbit no longer uses an OpenAI API key. Its 100 built-in CRM prompt examples guide a deterministic intent matcher; this is example-based behavior, not machine-learning model training, and it only supports actions implemented in the planner. It proposes actions and only changes CRM records after approval. ViaSocket connections can be started for the requested app, but connected apps are not action-enabled: exact action schemas and a server-side runner are required before any external action can run. The ViaSocket connect popup may display its default action selection; this project has no documented API to narrow that selector. External actions remain visibly pending after connection. Team invitation/role enforcement, durable action approvals, monitoring, backup/recovery, and security review remain before production launch.

## Authentication setup (Vercel + Supabase)

1. Create a Supabase project and apply `supabase/migrations/202609300001_initial_crm.sql` in its SQL Editor.
2. In Supabase Auth, set the Site URL to the deployed app URL and add that URL (and your local development URL) to allowed redirect URLs. Configure email confirmation and password rules to match your account policy.
3. In Vercel Project Settings → Environment Variables, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Production (the publishable/anon client key is intended for browser use; never use a service-role key here).
4. Redeploy. Visit the deployed URL, create an account, and confirm the email. Each signup gets an isolated starter workspace.

`api/auth-config.js` returns only the Supabase URL and public client key. Supabase RLS is the database access boundary. Do not add a service-role key to frontend variables. For a custom domain, register its URL with Supabase Auth before enabling sign-in there.

## ViaSocket setup

The integrations panel uses ViaSocket's Apps API connection flow, keeping Orbit's UI and action approval experience. Gmail is recommended first for the customer welcome email, with Google Calendar for kickoff scheduling and Slack for an internal Customer Success handoff.

For a Vercel deployment, configure these server environment variables in Production:

- `VIASOCKET_ORG_ID=18536`
- `VIASOCKET_PROJECT_ID=projQUUUSADm`
- `VIASOCKET_EMBED_SECRET` set to the workspace Embed Secret

Never put the embed secret in client-side JavaScript or commit it. The `api/viasocket-token.js` function verifies the Supabase access token with Supabase Auth and signs a ViaSocket embed JWT whose identity is the authenticated user ID. `api/viasocket-apps.js` resolves app IDs from ViaSocket's catalog and does not guess them. The browser currently stores connection IDs scoped to the signed-in user; production should persist them against the authenticated workspace in the database.

The project copy of the integration skill is `.claude/skills/viasocket-integrations/SKILL.md`. Fetch and follow the specific app document before implementing or claiming any external action; action version IDs and input field keys must come from that document.

## Remaining production work

Add exact ViaSocket app action schemas and a server-side, durable action executor before sending mail, creating calendar events, or posting Slack messages. CRM changes are approval-gated and workspace-scoped. Add durable approval records, team invitations, authorization checks, backups, monitoring, rate limits, privacy/retention controls, and operational recovery before representing the product as production-ready.

## Hosting

Vercel serves the static app and its API functions. A production launch still depends on the Supabase project, Vercel environment configuration, and the remaining CRM/AI/action execution work listed above.
