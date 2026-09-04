# 🛠️ ReviewIQ — Main Backend API (`amaliya-backend`)

The **ReviewIQ Main Backend** is built with **NestJS**, **Prisma ORM**, **PostgreSQL**, and **Redis**. It manages user authentication, team organization, subscription plans, billing, notification dispatching, and cron scheduling.

---

## ⚡ Quick Start

### 1. Start PostgreSQL & Redis
```powershell
docker compose --profile dev up -d
```

### 2. Environment Configuration
Ensure `.env` exists in `amaliya-backend/`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/reviewiq?schema=public
REDIS_HOST=localhost
REDIS_PORT=6380
ANALYTICS_BUSINESSES_URL=http://localhost:8000/businesses
```

### 3. Database Migration & Seed
```powershell
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
The API server will listen on `http://localhost:3001` (or port specified in `.env`).

---

## 📁 File Structure

```
src/
├── modules/                        # Feature Modules
│   ├── auth/                       # Authentication (JWT, Refresh Tokens, OAuth)
│   ├── user/                       # User management & profile settings
│   ├── subscription/               # Subscription plans, Stripe/Payment limits
│   ├── notification/               # In-app notifications & WebSockets
│   ├── auto-analyses/              # Scheduled Cron Jobs calling AI service
│   ├── mail/                       # Email dispatching (Nodemailer)
│   ├── contact-us/                 # Helpdesk contact forms
│   └── system/                     # Global system settings & health checks
│
├── config/                         # Environment & App Configurations
├── prisma/                         # Prisma Client Service & Global Module
└── main.ts                         # Application Entrypoint
```

---

## 🗄️ PostgreSQL Database Models (Prisma)

- **`User`**: Account ID, name, email, password hash, role (`USER`, `ADMIN`, `SUPER_ADMIN`), notification settings, status (`ACTIVE`, `SUSPEND`).
- **`Subscription` & `Plan`**: Pricing tiers, interval (`MONTHLY`, `YEARLY`), payment card data, subscription end dates, active status.
- **`Notification`**: In-app notifications, read/unread states, alert timestamps.
- **`SupportTicket`**: Help tickets, messages, resolution status (`OPEN`, `CLOSED`, `IN_PROGRESS`).
- **`Activity`**: Audit trail logs for user & admin actions.
