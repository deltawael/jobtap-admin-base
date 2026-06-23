-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('system_admin', 'tenant_admin', 'tenant_user');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ENABLED', 'DISABLED', 'BANNED');

-- CreateEnum
CREATE TYPE "CapabilityKind" AS ENUM ('action', 'view');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('all', 'self', 'region', 'department', 'custom');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "PolicyEffect" AS ENUM ('allow', 'deny');

-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('directory', 'menu', 'button');

-- CreateTable
CREATE TABLE "sys_tokens" (
    "id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "port" INTEGER,
    "address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "sys_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_type" "ActorType" NOT NULL DEFAULT 'tenant_user',
    "built_in" BOOLEAN NOT NULL DEFAULT false,
    "avatar" TEXT,
    "email" TEXT,
    "phone_number" TEXT,
    "nick_name" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "sys_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casbin_rule" (
    "id" SERIAL NOT NULL,
    "ptype" TEXT NOT NULL,
    "v0" TEXT,
    "v1" TEXT,
    "v2" TEXT,
    "v3" TEXT,
    "v4" TEXT,
    "v5" TEXT,

    CONSTRAINT "casbin_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_domain" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "sys_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL,
    "built_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenant_id" TEXT,
    "template_id" TEXT,
    "built_in" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "pid" TEXT NOT NULL DEFAULT '0',
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "sys_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_user_role" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "sys_user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "kind" "CapabilityKind" NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_template_capabilities" (
    "template_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,

    CONSTRAINT "role_template_capabilities_pkey" PRIMARY KEY ("template_id","capability_id")
);

-- CreateTable
CREATE TABLE "role_capabilities" (
    "role_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,

    CONSTRAINT "role_capabilities_pkey" PRIMARY KEY ("role_id","capability_id")
);

-- CreateTable
CREATE TABLE "scope_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "role_id" TEXT,
    "capability_id" TEXT NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_value" TEXT,
    "effect" "PolicyEffect" NOT NULL DEFAULT 'allow',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "scope_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scope_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_value" TEXT,
    "effect" "PolicyEffect" NOT NULL DEFAULT 'allow',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "user_scope_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_value" TEXT,
    "status" "DelegationStatus" NOT NULL DEFAULT 'active',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_staff_bindings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "user_staff_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_ui_bindings" (
    "id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_code" TEXT NOT NULL,
    "menu_id" INTEGER,
    "route_name" TEXT,
    "button_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "capability_ui_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_api_bindings" (
    "id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "capability_api_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_view_bindings" (
    "id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "view_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "capability_view_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_endpoint" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "controller" TEXT NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "sys_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_organization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pid" TEXT NOT NULL DEFAULT '0',
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "sys_organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_login_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "port" INTEGER,
    "address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "sys_login_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_operation_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "params" JSONB,
    "body" JSONB,
    "response" JSONB,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_operation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_menu" (
    "id" SERIAL NOT NULL,
    "menu_type" "MenuType" NOT NULL,
    "menu_name" VARCHAR(64) NOT NULL,
    "icon_type" INTEGER DEFAULT 1,
    "icon" VARCHAR(64),
    "route_name" VARCHAR(64) NOT NULL,
    "route_path" VARCHAR(128) NOT NULL,
    "component" VARCHAR(64) NOT NULL,
    "path_param" VARCHAR(64),
    "status" "Status" NOT NULL,
    "active_menu" VARCHAR(64),
    "hide_in_menu" BOOLEAN DEFAULT false,
    "pid" INTEGER NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL,
    "i18n_key" VARCHAR(64),
    "keep_alive" BOOLEAN DEFAULT false,
    "constant" BOOLEAN NOT NULL DEFAULT false,
    "href" VARCHAR(64),
    "multi_tab" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "sys_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_role_menu" (
    "role_id" TEXT NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,

    CONSTRAINT "sys_role_menu_pkey" PRIMARY KEY ("role_id","menu_id","domain")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "actor_username" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_access_key" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "access_key_id" TEXT NOT NULL,
    "access_key_secret" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "sys_access_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_tokens_access_token_key" ON "sys_tokens"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "sys_tokens_refresh_token_key" ON "sys_tokens"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_username_key" ON "sys_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_email_key" ON "sys_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sys_user_phone_number_key" ON "sys_user"("phone_number");

-- CreateIndex
CREATE INDEX "sys_user_tenant_id_idx" ON "sys_user"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_domain_code_key" ON "sys_domain"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_templates_code_key" ON "role_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sys_role_code_key" ON "sys_role"("code");

-- CreateIndex
CREATE INDEX "sys_role_tenant_id_idx" ON "sys_role"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_role_template_id_idx" ON "sys_role"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_code_key" ON "capabilities"("code");

-- CreateIndex
CREATE INDEX "scope_policies_tenant_id_role_id_idx" ON "scope_policies"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "user_scope_overrides_user_id_capability_id_idx" ON "user_scope_overrides"("user_id", "capability_id");

-- CreateIndex
CREATE INDEX "delegations_tenant_id_to_user_id_capability_id_idx" ON "delegations"("tenant_id", "to_user_id", "capability_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_staff_bindings_user_id_key" ON "user_staff_bindings"("user_id");

-- CreateIndex
CREATE INDEX "user_staff_bindings_tenant_id_staff_id_idx" ON "user_staff_bindings"("tenant_id", "staff_id");

-- CreateIndex
CREATE INDEX "capability_ui_bindings_capability_id_resource_type_idx" ON "capability_ui_bindings"("capability_id", "resource_type");

-- CreateIndex
CREATE INDEX "capability_api_bindings_capability_id_resource_action_idx" ON "capability_api_bindings"("capability_id", "resource", "action");

-- CreateIndex
CREATE INDEX "capability_view_bindings_capability_id_resource_type_idx" ON "capability_view_bindings"("capability_id", "resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "sys_organization_code_key" ON "sys_organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sys_menu_route_name_key" ON "sys_menu"("route_name");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_resource_type_created_at_idx" ON "audit_logs"("tenant_id", "resource_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sys_access_key_access_key_id_key" ON "sys_access_key"("access_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_access_key_access_key_secret_key" ON "sys_access_key"("access_key_secret");

