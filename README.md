# Driving Academy Tool (DAT)

Driving Academy Tool (DAT) is a SaaS platform designed to help driving schools manage students, instructors, vehicles and lessons in a structured and scalable way.

The project is built with modern web technologies and focuses on maintainability, security and future multi-tenant capabilities.


# Project Goals

The main objective of DAT is to provide a modular and scalable platform that can support multiple driving schools while keeping data isolated and secure.

Key design goals:

- clean architecture
- secure multi-tenant foundation
- role-based access control
- maintainable codebase
- automated CI/CD pipelines


# Core Features

Current capabilities include:

- role-based access control  
  - SUPER_ADMIN  
  - INSTRUCTOR  
  - STUDENT

- lesson management
- authentication and session management
- deterministic seed data for development and testing
- CI/CD pipelines for build validation


# Technology Stack

Frontend
- Next.js 14 (App Router)
- TypeScript
- React

Backend
- Next.js server environment
- Prisma ORM

Database
- PostgreSQL (Supabase)

Authentication
- NextAuth (Credentials provider)

Infrastructure
- Vercel deployment
- Cloudflare DNS

CI/CD
- GitLab CI


# Architecture

High-level architecture documentation can be found in:  
[./docs/architecture.md](./docs/architecture.md)

The system follows a modular structure that separates:

- application logic
- data access
- authentication
- infrastructure concerns

This allows the system to evolve towards a multi-tenant SaaS architecture.


# Security

Security is implemented through:

- Supabase Row Level Security (RLS)
- role-based permissions
- controlled access to tenant data

This ensures that each organisation can only access its own information.


# Development

To run the project locally:
```bash
pnpm install
pnpm dev
```

Environment variables are required and should be defined in `.env.local`.

**Git hooks:** Husky runs `lint-staged` from `driving_school_platform/nextjs_space` on commit. Run `pnpm install` in that directory (or from the repo root if your workspace layout installs that package) so `prettier` and `eslint` resolve from local `node_modules`—you should not need globally installed Prettier or ESLint.


# CI/CD

CI pipelines validate:

- build integrity
- lint rules
- test execution

This ensures that contributions follow defined quality standards.


# Contributing

This project follows collaborative development practices inspired by **Inner Source**.

Please read:
[CONTRIBUTING.md](CONTRIBUTING.md)

before submitting contributions.


# Roadmap

Planned improvements:

- multi-organisation support
- tenant routing by domain/subdomain
- licensing model
- expanded lesson management features


# Author

Rui Eduardo Alexandre Sousa  
Software Engineer  
LinkedIn: https://www.linkedin.com/in/rukahh