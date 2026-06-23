# Environment Bootstrap

## Scope

This repository now uses a single Prisma baseline migration:

- `backend/prisma/migrations/0_target_state_baseline`

It represents the current target-state schema, including:

- shared-table multi-tenant fields (`tenantId`)
- unified authorization catalog (`capabilities`)
- role templates and tenant roles
- scope, delegation, and audit tables

The old migration chain has been removed intentionally. Existing databases initialized from older migration chains should be reset instead of being upgraded in place.

## New Environment Initialization

### Option A: Full Docker Compose

From the repository root:

```bash
docker-compose up -d
```

Startup order:

1. `postgres`
2. `redis`
3. `db-init`
4. `backend`
5. `frontend`

`db-init` runs:

```bash
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma db seed
```

### Option B: Local Development

Start middleware first:

```bash
docker-compose -f docker-compose.middleware.yml up -d
```

Then initialize the backend database:

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm exec prisma db seed
```

Start the backend:

```bash
cd backend
pnpm start:dev
```

Start the frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

## Reset Rules

If a local PostgreSQL volume or database was created from any previous migration chain or from `deploy/postgres/*.sql`, reset it before using the current repository state.

Example:

```bash
docker-compose -f docker-compose.middleware.yml down -v
docker-compose -f docker-compose.middleware.yml up -d
```

## Seed Contents

The current seed initializes at least:

- built-in tenant record
- role templates: `system_admin`, `tenant_admin`, `boss`, `supervisor`, `region_manager`, `staff`, `hr`, `finance`, `readonly_client`
- capability catalog and template-capability bindings
- legacy bootstrap users, roles, menus, and casbin data needed by the remaining system modules

## Future Migration Workflow

Do not regenerate the whole baseline for ordinary schema changes.

Create incremental migrations on top of the baseline:

```bash
cd backend
pnpm exec prisma migrate dev --schema prisma/schema.prisma --name <change-name> --create-only
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
pnpm prisma:generate
```

Use baseline regeneration only when you intentionally decide to squash migration history again.
