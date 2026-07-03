# Project Structure

This project uses Expo Router, so files inside `app/` define navigation routes. Most implementation code lives outside `app/` in feature-first folders.

## Route Layer

- `app/(tabs)/`: main tab screens for overview, history, budget, goals, insights, hidden profile/category/savings routes, and tab layout.
- `app/accounts.tsx`: account management route.
- `app/recurring.tsx`: recurring income and bill management route.
- `app/ai-agent.tsx`: AI finance review chat route.
- `app/analytics.tsx`: legacy analytics/export route.
- `app/login.tsx`: Supabase authentication route.
- `app/_layout.tsx`: root providers, auth routing, notification handler, and stack registration.

Route files should stay thin: they can own screen-local form state, but shared business logic should live in `features/`.

## Feature Layer

- `features/finance/`: the main finance domain. It owns finance screens, finance types, Supabase repository logic, overview hooks, transaction/category/account/budget/goal/recurring calculations, icons, and finance-specific UI components.
- `features/assistant/`: AI review and budget-planning chat, finance context builder, response parser, and report renderers.
- `features/reports/`: CSV and PDF export helpers.
- `features/auth/`: Supabase sign-in, sign-up, sign-out, and session hooks.
- `features/settings/`: profile/settings screen that connects auth actions, account shortcuts, recurring-bill shortcuts, and local reminder preferences.

## Shared Layer

- `shared/ui/`: reusable UI controls and alerts.
- `shared/components/`: generic Expo starter-style components that are not finance-domain-specific.
- `shared/config/`: app-wide runtime config such as developer vs normal-user variant flags.
- `shared/hooks/`: app-level hooks such as theme, color scheme, and local notification settings.
- `shared/theme/`: static theme constants.
- `shared/store/`: cross-feature UI state.

## Infrastructure And Operations

- `infrastructure/supabase/client.ts`: the configured Supabase client and auth storage adapter.
- `supabase/migrations/`: the fresh-database baseline schema. The current baseline excludes removed import tables and replaces the older split migration history.
- `supabase/functions/`: Edge Functions for backend workflows when needed.
- `scripts/`: local project scripts for assets and maintenance.

## App Variants

- Developer version is controlled by `EXPO_PUBLIC_APP_VARIANT=developer` and `EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS=true`.
- Developer tools are shown in Profile and include Supabase status, Gemini AI status, app version, build channel, and current finance data source.
- Normal-user version uses `EXPO_PUBLIC_APP_VARIANT=normal` and hides developer diagnostics and technical setup wording.

## Import Rules

- Prefer `@/...` aliases over deep relative imports.
- Feature code may import from its own feature, `shared/`, and `infrastructure/`.
- Shared code should not import feature code unless it is a deliberate app-level integration.
- Keep Expo route files in `app/`; moving them changes navigation.
- Keep route files thin. Screen implementation should live under `features/*/screens`.
