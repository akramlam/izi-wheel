# IZI Wheel

A prize wheel platform for companies to create customized wheels for their marketing campaigns.

## Project Structure

This is a monorepo using pnpm workspaces with the following structure:

- `/apps/api` - Node.js API with Express, Prisma, and PostgreSQL
- `/apps/web` - React frontend with Vite, TypeScript, Tailwind, and shadcn/ui
- `/packages/common-types` - Shared TypeScript types
- `/packages/tsconfig` - Shared TypeScript configurations

## Setup Instructions

### Prerequisites

- Node.js 20+
- pnpm (install via `npm install -g pnpm`)
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Start the Docker services:

```bash
docker-compose up -d
```

5. Initialize the database:

```bash
pnpm db:init
```

6. Start the development servers:

```bash
pnpm dev
```

### Services

- API: http://localhost:3000
- Web: http://localhost:5173
- MailHog (dev mail): http://localhost:8025

## Tech Stack

- **Backend**: Node.js 20 + Express + Prisma ORM + PostgreSQL 15
- **Auth**: JWT + BCrypt, RBAC (SUPER, ADMIN, SUB roles)
- **Cache / Rate-limiting**: Redis
- **Mail**: SMTP.com (production), MailHog (development)
- **QR Generation**: qr-image npm package
- **Storage**: Cloudinary
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Wheel Component**: react-custom-roulette
- **Charts**: Chart.js via react-chartjs-2
- **CI/CD**: GitHub Actions → Render (API) + Vercel (front)

## Milestone Progress

### Milestone 1: ✅ Scaffold
- Monorepo structure (`/apps/api`, `/apps/web`, `/packages/tsconfig`)
- `.env.example` & `docker-compose.yml` (postgres, redis, mailhog)
- ESLint + Prettier configs

### Milestone 2: ✅ Database & Prisma Schema
- Implemented models for Company, User, Wheel, Slot, Play, and Prize
- Seed script for SUPER user, demo company, demo wheel with 8 slots
- Database initialization and migration scripts
- Schema validation tests

### Milestone 3: ✅ Auth & RBAC
- JWT-based authentication with login/register endpoints
- Role-based access control middleware
- Company-specific resource protection
- Error handling middleware
- Unit tests for authentication

### Milestone 4: ✅ Wheel & Slot CRUD
- RESTful endpoints for wheels and slots
- Nested routes (`/companies/:cid/wheels/*` and slots)
- Validation for probability sum = 100
- Bulk slot creation/update endpoint
- Unit tests for wheel and slot operations

### Milestone 5: ✅ Play & Prize System
- Public endpoint for spinning the wheel (`POST /companies/:cid/wheels/:wid/play`)
- Prize generation with unique PIN and QR code link
- Redis-based rate limiting by IP (daily, weekly, monthly)
- Prize redemption system (`PUT /plays/:playId/redeem`)
- Play history tracking for analytics
- Probability-based random slot selection
- Support for both ALL_WIN and RANDOM_WIN wheel modes
- Comprehensive unit tests 