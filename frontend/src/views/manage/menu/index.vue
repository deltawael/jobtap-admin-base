<script setup lang="tsx">
import { type Ref, onMounted, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { yesOrNoRecord } from '@/constants/common';
import { enableStatusRecord, menuTypeRecord } from '@/constants/business';
import { deleteRoute, fetchGetAllPages, fetchGetMenuList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import MenuOperateModal, { type OperateType } from './modules/menu-operate-modal.vue';

const appStore = useAppStore();
const { bool: visible, setTrue: openModal } = useBoolean();
const operateType = ref<OperateType>('add');
const allPages = ref<string[]>([]);
const editingData: Ref<Api.SystemManage.Menu | null> = ref(null);

const menuTypeTagMap = {
  directory: 'default',
  menu: 'primary',
  button: 'warning'
} as const;

const menuStatusTagMap = {
  ENABLED: 'success',
  DISABLED: 'warning'
} as const;

const menuColumns = [
  { key: 'id', title: $t('page.manage.menu.id'), align: 'center' },
  {
    key: 'menuType',
    title: '资源类型',
    align: 'center',
    width: 100,
    render: (row: Api.SystemManage.Menu) => (
      <NTag type={menuTypeTagMap[row.menuType]}>{$t(menuTypeRecord[row.menuType])}</NTag>
    )
  },
  {
    key: 'menuName',
    title: '资源名称',
    align: 'center',
    minWidth: 140,
    render: (row: Api.SystemManage.Menu) => <span>{row.i18nKey ? $t(row.i18nKey) : row.menuName}</span>
  },
  {
    key: 'icon',
    title: $t('page.manage.menu.icon'),
    align: 'center',
    width: 60,
    render: (row: Api.SystemManage.Menu) => (row.icon ? <SvgIcon icon={row.icon} class="text-20px" /> : '-')
  },
  { key: 'routeName', title: $t('page.manage.menu.routeName'), align: 'center', minWidth: 140 },
  { key: 'routePath', title: $t('page.manage.menu.routePath'), align: 'center', minWidth: 160 },
  {
    key: 'status',
    title: $t('page.manage.menu.menuStatus'),
    align: 'center',
    width: 100,
    render: (row: Api.SystemManage.Menu) =>
      row.status === null ? null : <NTag type={menuStatusTagMap[row.status]}>{$t(enableStatusRecord[row.status])}</NTag>
  },
  {
    key: 'hideInMenu',
    title: $t('page.manage.menu.hideInMenu'),
    align: 'center',
    width: 90,
    render: (row: Api.SystemManage.Menu) => $t(yesOrNoRecord[row.hideInMenu ? 'Y' : 'N'])
  },
  { key: 'pid', title: $t('page.manage.menu.parentId'), width: 90, align: 'center' },
  { key: 'order', title: $t('page.manage.menu.order'), align: 'center', width: 60 },
  {
    key: 'operate',
    title: $t('common.operate'),
    align: 'center',
    width: 230,
    render: (row: Api.SystemManage.Menu) => (
      <div class="flex-center justify-end gap-8px">
        {row.menuType === 'directory' && (
          <NButton type="primary" ghost size="small" onClick={() => handleAddChildMenu(row)}>
            新增子资源
          </NButton>
        )}
        <NButton type="primary" ghost size="small" onClick={() => handleEdit(row)}>
          编辑
        </NButton>
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

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useTable({
  apiFn: fetchGetMenuList,
  apiParams: { current: 1, size: 999 },
  columns: () => menuColumns as any
});

async function loadPages() {
  const { data: pageList } = await fetchGetAllPages();
  allPages.value = pageList || [];
}

async function handleDelete(id: number) {
  const { error } = await deleteRoute(id);
  if (error) return;
  await getDataByPage();
}

function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  openModal();
}

function handleAddChildMenu(item: Api.SystemManage.Menu) {
  operateType.value = 'addChild';
  editingData.value = item;
  openModal();
}

function handleEdit(item: Api.SystemManage.Menu) {
  operateType.value = 'edit';
  editingData.value = item;
  openModal();
}

const { checkedRowKeys } = useTableOperate(data, getData);

onMounted(loadPages);
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="资源目录" :bordered="false" size="small" class="sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <MenuOperateModal
        v-model:visible="visible"
        :operate-type="operateType"
        :row-data="editingData"
        :all-pages="allPages"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
