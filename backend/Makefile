# Prisma schema file path
SCHEMA_PATH = prisma/schema.prisma

# Default name for incremental migrations
MIGRATION_NAME ?= change

# Single baseline migration path
BASELINE_DIR = prisma/migrations/0_target_state_baseline
BASELINE_PATH = $(BASELINE_DIR)/migration.sql

init_migration:
	pnpm exec prisma migrate deploy --schema $(SCHEMA_PATH)
	pnpm exec prisma db seed

# Regenerate the single baseline migration from the current schema.
# Use this only when you intentionally squash migration history.
generate_baseline:
	mkdir -p $(BASELINE_DIR)
	pnpm exec prisma migrate diff --from-empty --to-schema-datamodel $(SCHEMA_PATH) --script > $(BASELINE_PATH)

# Create a normal incremental migration on top of the current baseline.
create_migration:
	pnpm exec prisma migrate dev --schema $(SCHEMA_PATH) --name $(MIGRATION_NAME) --create-only

# Deploy unapplied migrations.
deploy_migration:
	pnpm exec prisma migrate deploy --schema $(SCHEMA_PATH)

# Reset database and reapply migrations.
reset_database:
	pnpm exec prisma migrate reset --schema $(SCHEMA_PATH) --force

.PHONY: init_migration generate_baseline create_migration deploy_migration reset_database
