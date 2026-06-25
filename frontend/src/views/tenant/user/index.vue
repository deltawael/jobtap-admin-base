<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NAvatar, NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { deleteUser, fetchGetUserList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { useSvgIcon } from '@/hooks/common/icon';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import UserPasswordModal from './modules/user-password-modal.vue';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';

defineOptions({
  name: 'TenantUserPage'
});

const appStore = useAppStore();
const authStore = useAuthStore();
const { hasAuth } = useAuth();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const canManageUserPassword = computed(() => hasAuth('tenant.user.password.manage'));
const { SvgIconVNode } = useSvgIcon();
const passwordModalVisible = ref(false);
const passwordTarget = ref<Api.SystemManage.User | null>(null);

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetUserList,
  showTotal: true,
  apiParams: {
    current: 1,
    size: 10,
    status: null,
    username: null,
    nickName: null,
    phoneNumber: null,
    email: null,
    tenantScope: 'all',
    tenantId: null
  },
  columns: () => {
    const columnList: any[] = [
      { type: 'selection', align: 'center', width: 48 },
      { key: 'index', title: $t('common.index'), align: 'center', width: 64 },
      { key: 'username', title: $t('page.manage.user.userName'), align: 'center', minWidth: 120 },
      {
        key: 'avatar',
        title: $t('page.manage.user.avatar'),
        align: 'center',
        width: 72,
        render: (row: Api.SystemManage.User) => (
          <NAvatar size="small" src={row.avatar || undefined}>
            {SvgIconVNode({ icon: 'ph:user-circle', fontSize: 18 })}
          </NAvatar>
        )
      },
      { key: 'nickName', title: $t('page.manage.user.nickName'), align: 'center', minWidth: 120 },
      { key: 'phoneNumber', title: $t('page.manage.user.userPhone'), align: 'center', width: 140 },
      { key: 'email', title: $t('page.manage.user.userEmail'), align: 'center', minWidth: 220 },
      {
        key: 'status',
        title: $t('page.manage.user.userStatus'),
        align: 'center',
        width: 100,
        render: (row: Api.SystemManage.User) => {
          if (row.status === null) return null;
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
        width: 220,
        render: (row: Api.SystemManage.User) => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
              {$t('common.edit')}
            </NButton>
            {canManageUserPassword.value ? (
              <NButton type="warning" ghost size="small" onClick={() => openChangePassword(row)}>
                {$t('page.manage.user.changePassword')}
              </NButton>
            ) : null}
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small">
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
      columnList.splice(5, 0, {
        key: 'tenantId',
        title: '所属租户',
        align: 'center',
        minWidth: 140,
        render: (row: Api.SystemManage.User) => <span>{row.tenantId ? row.tenantName || row.tenantId : '平台'}</span>
      });
    }
    return columnList;
  }
});

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, getData);

async function handleBatchDelete() {
  onBatchDeleted();
}

function openChangePassword(row: Api.SystemManage.User) {
  passwordTarget.value = row;
  passwordModalVisible.value = true;
}

async function handleDelete(id: string) {
  const { error } = await deleteUser(id);
  if (error) return;
  await onDeleted();
}

function edit(id: string) {
  handleEdit(id);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard :title="$t('page.manage.user.title')" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
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
        :scroll-x="1320"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <UserPasswordModal v-model:visible="passwordModalVisible" :row-data="passwordTarget" />
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
