CREATE TYPE "ScopeStrategyMode" AS ENUM ('all', 'self', 'relation', 'assignment');

CREATE TABLE "scope_dimension_entities" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "built_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "scope_dimension_entities_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "scope_subject_resolvers" (
    "id" TEXT NOT NULL,
    "resolver_code" TEXT NOT NULL,
    "subject_entity_code" TEXT NOT NULL,
    "dimension_entity_code" TEXT NOT NULL,
    "description" TEXT,
    "built_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "scope_subject_resolvers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scope_subject_resolvers_resolver_code_key" ON "scope_subject_resolvers"("resolver_code");
CREATE INDEX "scope_subject_resolvers_subject_entity_code_dimension_ent_idx" ON "scope_subject_resolvers"("subject_entity_code", "dimension_entity_code");

CREATE TABLE "scope_resource_resolvers" (
    "id" TEXT NOT NULL,
    "resolver_code" TEXT NOT NULL,
    "resource_entity_code" TEXT NOT NULL,
    "dimension_entity_code" TEXT NOT NULL,
    "description" TEXT,
    "built_in" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "scope_resource_resolvers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scope_resource_resolvers_resolver_code_key" ON "scope_resource_resolvers"("resolver_code");
CREATE INDEX "scope_resource_resolvers_resource_entity_code_dimension__idx" ON "scope_resource_resolvers"("resource_entity_code", "dimension_entity_code");

CREATE TABLE "capability_scope_targets" (
    "id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "resource_entity_code" TEXT NOT NULL,
    "dimension_entity_code" TEXT,
    "supports_self" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "capability_scope_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capability_scope_targets_capability_id_resource_entity_code_di_key" ON "capability_scope_targets"("capability_id", "resource_entity_code", "dimension_entity_code");
CREATE INDEX "capability_scope_targets_capability_id_resource_entity_cod_idx" ON "capability_scope_targets"("capability_id", "resource_entity_code");
CREATE INDEX "capability_scope_targets_dimension_entity_code_idx" ON "capability_scope_targets"("dimension_entity_code");

CREATE TABLE "role_scope_strategies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "role_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "strategy_mode" "ScopeStrategyMode" NOT NULL,
    "dimension_entity_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "role_scope_strategies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "role_scope_strategies_role_id_capability_id_idx" ON "role_scope_strategies"("role_id", "capability_id");
CREATE INDEX "role_scope_strategies_tenant_id_capability_id_idx" ON "role_scope_strategies"("tenant_id", "capability_id");

CREATE TABLE "user_scope_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "dimension_entity_code" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "user_scope_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_scope_assignments_user_id_capability_id_dimension_entity_idx" ON "user_scope_assignments"("user_id", "capability_id", "dimension_entity_code");
CREATE INDEX "user_scope_assignments_tenant_id_user_id_idx" ON "user_scope_assignments"("tenant_id", "user_id");

CREATE TABLE "subject_dimension_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "subject_entity_code" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "dimension_entity_code" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,
    CONSTRAINT "subject_dimension_relations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subject_dimension_relations_subject_entity_code_subject_id_d_idx" ON "subject_dimension_relations"("subject_entity_code", "subject_id", "dimension_entity_code");
CREATE INDEX "subject_dimension_relations_tenant_id_dimension_entity_cod_idx" ON "subject_dimension_relations"("tenant_id", "dimension_entity_code");

ALTER TABLE "delegations"
    ADD COLUMN "dimension_entity_code" TEXT,
    ADD COLUMN "entity_id" TEXT;

CREATE INDEX "delegations_tenant_id_to_user_id_capability_id_dimension_ent_idx" ON "delegations"("tenant_id", "to_user_id", "capability_id", "dimension_entity_code");
ALTER TABLE "sys_organization" ADD COLUMN "tenant_id" TEXT;
CREATE INDEX "sys_organization_tenant_id_status_idx" ON "sys_organization"("tenant_id", "status");

WITH legacy_role_strategy_candidates AS (
    SELECT
        sp."id",
        sp."tenant_id",
        sp."role_id",
        sp."capability_id",
        CASE
            WHEN sp."scope_type" = 'all' THEN 'all'::"ScopeStrategyMode"
            WHEN sp."scope_type" = 'self' THEN 'self'::"ScopeStrategyMode"
            WHEN sp."scope_type" IN ('region', 'department', 'custom') AND sp."scope_value" IS NOT NULL
                THEN 'assignment'::"ScopeStrategyMode"
            ELSE NULL
        END AS "strategy_mode",
        CASE
            WHEN sp."scope_type" IN ('region', 'department', 'custom') AND sp."scope_value" IS NOT NULL
                THEN 'organization'
            ELSE NULL
        END AS "dimension_entity_code",
        sp."created_at",
        sp."created_by",
        sp."updated_at",
        sp."updated_by",
        CASE
            WHEN sp."scope_type" = 'all' THEN 1
            WHEN sp."scope_type" = 'self' THEN 2
            ELSE 3
        END AS "precedence_rank"
    FROM "scope_policies" sp
    WHERE sp."role_id" IS NOT NULL
      AND sp."effect" = 'allow'
),
effective_role_strategies AS (
    SELECT DISTINCT ON ("role_id", "capability_id")
        "id",
        "tenant_id",
        "role_id",
        "capability_id",
        "strategy_mode",
        "dimension_entity_code",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by"
    FROM legacy_role_strategy_candidates
    WHERE "strategy_mode" IS NOT NULL
    ORDER BY "role_id", "capability_id", "precedence_rank", "created_at", "id"
)
INSERT INTO "role_scope_strategies" (
    "id",
    "tenant_id",
    "role_id",
    "capability_id",
    "strategy_mode",
    "dimension_entity_code",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by"
)
SELECT
    CONCAT('migrated-role-strategy-', ers."id"),
    ers."tenant_id",
    ers."role_id",
    ers."capability_id",
    ers."strategy_mode",
    ers."dimension_entity_code",
    ers."created_at",
    ers."created_by",
    ers."updated_at",
    ers."updated_by"
FROM effective_role_strategies ers
WHERE NOT EXISTS (
    SELECT 1
    FROM "role_scope_strategies" rss
    WHERE rss."role_id" = ers."role_id"
      AND rss."capability_id" = ers."capability_id"
);

WITH legacy_role_strategy_candidates AS (
    SELECT
        sp."id",
        sp."role_id",
        sp."capability_id",
        CASE
            WHEN sp."scope_type" = 'all' THEN 1
            WHEN sp."scope_type" = 'self' THEN 2
            ELSE 3
        END AS "precedence_rank"
    FROM "scope_policies" sp
    WHERE sp."role_id" IS NOT NULL
      AND sp."effect" = 'allow'
),
effective_role_strategies AS (
    SELECT DISTINCT ON ("role_id", "capability_id")
        "role_id",
        "capability_id",
        "precedence_rank"
    FROM legacy_role_strategy_candidates
    ORDER BY "role_id", "capability_id", "precedence_rank", "id"
)
INSERT INTO "user_scope_assignments" (
    "id",
    "tenant_id",
    "user_id",
    "capability_id",
    "dimension_entity_code",
    "entity_id",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by"
)
SELECT DISTINCT
    CONCAT('migrated-role-assignment-', ur."user_id", '-', sp."id"),
    COALESCE(sp."tenant_id", su."tenant_id"),
    ur."user_id",
    sp."capability_id",
    'organization',
    sp."scope_value",
    sp."created_at",
    sp."created_by",
    sp."updated_at",
    sp."updated_by"
FROM "scope_policies" sp
JOIN effective_role_strategies ers
    ON ers."role_id" = sp."role_id"
   AND ers."capability_id" = sp."capability_id"
   AND ers."precedence_rank" = 3
JOIN "sys_user_role" ur
    ON ur."role_id" = sp."role_id"
JOIN "sys_user" su
    ON su."id" = ur."user_id"
WHERE sp."effect" = 'allow'
  AND sp."scope_type" IN ('region', 'department', 'custom')
  AND sp."scope_value" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "user_scope_assignments" usa
      WHERE usa."user_id" = ur."user_id"
        AND usa."capability_id" = sp."capability_id"
        AND usa."dimension_entity_code" = 'organization'
        AND usa."entity_id" = sp."scope_value"
  );

INSERT INTO "user_scope_assignments" (
    "id",
    "tenant_id",
    "user_id",
    "capability_id",
    "dimension_entity_code",
    "entity_id",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by"
)
SELECT DISTINCT
    CONCAT('migrated-user-assignment-', uso."id"),
    su."tenant_id",
    uso."user_id",
    uso."capability_id",
    'organization',
    uso."scope_value",
    uso."created_at",
    uso."created_by",
    uso."updated_at",
    uso."updated_by"
FROM "user_scope_overrides" uso
JOIN "sys_user" su
    ON su."id" = uso."user_id"
WHERE uso."effect" = 'allow'
  AND uso."scope_type" IN ('region', 'department', 'custom')
  AND uso."scope_value" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "user_scope_assignments" usa
      WHERE usa."user_id" = uso."user_id"
        AND usa."capability_id" = uso."capability_id"
        AND usa."dimension_entity_code" = 'organization'
        AND usa."entity_id" = uso."scope_value"
  );

UPDATE "delegations"
SET "dimension_entity_code" = 'organization',
    "entity_id" = "scope_value"
WHERE "dimension_entity_code" IS NULL
  AND "entity_id" IS NULL
  AND "scope_type" IN ('region', 'department', 'custom')
  AND "scope_value" IS NOT NULL;
