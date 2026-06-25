<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import type { RoleModel } from '@/service/api';
import { createRole, fetchGetCapabilities, fetchGetRoleTemplates, fetchGetTenants, updateRole } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { type CapabilityTreeNode, buildCapabilityTree, normalizeCapabilityIds } from '@/utils/capability';
import { $t } from '@/locales';

defineOptions({ name: 'RoleOperateDrawer' });

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.Role | null;
}

const PLATFORM_TENANT_OPTION_VALUE = '__platform__';

type TenantSelectValue = string | typeof PLATFORM_TENANT_OPTION_VALUE | null;

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'submitted'): void }>();
const visible = defineModel<boolean>('visible', { default: false });
const authStore = useAuthStore();
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const title = computed(() => ({ add: '新增角色', edit: '编辑角色' })[props.operateType]);
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const loading = ref(false);
const templates = ref<Api.SystemManage.RoleTemplate[]>([]);
const capabilities = ref<Api.SystemManage.Capability[]>([]);
const tenants = ref<Api.SystemManage.Tenant[]>([]);
const tenantSelectValue = ref<TenantSelectValue>(PLATFORM_TENANT_OPTION_VALUE);
const extraCapabilityIds = ref<string[]>([]);
const selectedCapabilityKeys = ref<string[]>([]);
const model: RoleModel = reactive(createDefaultModel());

function createDefaultModel(): RoleModel {
  return {
    name: '',
    code: '',
    description: '',
    status: null,
    tenantId: null,
    templateId: null,
    capabilityIds: [],
    scopePolicies: []
  };
}

const rules: Record<'name' | 'code' | 'status', App.Global.FormRule> = {
  name: defaultRequiredRule,
  code: defaultRequiredRule,
  status: defaultRequiredRule
};

const selectedTenantId = computed<string | null>(() => {
  if (!isSystemAdmin.value) return authStore.userInfo.tenantId ?? null;
  return normalizeTenantSelectValue(tenantSelectValue.value);
});

const templateCapabilityMap = computed<Record<string, string[]>>(() =>
  Object.fromEntries(templates.value.map(item => [item.id, item.capabilityIds || []]))
);

const availableTemplateRecords = computed(() =>
  templates.value.filter(item =>
    selectedTenantId.value === null ? item.actorType === 'system_admin' : item.actorType !== 'system_admin'
  )
);

const templateOptions = computed<CommonType.Option<string>[]>(() =>
  availableTemplateRecords.value.map(item => ({ label: `${item.name} (${item.code})`, value: item.id }))
);

const rawCapabilityTree = computed(() =>
  buildCapabilityTree(
    capabilities.value.filter(item => (selectedTenantId.value === null ? true : item.module === 'tenant'))
  )
);

const templateCapabilityIds = computed(() => {
  if (!model.templateId) return [];
  return templateCapabilityMap.value[model.templateId] || [];
});

const selectedCapabilityIds = computed(() =>
  Array.from(new Set([...templateCapabilityIds.value, ...extraCapabilityIds.value]))
);

const capabilityTree = computed<CapabilityTreeNode[]>(() => {
  const lockedIds = new Set(templateCapabilityIds.value);
  return rawCapabilityTree.value.map(node => decorateCapabilityTreeNode(node, lockedIds));
});

const capabilityOptions = computed<CommonType.Option<string>[]>(() =>
  collectCapabilityLeafNodes(rawCapabilityTree.value).map(item => ({
    label: `${item.module === 'platform' ? '平台侧' : '租户侧'} / ${item.label} (${item.code})`,
    value: item.value
  }))
);

const tenantOptions = computed<CommonType.Option<string>[]>(() => [
  { label: '平台', value: PLATFORM_TENANT_OPTION_VALUE },
  ...tenants.value.map(item => ({ label: item.name, value: item.id }))
]);

function createScopePolicy(): Api.SystemManage.ScopePolicy {
  return { capabilityId: '', scopeType: 'all', scopeValue: null, effect: 'allow', description: null };
}

function normalizeTenantSelectValue(value: TenantSelectValue) {
  if (value === PLATFORM_TENANT_OPTION_VALUE || value === null) return null;
  return value;
}

