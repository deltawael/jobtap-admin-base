# Customer Branding Guide

## Purpose

This project has been refactored so that later customer-specific brand customization is concentrated in a few fixed files. The current default brand is `JobTap`.

## Primary Entry Points

### Frontend brand config

Main config file:

- `frontend/src/config/brand.ts`

This file centralizes:

- app title and description
- system title in Chinese and English
- footer text and link
- watermark default text
- demo account identifiers
- homepage project news copy

When a new customer arrives, this should be the first file to update.

### Frontend logo assets

Fixed replacement points:

- `frontend/public/logo.png`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`

The application UI should keep using shared logo entry points instead of referencing customer assets directly in pages.

### Backend brand config

Main config file:

- `backend/libs/config/src/brand.config.ts`

This file centralizes:

- Swagger title
- Swagger description
- terms of service text
- contact display info
- license display info
- default seed super user display name

## Customer Customization Steps

### 1. Update brand text

Update the following fields first:

- `frontend/src/config/brand.ts`
- `backend/libs/config/src/brand.config.ts`
- `frontend/.env`

Keep `VITE_APP_TITLE` and `VITE_APP_DESC` aligned with the frontend brand config.

### 2. Replace logo assets

Replace only these files unless a customer needs a deeper visual redesign:

- `frontend/public/logo.png`
- `frontend/public/favicon.svg`
- `frontend/public/favicon.ico`

### 3. Review customer-facing frontend areas

These locations are already wired to the centralized brand config, but they should still be visually checked after every customer update:

- browser title and meta description via `frontend/index.html`
- global footer via `frontend/src/layouts/modules/global-footer/index.vue`
- login demo account display via `frontend/src/views/_builtin/login/modules/pwd-login.vue`
- loading screen via `frontend/src/plugins/loading.ts`
- page title formatting via `frontend/src/router/guard/title.ts` and `frontend/src/store/modules/app/index.ts`
- watermark placeholder via `frontend/src/layouts/modules/theme-drawer/modules/page-fun.vue`
- homepage neutral avatar and project news copy via:
  - `frontend/src/components/custom/brand-avatar.vue`
  - `frontend/src/views/home/modules/header-banner.vue`
  - `frontend/src/views/home/modules/project-news.vue`

### 4. Review customer-facing backend areas

These locations are already wired for brand replacement:

- Swagger runtime display via `backend/libs/bootstrap/src/swagger/init-doc.swagger.ts`
- seed brand user via `backend/prisma/seeds/sys/sysUser.ts`

### 5. Database initialization rule

Runtime database initialization is now unified to Prisma:

- schema changes come from `backend/prisma/migrations`
- initial data comes from `backend/prisma/seeds`
- `deploy/postgres` SQL files are retained only as historical reference and are not auto-mounted by Docker Compose

If a local PostgreSQL volume was previously initialized by the legacy SQL path, clear the old volume before running `prisma migrate deploy`, otherwise Prisma will report `P3005`.

## Validation Checklist

After each customer customization, verify the following:

1. Frontend type check passes:
   - `pnpm -C frontend typecheck`
2. Browser tab title matches the customer brand.
3. Favicon is updated.
4. Login page, sider/header logo, footer, and loading screen all show the same brand.
5. Chinese and English system titles are both correct.
6. Homepage demo news copy contains no previous customer or template brand text.
7. Swagger title and description are updated.
8. Default seed super user display name is updated.

## Still Intentionally Retained

The following areas are intentionally left unchanged because they are upstream package identities or legacy reference material rather than runtime business branding:

- upstream dependency names such as `@soybeanjs/*`
- legacy SQL snapshots under `deploy/postgres`
- third-party avatar/demo asset URLs unless a customer requests replacement

## Recommendation for Future Customers

Use the following order every time:

1. Edit `frontend/src/config/brand.ts`
2. Edit `backend/libs/config/src/brand.config.ts`
3. Replace `logo.png`, `favicon.svg`, and `favicon.ico`
4. Run `pnpm -C frontend typecheck`
5. Manually verify the login page, layout header/sider, footer, loading screen, and Swagger page

If a future customer requires a full repository rebrand, create a separate checklist for engineering identifiers instead of mixing that work into the UI/runtime branding flow.