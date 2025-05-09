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

### Milestone 6: ✅ Company Management
- Company creation and soft deletion (SUPER admin only)
- Validation for unique company names, plan types, and wheel limits
- Prevention of company deletion when active wheels exist
- Unit tests for company operations

### Milestone 7: ✅ User Management
- User invitation system with temporary password generation
- Email notifications for new user invitations via SMTP.com
- User role management within companies (ADMIN, SUB)
- User listing and soft deletion
- Email uniqueness validation per company
- Unit tests for user management

### Milestone 8: ✅ Integrations
- SMTP.com integration for transactional emails
- Cloudinary integration for asset storage
- Mocked integrations for testing
- Unit tests for integrations

### Milestone 9: ✅ Leads & Analytics
- Lead capture during wheel plays (name, email, phone, birthDate)
- JSON and CSV export of leads data (PREMIUM plan only)
- Date range filtering for analytics
- Enhanced statistics with date filtering
- Unit tests for leads and analytics features

### Milestone 10: ✅ Super Admin Console
- Plan management for companies (BASIC, PREMIUM)
- Maximum wheels limit configuration
- Automatic feature restriction based on plan type
- Unit tests for super admin operations

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Companies
- `GET /companies` - List all companies (SUPER)
- `POST /companies` - Create a company (SUPER)
- `PUT /companies/:companyId` - Update a company (SUPER)
- `DELETE /companies/:id` - Soft delete a company (SUPER)
- `PATCH /companies/:id/plan` - Update company plan and maxWheels (SUPER)
- `GET /companies/:companyId/statistics` - Get company statistics (ADMIN+)

### Users
- `GET /companies/:cid/users` - List company users (ADMIN+)
- `POST /companies/:cid/users` - Invite a new user (ADMIN)
- `PUT /companies/:cid/users/:uid` - Update user role or status (ADMIN)
- `DELETE /companies/:cid/users/:uid` - Soft delete a user (ADMIN)

### Wheels
- `GET /companies/:companyId/wheels` - List wheels for a company (ADMIN+)
- `GET /companies/:companyId/wheels/:wheelId` - Get a specific wheel (ADMIN+)
- `POST /companies/:companyId/wheels` - Create a wheel (ADMIN+)
- `PUT /companies/:companyId/wheels/:wheelId` - Update a wheel (ADMIN+)
- `DELETE /companies/:companyId/wheels/:wheelId` - Delete a wheel (ADMIN+)
- `GET /companies/:companyId/wheels/:wheelId/leads` - Get wheel leads in JSON (ADMIN+, PREMIUM)
- `GET /companies/:companyId/wheels/:wheelId/leads.csv` - Get wheel leads in CSV (ADMIN+, PREMIUM)

### Slots
- `GET /companies/:companyId/wheels/:wheelId/slots` - List slots for a wheel (ADMIN+)
- `GET /companies/:companyId/wheels/:wheelId/slots/:slotId` - Get a specific slot (ADMIN+)
- `POST /companies/:companyId/wheels/:wheelId/slots` - Create a slot (ADMIN+)
- `PUT /companies/:companyId/wheels/:wheelId/slots/:slotId` - Update a slot (ADMIN+)
- `DELETE /companies/:companyId/wheels/:wheelId/slots/:slotId` - Delete a slot (ADMIN+)
- `POST /companies/:companyId/wheels/:wheelId/slots/bulk` - Bulk update slots (ADMIN+)

### Play & Prizes
- `POST /companies/:companyId/wheels/:wheelId/play` - Spin the wheel (Public)
- `PUT /plays/:playId/redeem` - Redeem a prize (Public)
- `GET /plays/:playId` - Get play details (Public) 