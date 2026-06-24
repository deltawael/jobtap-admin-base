<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  type RoleTemplateModel,
  createRoleTemplate,
  fetchGetCapabilities,
  fetchGetRoleTemplates,
  updateRoleTemplate
} from '@/service/api';

const loading = ref(false);
const visible = ref(false);
const editingId = ref<string | null>(null);
const data = ref<Api.SystemManage.RoleTemplate[]>([]);
const capabilityOptions = ref<CommonType.Option<string>[]>([]);
const model = reactive<RoleTemplateModel>({
  code: '',
  name: '',
  actorType: 'tenant_user',
  description: '',
  status: 'ENABLED',
  capabilityIds: []
});

const roleTemplateColumns: DataTableColumns<Api.SystemManage.RoleTemplate> = [
  { key: 'code', title: '编码' },
  { key: 'name', title: '名称' },
  { key: 'actorType', title: '主体类型' },
  { key: 'capabilityCount', title: '能力数' },
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
  const [{ data: templates }, { data: capabilities }] = await Promise.all([
    fetchGetRoleTemplates(),
    fetchGetCapabilities()
  ]);
  data.value = templates || [];
  capabilityOptions.value = (capabilities || []).map(item => ({
    label: `${item.module} / ${item.name}`,
    value: item.id
  }));
  loading.value = false;
}

function openAdd() {
  editingId.value = null;
  Object.assign(model, {
    code: '',
    name: '',
    actorType: 'tenant_user',
    description: '',
    status: 'ENABLED',
    capabilityIds: []
  });
  visible.value = true;
}

function openEdit(row: Api.SystemManage.RoleTemplate) {
  editingId.value = row.id;
  Object.assign(model, {
    id: row.id,
    code: row.code,
    name: row.name,
    actorType: row.actorType,
    description: row.description || '',
    status: row.status,
    capabilityIds: row.capabilityIds || []
  });
  visible.value = true;
}

async function handleSubmit() {
  const fn = editingId.value ? updateRoleTemplate : createRoleTemplate;
  const { error } = await fn(model);
  if (error) return;
  visible.value = false;
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <NCard title="角色模板" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra>
      <NSpace>
        <NButton type="primary" @click="openAdd">新增模板</NButton>
        <NButton @click="loadData">刷新</NButton>
      </NSpace>
    </template>
    <NDataTable :columns="roleTemplateColumns" :data="data" :loading="loading" size="small" />
    <NModal v-model:show="visible" preset="card" :title="editingId ? '编辑模板' : '新增模板'" class="w-560px">
      <NSpace vertical>
        <NInput v-model:value="model.code" placeholder="模板编码" :disabled="!!editingId" />
        <NInput v-model:value="model.name" placeholder="模板名称" />
        <NSelect
          v-model:value="model.actorType"
          :options="[
            { label: '系统管理员', value: 'system_admin' },
            { label: '租户管理员', value: 'tenant_admin' },
            { label: '租户业务用户', value: 'tenant_user' }
          ]"
          placeholder="主体类型"
        />
        <NInput v-model:value="model.description" placeholder="描述" />
        <NSelect
          v-model:value="model.capabilityIds"
          multiple
          filterable
          :options="capabilityOptions"
          placeholder="能力集合"
        />
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
