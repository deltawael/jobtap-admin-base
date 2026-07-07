<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { deleteRole, fetchGetRoleList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuthStore } from '@/store/modules/auth';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleScopeStrategyDrawer from './modules/role-scope-strategy-drawer.vue';
import RoleSearch from './modules/role-search.vue';

defineOptions({
  name: 'TenantRolePage'
});

const appStore = useAppStore();
const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const scopeDrawerVisible = ref(false);
const scopeEditingRole = ref<Api.SystemManage.Role | null>(null);
const roleStatusTagMap = {
  ENABLED: 'success',
  DISABLED: 'warning'
} as const;

const {
  columns,
  columnChecks,
  data,
  loading,
  getData,
  getDataByPage,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetRoleList,
  apiParams: { current: 1, size: 10, status: null, name: null, code: null, tenantScope: 'all', tenantId: null },
  columns: () => {
    const columnList = [
      { type: 'selection', align: 'center', width: 48 },
      { key: 'index', title: $t('common.index'), width: 64, align: 'center' },
      { key: 'name', title: $t('page.manage.role.roleName'), align: 'center', minWidth: 140 },
      { key: 'code', title: $t('page.manage.role.roleCode'), align: 'center', minWidth: 160 },
      {
        key: 'templateName',
        title: '模板',
        align: 'center',
        minWidth: 140,
        render: (row: Api.SystemManage.Role) => row.templateName || '-'
      },
      {
        key: 'capabilityCount',
        title: '能力数',
        align: 'center',
        width: 100,
        render: (row: Api.SystemManage.Role) => <NTag type="info">{row.capabilityCount || 0}</NTag>
      },
      {
        key: 'scopeStrategyCount',
        title: '数据范围数',
        align: 'center',
        width: 100,
        render: (row: Api.SystemManage.Role) => <NTag type="warning">{row.scopeStrategyCount || 0}</NTag>
      },
      { key: 'description', title: $t('page.manage.role.roleDesc'), minWidth: 180 },
      {
        key: 'status',
        title: $t('page.manage.role.roleStatus'),
        align: 'center',
        width: 100,
        render: (row: Api.SystemManage.Role) =>
          row.status === null ? null : (
            <NTag type={roleStatusTagMap[row.status]}>{$t(enableStatusRecord[row.status])}</NTag>
          )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        minWidth: 220,
        render: (row: Api.SystemManage.Role) => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
              {$t('common.edit')}
            </NButton>
            <NButton type="warning" ghost size="small" onClick={() => openScopeStrategy(row)}>
              范围策略
            </NButton>
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small" disabled={row.builtIn}>
                    {$t('common.delete')}
                  </NButton>
                )
              }}
            </NPopconfirm>
          </div>
        )
      }
    ];
    if (isSystemAdmin.value) {
      columnList.splice(4, 0, {
        key: 'tenantId',
        title: '所属租户',
        align: 'center',
        minWidth: 140,
        render: (row: Api.SystemManage.Role) => <span>{row.tenantId ? row.tenantName || row.tenantId : '平台'}</span>
      });
    }
    return columnList as any;
  }
});

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, getData);

async function handleBatchDelete() {
  onBatchDeleted();
}

async function handleDelete(id: string) {
  const { error } = await deleteRole(id);
  if (error) return;
  await onDeleted();
}

function edit(id: string) {
  handleEdit(id);
}

function openScopeStrategy(row: Api.SystemManage.Role) {
  scopeEditingRole.value = row;
  scopeDrawerVisible.value = true;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="角色管理" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1120"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
      <RoleScopeStrategyDrawer
        v-model:visible="scopeDrawerVisible"
        :row-data="scopeEditingRole"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
