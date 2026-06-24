<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { type CapabilityModel, createCapability, fetchGetCapabilities, updateCapability } from '@/service/api';

const loading = ref(false);
const visible = ref(false);
const editingId = ref<string | null>(null);
const data = ref<Api.SystemManage.Capability[]>([]);
const model = reactive<CapabilityModel>({
  code: '',
  name: '',
  module: 'tenant',
  kind: 'action',
  description: '',
  status: 'ENABLED'
});

const capabilityColumns: DataTableColumns<Api.SystemManage.Capability> = [
  { key: 'module', title: '模块' },
  { key: 'code', title: '编码' },
  { key: 'name', title: '名称' },
  { key: 'kind', title: '类型' },
  { key: 'builtIn', title: '内置' },
  {
    key: 'operate',
    title: '操作',
    render: row =>
      h(
        NButton,
        { type: 'primary', ghost: true, size: 'small', onClick: () => openEdit(row) },
        { default: () => '编辑' }
      )
  }
];

async function loadData() {
  loading.value = true;
  const { data: capabilities } = await fetchGetCapabilities();
  data.value = capabilities || [];
  loading.value = false;
}

function openAdd() {
  editingId.value = null;
  Object.assign(model, { code: '', name: '', module: 'tenant', kind: 'action', description: '', status: 'ENABLED' });
  visible.value = true;
}

function openEdit(row: Api.SystemManage.Capability) {
  editingId.value = row.id;
  Object.assign(model, {
    id: row.id,
    code: row.code,
    name: row.name,
    module: row.module,
    kind: row.kind,
    description: row.description || '',
    status: row.status
  });
  visible.value = true;
}

async function handleSubmit() {
  const fn = editingId.value ? updateCapability : createCapability;
  const { error } = await fn(model);
  if (error) return;
  visible.value = false;
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <NCard title="能力目录" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra>
      <NSpace>
        <NButton type="primary" @click="openAdd">新增能力</NButton>
        <NButton @click="loadData">刷新</NButton>
      </NSpace>
    </template>
    <NDataTable :columns="capabilityColumns" :data="data" :loading="loading" size="small" />
    <NModal v-model:show="visible" preset="card" :title="editingId ? '编辑能力' : '新增能力'" class="w-560px">
      <NSpace vertical>
        <NInput v-model:value="model.module" placeholder="所属模块" />
        <NInput v-model:value="model.code" placeholder="能力编码" :disabled="!!editingId" />
        <NInput v-model:value="model.name" placeholder="能力名称" />
        <NSelect
          v-model:value="model.kind"
          :options="[
            { label: '动作', value: 'action' },
            { label: '视图', value: 'view' }
          ]"
          placeholder="能力类型"
        />
        <NInput v-model:value="model.description" placeholder="描述" />
      </NSpace>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
