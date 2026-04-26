# VCU University Menu System Report

Relevant docs:
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Stripe Checkout: https://docs.stripe.com/checkout/quickstart
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Cursor plugins: https://cursor.com/docs/plugins.md
- Cursor plugin reference: https://cursor.com/docs/reference/plugins

## Implemented Controls

- `src/shell/shellMenuContract.ts` adds `vibe-coding-university` and `university` menu content support.
- `src/shell/shellMenuRegistry.ts` adds a Supabase-seedable VCU shell menu with Introduction, Coursework, Vibe Code Lab, Cursor Instructions, and Registration/Payment actions.
- `src/shell/intentManager.ts` maps VCU actions into the existing learning, coding, and account intent sub-paths.
- `src/App.tsx` routes VCU menu actions into the authenticated AI OS desktop or the auth panel for guests.
- `src/components/shell/VirtualDesktopEnvironment.tsx` accepts shell launch requests and opens the VCU desktop window to the requested view.
- `src/components/shell/VibeCodingUniversityPanel.tsx` renders the introduction, coursework by lesson, lab, Cursor instructions/plugin install guidance, and registration/payment status.
- `supabase/migrations/003_vcu_university_access.sql` adds program, enrollment, Stripe customer/subscription mirror, billing event, and Cursor plugin package registry tables with RLS.
- `supabase/functions/vcu-create-checkout-session/index.ts` creates Stripe Checkout sessions from authenticated Supabase users.
- `supabase/functions/stripe-webhook/index.ts` verifies Stripe webhook signatures and mirrors subscription/enrollment state.
- `docs/vcu/cursor-plugin/vcu-lesson-support/` contains the self-managed Cursor plugin package structure.
- `src-tauri/resources/shell_menu_registry.json` was regenerated from the static shell registry.

## No-Mock Gate

No per-lesson artifacts, fake checkout sessions, fake webhook events, fake install logs, fake test logs, or fabricated access state were created. Runtime billing and access remain unverified until deployed and tested with real Stripe/Supabase events.

## Verification Performed

- AI OS Supabase migrations applied successfully:
  - `supabase/migrations/001_initial_schema.sql`
  - `supabase/migrations/002_vcu_university_schema.sql`
  - `supabase/migrations/003_vcu_university_access.sql`
- Post-migration schema verification confirmed these objects exist: `public.users`, `public.shell_menus`, `public.university_courses`, `public.university_programs`, `public.stripe_subscriptions`, `private.is_admin()`, and `public.handle_updated_at()`.
- `npm run seed:supabase -- --dry-run` completed successfully before write mode.
- `npm run seed:supabase` completed successfully against the AI OS Supabase project.
- Seed verification counts:
  - `shell_menus`: 9
  - `shell_menu_items`: 53
  - `university_courses`: 4
  - `university_lessons`: 16
  - `university_lesson_artifacts`: 64
  - `vcu_behavior_artifacts`: 16
  - `university_programs`: 1
  - `cursor_plugin_packages`: 1
  - `agent_skills`: 3
  - `mcp_sdk_registry`: 4
- `npm run export-shell-menu-registry` completed and rewrote `src-tauri/resources/shell_menu_registry.json`.
- `npm run typecheck` completed successfully.
- `npm run build` completed successfully.
- Cursor IDE diagnostics reported no linter errors for touched files.

## Remaining Unverified

- Supabase Edge Functions have not been deployed.
- Stripe secrets, webhook endpoint, and price lookup key `vcu_monthly` have not been configured or verified.
- Checkout and webhook flows have not been tested with real Stripe events.
- Cursor plugin package has not been installed into `~/.cursor/plugins/local/vcu-lesson-support` and observed inside Cursor.
- VCU access still depends on a real Supabase Auth session; the current OTP/localStorage app auth is not a Stripe billing identity by itself.