function collectCapabilityLeafNodes(nodes: CapabilityTreeNode[]): CapabilityTreeNode[] {
  return nodes.flatMap(node =>
    node.nodeType === 'capability' ? [node] : collectCapabilityLeafNodes(node.children ?? [])
  );
}

function decorateCapabilityTreeNode(node: CapabilityTreeNode, lockedIds: Set<string>): CapabilityTreeNode {
  return {
    ...node,
    checkboxDisabled: node.nodeType === 'capability' ? lockedIds.has(node.value) : false,
    children: node.children?.map(child => decorateCapabilityTreeNode(child, lockedIds))
  };
}

function renderCapabilityLabel({ option }: any) {
  const treeNode = option as CapabilityTreeNode;
  return h('div', { class: 'flex items-center gap-8px py-2px' }, [
    h('span', { class: 'text-sm text-[#111827]' }, treeNode.label),
    h('span', { class: 'text-xs text-[#6b7280]' }, treeNode.code)
  ]);
}

function syncSelectedCapabilities() {
  selectedCapabilityKeys.value = [...selectedCapabilityIds.value];
  model.capabilityIds = [...selectedCapabilityIds.value];
}

function syncExtraCapabilitiesFromSelectedKeys(keys: string[]) {
  const normalizedIds = normalizeCapabilityIds(keys, rawCapabilityTree.value);
  const lockedIds = new Set(templateCapabilityIds.value);
  extraCapabilityIds.value = normalizedIds.filter(id => !lockedIds.has(id));
}

function handleInitModel() {
  Object.assign(model, createDefaultModel());
  extraCapabilityIds.value = [];
  tenantSelectValue.value = PLATFORM_TENANT_OPTION_VALUE;

  if (props.operateType === 'edit' && props.rowData) {
    const templateIds = templateCapabilityMap.value[props.rowData.templateId || ''] || [];
    const capabilityIds = props.rowData.capabilityIds || [];

    Object.assign(model, {
      id: props.rowData.id,
      name: props.rowData.name,
      code: props.rowData.code,
      description: props.rowData.description || '',
      status: props.rowData.status,
      tenantId: props.rowData.tenantId,
      templateId: props.rowData.templateId,
      capabilityIds,
      scopePolicies: props.rowData.scopePolicies || []
    });

    tenantSelectValue.value = props.rowData.tenantId ?? PLATFORM_TENANT_OPTION_VALUE;
    extraCapabilityIds.value = capabilityIds.filter(id => !templateIds.includes(id));
  } else {
    const defaultTenantId = isSystemAdmin.value ? null : (authStore.userInfo.tenantId ?? null);
    model.tenantId = defaultTenantId;
    tenantSelectValue.value = defaultTenantId ?? PLATFORM_TENANT_OPTION_VALUE;
  }

  syncSelectedCapabilities();
}

function closeDrawer() {
  visible.value = false;
}

async function loadOptions() {
  loading.value = true;
  const requests = [fetchGetRoleTemplates(), fetchGetCapabilities()] as const;
  const tenantRequest = isSystemAdmin.value ? fetchGetTenants() : Promise.resolve({ data: [], error: null } as any);
  const [{ data: templateData }, { data: capabilityData }, { data: tenantData }] = await Promise.all([
    ...requests,
    tenantRequest
  ]);

  templates.value = templateData || [];
  capabilities.value = capabilityData || [];
  tenants.value = tenantData || [];
  loading.value = false;
}

function handleTenantChange(value: TenantSelectValue) {
  tenantSelectValue.value = value;
  model.tenantId = normalizeTenantSelectValue(value);

  const availableTemplateIds = new Set(availableTemplateRecords.value.map(item => item.id));
  if (model.templateId && !availableTemplateIds.has(model.templateId)) {
    model.templateId = null;
  }
}

function handleTemplateChange(value: string | null) {
  model.templateId = value;
  syncSelectedCapabilities();
}

function handleCapabilityTreeCheck(keys: Array<string | number>) {
  syncExtraCapabilitiesFromSelectedKeys((keys || []).map(item => String(item)));
}

function handleAddScopePolicy() {
  model.scopePolicies = [...(model.scopePolicies || []), createScopePolicy()];
}

