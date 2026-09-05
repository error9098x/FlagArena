# Architecture and Code Map

The application is one React SPA, one Express process, and one PostgreSQL database. Uploaded files live on disk. Nginx serves the frontend and proxies `/api` to Express.

```text
flagarena/
├── frontend/src/
│   ├── auth/           Account access and session state
│   ├── challenges/     Catalog, challenge task, editor, hints and reviews
│   ├── events/         Event list, participation and Admin event builder
│   ├── dashboard/      Overview, activity and analytics
│   ├── landing/        Public homepage, optional ciphertext and product previews
│   ├── leaderboard/    Scored-player table and comparative step charts
│   ├── admin/          User management and score corrections
│   ├── components/ui/  Generated shadcn primitives and Aceternity BentoGrid
│   ├── components/     Shared page-level compositions
│   ├── lib/            HTTP access and display formatting
│   └── preview/        Development-only, read-only fixtures
├── backend/src/
│   ├── auth/           Registration, passwords, sessions, email and limits
│   ├── challenges/     Ownership, visibility, content, resources and queries
│   ├── events/         Timed events, registration and attendance
│   ├── submissions/    Atomic attempts, solves, hint unlocks and scoring
│   ├── reviews/        Solver reviews and moderation
│   ├── leaderboard/   Aggregate rankings and actual solve history
│   ├── public/        Whitelisted public homepage summaries
│   ├── dashboard/     Role-specific statistics and activity
│   ├── admin/          Accounts, audit queries and score correction
│   ├── database/       Entity schemas, migrations, setup and seed
│   ├── config/         Environment validation and TypeORM data source
│   └── http/           Boundary errors and request helpers
└── shared/src/         Public DTOs, Zod schemas and domain constants
```

## Ownership

Shared Zod schemas validate requests at the API boundary and in frontend forms. DTOs contain safe response data, never database secrets. React Query owns server state; React state owns temporary form and dialog state. Axios sends access tokens kept only in memory. Refresh tokens use an HTTP-only cookie.

The backend uses TypeORM entity schemas for core records and parameterized SQL through the transactional entity manager for relational operations, locking, and aggregates. Migrations are explicit; `synchronize` is disabled. Supporting tables do not require empty service or repository classes.

## Durable rules

- Users have one role: Player, Challenge Author, or Admin.
- Admins cannot compete. Authors cannot score or review their own challenges.
- Public practice and event-only visibility are separate from challenge workflow status.
- Approval locks challenge resources, hints, flags, and base points. Published text corrections use a separate audited operation.
- Event configuration locks at the start. Server time determines active/ended status; stored status is draft, scheduled, or archived.
- Event challenge content closes at the end; registered participants retain access to results. Public challenges remain accessible through practice. Owners and Admins retain management access.
- One solve is allowed per user, challenge, and non-null context key (`practice` or an event UUID).
- Every submission locks the user, then the event if present, then the challenge. A correct attempt, solve award, hint deduction, and attendance update share a transaction.
- Challenge locking serializes dynamic award calculation. The uniqueness constraint is the final duplicate-award defense.
- Dynamic awards subtract `ceil(base * 0.05)` per previous non-invalidated solve, with a `ceil(base * 0.50)` floor. Existing solve awards never change automatically.
- Hint unlocks are global per user and challenge. Their stored costs are deducted at each subsequent solve; earlier solves are unchanged. Reopening a hint is free.
- Incorrect attempts persist independently of API-process restarts. Eight wrong attempts in fifteen minutes cause a ten-minute user/challenge lockout.
- Leaderboards aggregate valid solves. Tie order uses points, earliest latest-scoring-solve time, then user ID for deterministic ordering.
- Score corrections preserve `original_points`, require a reason, and create an audit record. Invalidated solves remain retained and cannot be submitted again for a duplicate award.
- Administrator status changes serialize the last-Admin check. Role changes for registered participants wait until their pending events end.

## Simplicity choices

No Redis, microservices, generic CRUD framework, dependency-injection container, or application-specific component library. Generated UI code is isolated in `components/ui`. The `FormField` compositions centralize repeated label and control markup; the feature names describe their purpose.

The broader development-only fixture mode in `preview/` is compiled out of production through Vite's development condition. It contains display data only and is not a test of backend persistence or authorization.

The public homepage's labeled product demonstration is available in deployed builds. Its `/preview` route provides an interactive browser-local workspace with role switching, sample attachments, answer checking, authoring, and review actions. Its bundled flags are deliberately public examples, not server challenge secrets. This mode does not test backend persistence or authorization. The separately seeded PostgreSQL demo is a real server workspace with real role permissions, not the same browser-local store.

Decorative ciphertext uses Canvas with automatic character changes and pointer highlights. Motion effects respect reduced-motion preferences. DiceBear Identicon avatars are generated locally; no avatar CDN is required. See the source files for current animation parameters.
