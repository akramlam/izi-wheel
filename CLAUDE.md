# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a pnpm monorepo workspace. Always use pnpm instead of npm.

### Core Commands
- `pnpm install` - Install all dependencies
- `pnpm dev` - Start both API and web development servers
- `pnpm build` - Build both applications
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier

### API-Specific Commands (`apps/api/`)
- `pnpm --filter=@iziwheel/api run dev` - Start API dev server (port 3000)
- `pnpm --filter=@iziwheel/api run test` - Run API tests
- `pnpm --filter=@iziwheel/api run test:cov` - Run tests with coverage
- `pnpm --filter=@iziwheel/api run build` - Build API
- `pnpm --filter=@iziwheel/api run lint` - Lint API
- `pnpm db:init` - Initialize database and seed data

### Database Commands
- `pnpm --filter=@iziwheel/api run migrate` - Run Prisma migrations
- `pnpm --filter=@iziwheel/api run db:seed` - Seed database
- `pnpm --filter=@iziwheel/api run prisma:generate` - Generate Prisma client

### Web App Commands (`apps/web/`)
- `pnpm --filter=@iziwheel/web run dev` - Start web dev server (port 5173)
- `pnpm --filter=@iziwheel/web run build` - Build web app
- `pnpm --filter=@iziwheel/web run lint` - Lint web app

## Project Architecture

### Monorepo Structure
- `/apps/api` - Express.js REST API with Prisma ORM and PostgreSQL
- `/apps/web` - React frontend with Vite, TypeScript, Tailwind CSS, and shadcn/ui
- `/packages/common-types` - Shared TypeScript type definitions
- `/packages/tsconfig` - Shared TypeScript configuration

### Technology Stack

#### Backend (`apps/api/`)
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js with middleware for CORS, rate limiting
- **Database**: PostgreSQL 15 with Prisma ORM
- **Authentication**: JWT tokens with BCrypt hashing
- **Authorization**: Role-Based Access Control (SUPER, ADMIN, SUB)
- **Caching**: Redis for rate limiting and session management
- **Email**: SMTP.com for production, MailHog for development
- **File Storage**: Cloudinary integration
- **QR Code Generation**: qr-image package
- **Testing**: Jest with supertest for integration tests

#### Frontend (`apps/web/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Wheel Component**: react-custom-roulette
- **Charts**: Chart.js via react-chartjs-2
- **Animations**: Framer Motion, canvas-confetti
- **3D Graphics**: Three.js with React Three Fiber

### Key Business Logic

#### Wheel System
- Companies can create multiple wheels with customizable slots
- Two wheel modes: `ALL_WIN` (everyone wins something) and `RANDOM_WIN` (probability-based)
- Slot probabilities must sum to exactly 100%
- Rate limiting prevents spam (daily/weekly/monthly limits per IP)

#### User Roles & Permissions
- **SUPER**: System admin, manages all companies and plans
- **ADMIN**: Company admin, full access within their company
- **SUB**: Sub-admin with limited permissions within company

#### Prize System
- Each play generates a unique PIN and QR code
- Prizes can be redeemed using either PIN or QR code
- Play history tracked for analytics and lead generation

#### Company Plans
- **BASIC**: Limited features and wheel count
- **PREMIUM**: Full features including lead export (JSON/CSV)
- Plan limits enforced automatically

## Development Environment

### Prerequisites
- Node.js 20+
- pnpm
- Docker and Docker Compose

### Local Setup
1. Copy `.env.example` to `.env`
2. Start Docker services: `docker-compose up -d`
3. Initialize database: `pnpm db:init`
4. Start development: `pnpm dev`

### Services (Local)
- API: http://localhost:3000
- Web: http://localhost:5173
- MailHog (email testing): http://localhost:8025
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Testing
- API tests use Jest with supertest for integration testing
- Database operations tested against real PostgreSQL instance
- Authentication and authorization extensively tested
- All CRUD operations have corresponding test coverage

## File Organization

### API Structure (`apps/api/src/`)
- `/routes/` - Express route handlers organized by resource
- `/middleware/` - Authentication, authorization, validation middleware
- `/services/` - Business logic and external service integrations
- `/types/` - TypeScript type definitions
- `/utils/` - Utility functions and helpers
- `/tests/` - Test files mirroring source structure

### Web Structure (`apps/web/src/`)
- `/components/` - Reusable React components
- `/pages/` - Route-based page components
- `/hooks/` - Custom React hooks
- `/services/` - API client and external service integration
- `/types/` - TypeScript type definitions
- `/utils/` - Utility functions

### Database Schema (Prisma)
- **Company**: Multi-tenant organization with plan-based restrictions
- **User**: Role-based users within companies
- **Wheel**: Configurable prize wheels with settings
- **Slot**: Individual wheel segments with prizes and probabilities
- **Play**: User interactions with wheels, generating prizes
- **Prize**: Redeemable rewards with unique PINs and QR codes