function handleRemoveScopePolicy(index: number) {
  model.scopePolicies = (model.scopePolicies || []).filter((_, idx) => idx !== index);
}

async function handleSubmit() {
  await validate();
  model.tenantId = selectedTenantId.value;
  if (isSystemAdmin.value && selectedTenantId.value === null && !model.templateId) {
    window.$message?.warning('平台角色必须选择系统管理员模板');
    return;
  }
  model.capabilityIds = [...selectedCapabilityIds.value];

  if (props.operateType === 'add') {
    const { error } = await createRole(model);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await updateRole(model);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }
  closeDrawer();
  emit('submitted');
}

watch(
  [templateCapabilityIds, extraCapabilityIds],
  () => {
    syncSelectedCapabilities();
  },
  { deep: true }
);

watch(
  rawCapabilityTree,
  tree => {
    const allowedIds = new Set(collectCapabilityLeafNodes(tree).map(item => item.value));
    extraCapabilityIds.value = extraCapabilityIds.value.filter(id => allowedIds.has(id));
  },
  { deep: true }
);

watch(
  [selectedTenantId, availableTemplateRecords],
  () => {
    model.tenantId = selectedTenantId.value;
    if (model.templateId && !availableTemplateRecords.value.some(item => item.id === model.templateId)) {
      model.templateId = null;
    }
  },
  { deep: true }
);

watch(visible, async value => {
  if (value) {
    await loadOptions();
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="560">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="92">
          <NFormItem v-if="isSystemAdmin" label="所属租户" path="tenantId">
            <NSelect
              v-model:value="tenantSelectValue"
              :disabled="props.operateType === 'edit'"
              :options="tenantOptions"
              placeholder="请选择所属租户"
              @update:value="handleTenantChange"
            />
          </NFormItem>
          <NFormItem label="角色名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入角色名称" />
          </NFormItem>
          <NFormItem label="角色编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入角色编码" />
          </NFormItem>
          <NFormItem label="角色模板" path="templateId">
            <NSelect
              v-model:value="model.templateId"
              clearable
              :options="templateOptions"
              placeholder="请选择角色模板"
              @update:value="handleTemplateChange"
            />
          </NFormItem>
          <NFormItem label="能力配置" path="capabilityIds">
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
                @update:checked-keys="handleCapabilityTreeCheck"
              />
            </div>
          </NFormItem>
          <NFormItem label="数据范围配置">
            <div class="w-full flex-col gap-12px">
              <NButton type="primary" dashed @click="handleAddScopePolicy">新增数据范围规则</NButton>
              <div
                v-for="(item, index) in model.scopePolicies || []"
                :key="index"
                class="border border-[#e5e7eb] rounded-8px p-12px"
              >
                <NSpace vertical>
                  <NSelect
                    v-model:value="item.capabilityId"
                    filterable
                    :options="capabilityOptions"
                    placeholder="选择能力"
                  />
                  <NSelect
                    v-model:value="item.scopeType"
                    :options="[
                      { label: '全部', value: 'all' },
                      { label: '本人', value: 'self' },
                      { label: '区域', value: 'region' },
                      { label: '部门', value: 'department' },
                      { label: '自定义', value: 'custom' }
                    ]"
                    placeholder="选择数据范围类型"
                  />
                  <NInput v-model:value="item.scopeValue" placeholder="范围值，可为空" />
                  <NSelect
                    v-model:value="item.effect"
                    :options="[
                      { label: '允许', value: 'allow' },
                      { label: '拒绝', value: 'deny' }
                    ]"
                    placeholder="选择效果"
                  />
                  <NInput v-model:value="item.description" placeholder="规则说明" />
                  <NButton type="error" text @click="handleRemoveScopePolicy(index)">删除规则</NButton>
                </NSpace>
              </div>
            </div>
          </NFormItem>
          <NFormItem :label="$t('page.manage.role.roleStatus')" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio
                v-for="item in enableStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItem>
          <NFormItem :label="$t('page.manage.role.roleDesc')" path="description">
            <NInput v-model:value="model.description" :placeholder="$t('page.manage.role.form.roleDesc')" />
          </NFormItem>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
