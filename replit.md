# Budget Manager

A personal finance and budgeting web app designed for iPhone & iPad, built with React + TypeScript + Express + PostgreSQL.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Recharts
- **Backend**: Express.js, Passport.js (local auth), express-session
- **Database**: PostgreSQL via Drizzle ORM
- **Build**: Vite, tsx

## Project Structure
- `Budget-Manager/client/src/` — React frontend
  - `pages/AuthPage.tsx` — Login / Create Account screen
  - `pages/OnboardingPage.tsx` — New user setup questionnaire
  - `pages/Home.tsx` — Main app shell with tabs
  - `components/` — Tab components (Dashboard, Advisor, Budget, Bills, Goals, History, Log, Tools, Calendar)
  - `hooks/` — use-auth, use-settings, use-bills, use-expenses, use-goals, use-templates, use-accounts
  - `lib/api-fetch.ts` — Authenticated fetch utility (X-Auth-Token header)
  - `lib/budget-utils.ts` — Core calculation functions
  - `lib/constants.ts` — PHASE1_ALLOCS, PHASE2_ALLOCS, fallback values
  - `lib/bill-notifications.ts` — Browser notification helpers for bill reminders
  - `lib/csv-utils.ts` — CSV export builder + bank CSV parser
- `Budget-Manager/server/` — Express backend (auth, routes, storage, db)
- `Budget-Manager/shared/schema.ts` — Drizzle schema + Zod validators
- `Budget-Manager/shared/routes.ts` — Typed API routes shared with frontend

## Auth System
- Token-based auth (random token stored in localStorage, sent via X-Auth-Token header)
- Tokens persisted in the `users.token` DB column — survive server restarts and autoscale deployments
- iCloud Keychain + Face ID via Safari's password autofill

## Database Tables
- `users` — accounts
- `settings` — per-user financial settings and fund balances
- `expenses` — logged expense transactions
- `recurring_bills` — monthly bills with paidMonth tracking
- `unlocked_goals` — future savings goals with `contributed` field for per-goal funding
- `expense_templates` — saved quick-add shortcuts for common expenses
- `monthly_snapshots` — archived spending history saved on monthly reset
- `bank_accounts` — user-added accounts (checking, savings, credit cards, etc.) with balance and type
- `unlocked_goals` new fields: `targetDate` (text, nullable), `locked` (boolean)

## Settings Schema Fields
- `paycheck`, `checkingBalance`, `nextPayday`, `phase`
- `emergencyFund`, `apartmentFund`, `debtPaid`, `savingsFund`, `rolloverPool`
- `totalDebt`, `emergencyGoal`, `apartmentGoal` — per-user targets set during onboarding
- `bigGoalName` — custom label for the middle progress ring (default "Big Goal")

## Key Features
- **Dual-phase strategy**: Debt Focus vs Growth Focus
- **3 progress rings**: Emergency Fund, custom Big Goal (user-named), Debt Cleared
- **Auto-deduct**: Logging an expense automatically deducts from checking balance
- **New Paycheck flow**: Updates balance + payday, optionally sweeps surplus to Goals Pool, resets month
- **Debt payoff countdown**: Calculates exact debt-free month based on monthly payment
- **Mark bills as paid**: Tap circle on any bill to mark paid this month; resets on monthly reset
- **Spending breakdown chart**: Recharts bar chart in History tab by category
- **Export to CSV**: Download current-cycle expenses or past monthly snapshots as CSV from History tab
- **Bank account tracking**: Add checking, savings, credit cards, and investments in Tools tab; net balance shown on Dashboard
- **Bill reminders (push notifications)**: Toggle in Tools tab; fires browser notifications for bills due within 3 days; pref stored in localStorage
- **Bank CSV import**: Upload a bank statement CSV in Tools tab; auto-detects date/description/amount columns; preview with category assignment per row; bulk-imports as expenses
- **Monthly Surplus Tracker**: Dashboard "Month Summary" card shows budgeted vs actual spending, surplus/deficit, and which top-priority goal the surplus redirects to with progress bar
- **Goal Priority System**: Goals sorted High → Medium → Low; colored priority badges; "Next up" badge on highest-priority unfunded goal; surplus sweep shows redirect target
- **Auto-allocate**: One-tap button distributes Goals Pool balance to goals in priority order, skipping locked goals
- **Smart Deadline Planning**: Optional target date per goal; shows required monthly saving, months left, and on-track/behind-schedule indicator
- **Goal Locking**: Lock toggle per goal (prevents auto-allocation); locked goals show lock icon badge; lock state persists in DB
- **Financial Health Score**: Already live in Advisor tab (0-100 score, A-F grade, 4 dimensions: bills paid, emergency fund, debt progress, budget health)
- **Goals Pool gauge**: Green gauge showing how the pool fills toward total goals cost
- **Sweep surplus button**: One tap adds monthly leftover + unused fun budget to Goals Pool
- **Per-goal contributions**: Track how much of the pool is earmarked for each specific goal
- **Monthly history**: Past months archived on reset, viewable in History > Past Months with charts
- **Recurring expense templates**: Save common expenses as quick-tap shortcuts in Log tab
- **Bill-due reminders**: Dashboard shows dismissable banner when bills are due within 3 days
- **Pay cycle progress bar**: Visual bar showing how far through the pay cycle you are, with daily burn rate
- **Calendar improvements**: Payday marked in green, paid bills shown with checkmarks, legend
- **Change password**: In Tools tab, secured with current password verification
- **Delete account**: In Tools tab, requires typing "DELETE" to confirm
- **Net worth snapshot**: Dashboard shows total assets minus total debt with checking balance front and center
- **Expense search**: Filter expense history by name or category
- **Inline delete confirmations**: Bills, goals, and expenses all ask "Yes/No" before deleting
- **Toast notifications**: All actions show slide-in toasts (5 second auto-dismiss) instead of browser alerts
- **iOS-style bottom nav**: Fixed tab bar at the bottom with icon + label for each tab, badge dot on Bills when due
- **Financial Health Score**: Advisor tab shows 0-100 score (A-F grade) across 4 dimensions: bills paid, emergency fund, debt progress, budget health
- Safe-to-spend, daily spend, calendar, advisor insights, debt countdown

## Deployment
- Target: autoscale
- Build: `cd Budget-Manager && npm run build` → dist/index.cjs
- Run: `cd Budget-Manager && npm run start` → NODE_ENV=production node dist/index.cjs

## Workflow
`cd Budget-Manager && npm run dev` — starts dev server on port 5000
