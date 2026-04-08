# DAT Architecture Overview

## Project Goal

Driving Academy Tool (DAT) is a SaaS platform designed to support driving schools in managing students, instructors, vehicles and lessons.

The system is designed with future multi-tenant support in mind.

---

## Core Technologies

Frontend
- Next.js 14 (App Router)
- TypeScript

Backend
- Node.js environment (Next.js server functions)
- Prisma ORM

Database
- PostgreSQL (Supabase)

Authentication
- NextAuth (Credentials provider)

Infrastructure
- Vercel (deployment)
- Cloudflare (DNS)

---

## Security Model

The system uses Supabase Row Level Security (RLS) to enforce data isolation between organisations.

This ensures that each driving school can only access its own data.

---

## Multi-Tenant Strategy

The platform is designed to support multiple organisations.

Key concepts:

- Organisation entity
- Domain-based routing
- Role-based access control

---

## CI/CD

CI pipelines ensure:

- build verification
- linting
- test execution

This guarantees that contributions follow defined quality standards.

---

## Future Evolution

Planned improvements include:

- organisation-level licensing
- domain-based tenant routing
- extended role management