# Budget Manager

A personal finance and budgeting web app designed for iPhone & iPad, built with React + TypeScript + Express + PostgreSQL.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Framer Motion
- **Backend**: Express.js, Passport.js (local auth), express-session
- **Database**: PostgreSQL via Drizzle ORM
- **Build**: Vite, tsx

## Project Structure
- `Budget-Manager/client/src/` — React frontend
  - `pages/AuthPage.tsx` — Login / Create Account screen
  - `pages/Home.tsx` — Main app shell with tabs
  - `components/` — Tab components (Dashboard, Advisor, Budget, etc.)
  - `hooks/` — use-auth, use-settings, use-bills, use-expenses, etc.
- `Budget-Manager/server/` — Express backend (auth, routes, storage, db)
- `Budget-Manager/shared/schema.ts` — Drizzle schema + Zod validators

## Key Features
- Dual-phase strategy: Debt Focus vs Growth Focus
- Safe-to-spend and daily spend calculations
- Progress rings for Emergency Fund, Apartment Fund, Debt Cleared
- Expense/bill logging, history, goals, calendar, advisor
- iCloud Keychain + Face ID support via Safari autocomplete

## Workflow
`cd Budget-Manager && npm run dev` — starts dev server on port 5000
