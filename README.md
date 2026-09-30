# Orbit — AI-native revenue workspace

Orbit currently opens directly into a local demo workspace without a sign-in screen. Company, contact, deal, and task forms work, and changes persist in the current browser only. They are not synced to an account or shared between devices.

## Run locally

This project is a static frontend plus Vercel serverless functions. The current deployment does not require sign-in and uses browser-local demo data.

## What works today

- Responsive revenue dashboard with pipeline, deal watchlist, and activity feed
- Create company records with websites, contacts, deals, and tasks
- Persistent task list with open/done state; onboarding creates eight visible CRM task records
- Browser-local persistence for this demo (records do not sync across browsers or devices)
- Searchable deal list
- AI command panel remains visible; planning requires authenticated Supabase storage and a server-side OpenAI key
- Keyboard shortcut `Ctrl/Cmd + K` to focus the AI command

## Current limitations

The current local demo does not authenticate users. `supabase/migrations/202609300001_initial_crm.sql` defines workspace-scoped CRM, approval, integration, and audit tables with row-level security for a future authenticated build.

The planner requires `OPENAI_API_KEY` on the server. It proposes actions and only changes CRM records after approval. ViaSocket connections can be started for the requested app, but connected apps are not action-enabled: exact action schemas and a server-side runner are required before any external action can run. The ViaSocket connect popup may display its default action selection; this project has no documented API to narrow that selector. External actions remain visibly pending after connection. Team invitation/role enforcement, durable action approvals, monitoring, backup/recovery, and security review remain before production launch.

## Authentication setup (Vercel + Supabase)

1. Create a Supabase project and apply `supabase/migrations/202609300001_initial_crm.sql` in its SQL Editor.
2. In Supabase Auth, set the Site URL to the deployed app URL and add that URL (and your local development URL) to allowed redirect URLs. Configure email confirmation and password rules to match your account policy.
3. In Vercel Project Settings → Environment Variables, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Production (the publishable/anon client key is intended for browser use; never use a service-role key here).
4. Add `OPENAI_API_KEY` as a server environment variable. `OPENAI_MODEL` is optional and defaults to `gpt-5-mini`.
5. Restore the authentication flow, redeploy, create an account, and confirm the email. Each signup should get an isolated starter workspace.

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

The local demo does not authenticate users or enable the AI planner and app connections. Add Supabase Auth and cloud storage, then add exact ViaSocket app action schemas and a server-side, durable action executor before sending mail, creating calendar events, or posting Slack messages. Add durable approval records, team invitations, authorization checks, backups, monitoring, rate limits, privacy/retention controls, and operational recovery before representing the product as production-ready.

## Hosting

Vercel serves the static app and its API functions. A production launch still depends on the Supabase project, Vercel environment configuration, and the remaining CRM/AI/action execution work listed above.
