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
  - `hooks/` — use-auth, use-settings, use-bills, use-expenses, use-goals
  - `lib/api-fetch.ts` — Authenticated fetch utility (X-Auth-Token header)
  - `lib/budget-utils.ts` — Core calculation functions
  - `lib/constants.ts` — PHASE1_ALLOCS, PHASE2_ALLOCS, fallback values
- `Budget-Manager/server/` — Express backend (auth, routes, storage, db)
- `Budget-Manager/shared/schema.ts` — Drizzle schema + Zod validators

## Auth System
- Token-based auth (random token stored in localStorage, sent via X-Auth-Token header)
- Tokens stored in-memory Map in server/auth.ts (reset on server restart)
- iCloud Keychain + Face ID via Safari's password autofill

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
- **Export to CSV**: Download expenses as CSV from History tab
- **Goals Pool gauge**: Green gauge showing how the pool fills toward total goals cost
- **Sweep surplus button**: One tap adds monthly leftover + unused fun budget to Goals Pool
- Safe-to-spend, daily spend, calendar, advisor insights

## Workflow
`cd Budget-Manager && npm run dev` — starts dev server on port 5000
