<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { type CapabilityModel, createCapability, fetchGetCapabilities, updateCapability } from '@/service/api';
import { type CapabilityTreeNode, buildCapabilityTree, getCapabilityKindLabel } from '@/utils/capability';

const loading = ref(false);
const visible = ref(false);
const editingId = ref<string | null>(null);
const capabilityRecords = ref<Api.SystemManage.Capability[]>([]);
const model = reactive<CapabilityModel>({
  code: '',
  name: '',
  module: 'tenant',
  kind: 'action',
  description: '',
  status: 'ENABLED'
});

const moduleOptions: CommonType.Option[] = [
  { label: '平台侧', value: 'platform' },
  { label: '租户侧', value: 'tenant' }
];

const kindOptions: CommonType.Option[] = [
  { label: '动作', value: 'action' },
  { label: '视图', value: 'view' }
];

const statusOptions: CommonType.Option[] = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' }
];

const capabilityTreeData = computed(() => buildCapabilityTree(capabilityRecords.value));

function isCapabilityNode(row: CapabilityTreeNode) {
  return row.nodeType === 'capability' && Boolean(row.capability);
}

const capabilityColumns: DataTableColumns<CapabilityTreeNode> = [
  {
    key: 'label',
    title: '名称',
    render: row => row.label
  },
  {
    key: 'code',
    title: '编码',
    render: row => row.code
  },
  {
    key: 'nodeType',
    title: '层级',
    width: 100,
    render: row => {
      const labelMap: Record<CapabilityTreeNode['nodeType'], string> = {
        module: '模块',
        group: '业务分组',
        capability: '能力'
      };
      return labelMap[row.nodeType];
    }
  },
  {
    key: 'kind',
    title: '类型',
    width: 100,
    render: row => (isCapabilityNode(row) ? getCapabilityKindLabel(row.kind) : '-')
  },
  {
    key: 'builtIn',
    title: '内置',
    width: 80,
    render: row => {
      if (!isCapabilityNode(row)) return '-';
      return row.builtIn ? '是' : '否';
    }
  },
  {
    key: 'capabilityCount',
    title: '子项数',
    width: 90,
    render: row => (row.nodeType === 'capability' ? '-' : row.capabilityCount)
  },
  {
    key: 'status',
    title: '状态',
    width: 100,
    render: row => {
      if (!isCapabilityNode(row) || !row.capability) return '-';
      return h(
        NTag,
        { type: row.capability.status === 'ENABLED' ? 'success' : 'warning' },
        { default: () => (row.capability?.status === 'ENABLED' ? '启用' : '停用') }
      );
    }
  },
  {
    key: 'operate',
    title: '操作',
    width: 100,
    render: row => {
      if (!isCapabilityNode(row) || !row.capability) return null;
      return h(
        NButton,
        { type: 'primary', ghost: true, size: 'small', onClick: () => openEdit(row.capability!) },
        { default: () => '编辑' }
      );
    }
  }
];

async function loadData() {
  loading.value = true;
  const { data: capabilities } = await fetchGetCapabilities();
  capabilityRecords.value = capabilities || [];
  loading.value = false;
}

function resetModel() {
  Object.assign(model, { code: '', name: '', module: 'tenant', kind: 'action', description: '', status: 'ENABLED' });
}

function openAdd() {
  editingId.value = null;
  resetModel();
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
    <NDataTable
      :columns="capabilityColumns"
      :data="capabilityTreeData"
      :loading="loading"
      size="small"
      :row-key="row => row.key"
      default-expand-all
    />
    <NModal v-model:show="visible" preset="card" :title="editingId ? '编辑能力' : '新增能力'" class="w-560px">
      <NForm :model="model" label-placement="left" :label-width="100">
        <NSpace vertical>
          <NFormItem label="所属模块" path="module">
            <NSelect v-model:value="model.module" :options="moduleOptions" placeholder="请选择所属模块" />
          </NFormItem>
          <NFormItem label="能力编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入能力编码" :disabled="!!editingId" />
          </NFormItem>
          <NFormItem label="能力名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入能力名称" />
          </NFormItem>
          <NFormItem label="能力类型" path="kind">
            <NSelect v-model:value="model.kind" :options="kindOptions" placeholder="请选择能力类型" />
          </NFormItem>
          <NFormItem label="状态" path="status">
            <NSelect v-model:value="model.status" :options="statusOptions" placeholder="请选择状态" />
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
