# DiamondHub — Game Top-Up Platform

## Quick start (local)
```bash
cp .env.example .env          # then edit NEXTAUTH_SECRET and WEBHOOK_SECRET
docker compose up -d db       # PostgreSQL only
npm install
npx prisma db push
npm run db:seed               # sample games, packages, admin user
npm run dev                   # http://localhost:3000
```
Admin login (from seed): value of ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD in `.env`. Change it immediately.

## Full Docker
```bash
docker compose up -d --build
```

## Build roadmap
1. Project setup + DB schema (done)
2. Provider adapters + mock APIs
3. User pages
4. Checkout + order flow
5. Admin panel
6. Security + deployment

## How to replace the APIs
Added in step 2.
