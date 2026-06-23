<script setup lang="tsx">
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { deleteRole, fetchGetRoleList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';

const appStore = useAppStore();

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
  apiParams: {
    current: 1,
    size: 10,
    status: null,
    name: null,
    code: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center'
    },
    {
      key: 'name',
      title: $t('page.manage.role.roleName'),
      align: 'center',
      minWidth: 140
    },
    {
      key: 'code',
      title: $t('page.manage.role.roleCode'),
      align: 'center',
      minWidth: 140
    },
    {
      key: 'templateName',
      title: '模板',
      align: 'center',
      minWidth: 140,
      render: row => row.templateName || '-'
    },
    {
      key: 'capabilityCount',
      title: '能力数',
      align: 'center',
      width: 120,
      render: row => <NTag type="info">{row.capabilityCount || 0}</NTag>
    },
    {
      key: 'description',
      title: $t('page.manage.role.roleDesc'),
      minWidth: 180
    },
    {
      key: 'status',
      title: $t('page.manage.role.roleStatus'),
      align: 'center',
      width: 100,
      render: row => {
        if (row.status === null) {
          return null;
        }

        const tagMap: Record<Api.Common.EnableStatus, NaiveUI.ThemeColor> = {
          ENABLED: 'success',
          DISABLED: 'warning'
        };

        return <NTag type={tagMap[row.status]}>{$t(enableStatusRecord[row.status])}</NTag>;
      }
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      minWidth: 140,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
            {$t('common.edit')}
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
  ]
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
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="$t('page.manage.role.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
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
        :scroll-x="920"
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
    </NCard>
  </div>
</template>

<style scoped></style>
