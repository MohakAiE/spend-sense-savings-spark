# Spend Sense Savings Spark

Create FinWise 2.0, a premium responsive fintech financial-wellbeing web app for teens and young adults. Use React + TypeScript + Tailwind + shadcn/ui frontend and Supabase Auth + PostgreSQL + RLS backend. Source requirements from the user's attached Aarambhathon PPT: smart transactions, AI money assistant, budget planner, financial health view, savings goals and what-if lab, bite-sized financial learning and scam awareness. Core product promise: explain why users spend and what they can do next. Build a polished dashboard with income, expenses, savings, category breakdown, recent transactions, budgets and goals; CRUD transactions; monthly category budgets; savings goals; transparent health indicators; what-if spending simulator; educational safety cards. Use a premium light fintech aesthetic with warm off-white, midnight navy, emerald/teal accents, subtle motion, strong typography, responsive layout. Authenticated user-owned data only; RLS on every user-owned table with auth.uid() ownership checks, including update USING and WITH CHECK. Never expose service role or AI keys in frontend. AI assistant should use a Supabase Edge Function and server-side Gemini secret; if not configured, clearly label deterministic demo mode. Do not collect UPI PINs, OTPs, banking passwords or card credentials. Provide clearly labelled synthetic demo data for judge walkthroughs. Add README with Supabase connection/migration/RLS and Gemini setup. Prioritize a working end-to-end MVP and polished judge demo, not feature sprawl.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1a14df08-9748-4eb7-8433-a324326ac7df).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
