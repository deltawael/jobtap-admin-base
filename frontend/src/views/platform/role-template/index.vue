<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  type RoleTemplateModel,
  createRoleTemplate,
  fetchGetCapabilities,
  fetchGetRoleTemplates,
  updateRoleTemplate
} from '@/service/api';
import {
  type CapabilityTreeNode,
  buildCapabilityTree,
  getActorTypeLabel,
  normalizeCapabilityIds
} from '@/utils/capability';

const loading = ref(false);
const visible = ref(false);
const editingId = ref<string | null>(null);
const data = ref<Api.SystemManage.RoleTemplate[]>([]);
const capabilityTree = ref<CapabilityTreeNode[]>([]);
const selectedCapabilityKeys = ref<string[]>([]);
const model = reactive<RoleTemplateModel>({
  code: '',
  name: '',
  actorType: 'tenant_user',
  description: '',
  status: 'ENABLED',
  capabilityIds: []
});

const actorTypeOptions: CommonType.Option[] = [
  { label: '系统管理员', value: 'system_admin' },
  { label: '租户管理员', value: 'tenant_admin' },
  { label: '租户业务用户', value: 'tenant_user' }
];

const statusOptions: CommonType.Option[] = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' }
];

const roleTemplateColumns: DataTableColumns<Api.SystemManage.RoleTemplate> = [
  { key: 'code', title: '编码' },
  { key: 'name', title: '名称' },
  {
    key: 'actorType',
    title: '主体类型',
    render: row => getActorTypeLabel(row.actorType)
  },
  {
    key: 'capabilityCount',
    title: '能力数',
    width: 100,
    render: row => h(NTag, { type: 'info' }, { default: () => row.capabilityCount || 0 })
  },
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
    key: 'builtIn',
    title: '内置',
    width: 80,
    render: row => (row.builtIn ? '是' : '否')
  },
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
  capabilityTree.value = buildCapabilityTree(capabilities || []);
  loading.value = false;
}

function syncCapabilitySelection(value: string[]) {
  selectedCapabilityKeys.value = value;
  model.capabilityIds = normalizeCapabilityIds(value, capabilityTree.value);
}

function renderCapabilityLabel({ option }: any) {
  const treeNode = option as CapabilityTreeNode;
  return h('div', { class: 'flex items-center gap-8px py-2px' }, [
    h('span', { class: 'text-sm text-[#111827]' }, treeNode.label),
    h('span', { class: 'text-xs text-[#6b7280]' }, treeNode.code)
  ]);
}

function openAdd() {
  editingId.value = null;
  selectedCapabilityKeys.value = [];
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
  const capabilityIds = row.capabilityIds || [];
  selectedCapabilityKeys.value = [...capabilityIds];
  Object.assign(model, {
    id: row.id,
    code: row.code,
    name: row.name,
    actorType: row.actorType,
    description: row.description || '',
    status: row.status,
    capabilityIds
  });
  visible.value = true;
}

async function handleSubmit() {
  const payload: RoleTemplateModel = {
    ...model,
    capabilityIds: normalizeCapabilityIds(selectedCapabilityKeys.value, capabilityTree.value)
  };
  const fn = editingId.value ? updateRoleTemplate : createRoleTemplate;
  const { error } = await fn(payload);
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
    <NModal v-model:show="visible" preset="card" :title="editingId ? '编辑模板' : '新增模板'" class="w-620px">
      <NForm :model="model" label-placement="left" :label-width="100">
        <NSpace vertical>
          <NFormItem label="模板编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入模板编码" :disabled="!!editingId" />
          </NFormItem>
          <NFormItem label="模板名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入模板名称" />
          </NFormItem>
          <NFormItem label="主体类型" path="actorType">
            <NSelect v-model:value="model.actorType" :options="actorTypeOptions" placeholder="请选择主体类型" />
          </NFormItem>
          <NFormItem label="状态" path="status">
            <NSelect v-model:value="model.status" :options="statusOptions" placeholder="请选择状态" />
          </NFormItem>
          <NFormItem label="能力集合" path="capabilityIds">
            <div class="max-h-320px w-full overflow-y-auto border border-[#e5e7eb] rounded-8px px-12px py-8px">
              <NTree
                block-line
                cascade
                checkable
                default-expand-all
                key-field="key"
                label-field="label"
                children-field="children"
                :data="capabilityTree"
                :checked-keys="selectedCapabilityKeys"
                :render-label="renderCapabilityLabel"
                @update:checked-keys="keys => syncCapabilitySelection((keys || []) as string[])"
              />
            </div>
          </NFormItem>
          <NFormItem label="描述" path="description">
            <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
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
