<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { type TenantModel, createTenant, fetchGetTenants, updateTenant } from '@/service/api';

const loading = ref(false);
const visible = ref(false);
const editingId = ref<string | null>(null);
const data = ref<Api.SystemManage.Tenant[]>([]);
const model = reactive<TenantModel>({ code: '', name: '', description: '', status: 'ENABLED' });

const statusOptions: CommonType.Option[] = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' }
];

const modalTitle = computed(() => (editingId.value ? '编辑租户' : '新增租户'));

const tenantColumns: DataTableColumns<Api.SystemManage.Tenant> = [
  { key: 'code', title: '编码' },
  { key: 'name', title: '名称' },
  { key: 'description', title: '描述', render: row => row.description || '-' },
  {
    key: 'status',
    title: '状态',
    width: 100,
    render: row =>
      h(
        NTag,
        { type: row.status === 'ENABLED' ? 'success' : 'warning' },
        { default: () => (row.status === 'ENABLED' ? '启用' : '停用') }
      )
  },
  {
    key: 'operate',
    title: '操作',
    width: 220,
    render: row => {
      const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
      const actionText = nextStatus === 'DISABLED' ? '停用' : '启用';
      return h('div', { class: 'flex justify-end gap-8px' }, [
        h(
          NButton,
          { type: 'primary', ghost: true, size: 'small', onClick: () => openEdit(row) },
          { default: () => '编辑' }
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => handleToggleStatus(row, nextStatus) },
          {
            default: () => `确认租户「${row.name}」${actionText}吗？`,
            trigger: () =>
              h(
                NButton,
                { type: nextStatus === 'DISABLED' ? 'warning' : 'success', ghost: true, size: 'small' },
                { default: () => actionText }
              )
          }
        )
      ]);
    }
  }
];

async function loadData() {
  loading.value = true;
  const { data: records } = await fetchGetTenants();
  data.value = records || [];
  loading.value = false;
}

function resetModel() {
  Object.assign(model, { code: '', name: '', description: '', status: 'ENABLED' });
}

function openAdd() {
  editingId.value = null;
  resetModel();
  visible.value = true;
}

function openEdit(row: Api.SystemManage.Tenant) {
  editingId.value = row.id;
  Object.assign(model, {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    status: row.status
  });
  visible.value = true;
}

async function handleToggleStatus(row: Api.SystemManage.Tenant, status: 'ENABLED' | 'DISABLED') {
  const { error } = await updateTenant({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status
  });
  if (error) return;
  await loadData();
}

async function handleSubmit() {
  const fn = editingId.value ? updateTenant : createTenant;
  const { error } = await fn(model);
  if (error) return;
  visible.value = false;
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <NCard title="租户管理" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra>
      <NSpace>
        <NButton type="primary" @click="openAdd">新增租户</NButton>
        <NButton @click="loadData">刷新</NButton>
      </NSpace>
    </template>
    <NDataTable :columns="tenantColumns" :data="data" :loading="loading" size="small" />
    <NModal v-model:show="visible" preset="card" :title="modalTitle" class="w-520px">
      <NForm :model="model" label-placement="left" :label-width="100">
        <NSpace vertical>
          <NFormItem label="租户编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入租户编码" :disabled="!!editingId" />
          </NFormItem>
          <NFormItem label="租户名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入租户名称" />
          </NFormItem>
          <NFormItem label="状态" path="status">
            <NSelect v-model:value="model.status" :options="statusOptions" placeholder="请选择状态" />
          </NFormItem>
          <NFormItem label="描述" path="description">
            <NInput v-model:value="model.description" type="textarea" placeholder="请输入租户描述" />
          </NFormItem>
        </NSpace>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
