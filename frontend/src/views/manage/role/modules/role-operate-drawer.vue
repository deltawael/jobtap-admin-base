<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import type { RoleModel } from '@/service/api';
import { createRole, fetchGetCapabilities, fetchGetRoleTemplates, updateRole } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'RoleOperateDrawer' });

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.Role | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'submitted'): void }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const title = computed(() => ({ add: '新增角色', edit: '编辑角色' })[props.operateType]);
const loading = ref(false);
const templateOptions = ref<CommonType.Option<string>[]>([]);
const capabilityOptions = ref<CommonType.Option<string>[]>([]);
const templateCapabilityMap = ref<Record<string, string[]>>({});
const model: RoleModel = reactive(createDefaultModel());

function createDefaultModel(): RoleModel {
  return { name: '', code: '', description: '', status: null, templateId: null, capabilityIds: [], scopePolicies: [] };
}

const rules: Record<'name' | 'code' | 'status', App.Global.FormRule> = {
  name: defaultRequiredRule,
  code: defaultRequiredRule,
  status: defaultRequiredRule
};

function createScopePolicy(): Api.SystemManage.ScopePolicy {
  return { capabilityId: '', scopeType: 'all', scopeValue: null, effect: 'allow', description: null };
}

function handleInitModel() {
  Object.assign(model, createDefaultModel());
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      id: props.rowData.id,
      name: props.rowData.name,
      code: props.rowData.code,
      description: props.rowData.description,
      status: props.rowData.status,
      templateId: props.rowData.templateId,
      capabilityIds: props.rowData.capabilityIds || [],
      scopePolicies: props.rowData.scopePolicies || []
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function loadOptions() {
  loading.value = true;
  const [{ data: templates }, { data: capabilities }] = await Promise.all([
    fetchGetRoleTemplates(),
    fetchGetCapabilities({ module: 'tenant' })
  ]);
  templateOptions.value = (templates || [])
    .filter(item => item.actorType !== 'system_admin')
    .map(item => ({ label: `${item.name} (${item.code})`, value: item.id }));
  templateCapabilityMap.value = Object.fromEntries((templates || []).map(item => [item.id, item.capabilityIds || []]));
  capabilityOptions.value = (capabilities || []).map(item => ({
    label: `${item.module} / ${item.name} (${item.code})`,
    value: item.id
  }));
  loading.value = false;
}

function handleTemplateChange(value: string | null) {
  if (!value) return;
  const templateCapabilities = templateCapabilityMap.value[value] || [];
  model.capabilityIds = Array.from(new Set([...(model.capabilityIds || []), ...templateCapabilities]));
}

function handleAddScopePolicy() {
  model.scopePolicies = [...(model.scopePolicies || []), createScopePolicy()];
}

function handleRemoveScopePolicy(index: number) {
  model.scopePolicies = (model.scopePolicies || []).filter((_, idx) => idx !== index);
}

async function handleSubmit() {
  await validate();
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

watch(visible, async value => {
  if (value) {
    await loadOptions();
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="520">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules">
          <NFormItem label="角色名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入角色名称" />
          </NFormItem>
          <NFormItem label="角色编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入角色编码" />
          </NFormItem>
          <NFormItem label="模板" path="templateId">
            <NSelect
              v-model:value="model.templateId"
              clearable
              :options="templateOptions"
              placeholder="请选择角色模板"
              @update:value="handleTemplateChange"
            />
          </NFormItem>
          <NFormItem label="能力配置" path="capabilityIds">
            <NSelect
              v-model:value="model.capabilityIds"
              multiple
              clearable
              filterable
              :options="capabilityOptions"
              placeholder="请选择能力"
            />
          </NFormItem>
          <NFormItem label="Scope配置">
            <div class="w-full flex-col gap-12px">
              <NButton type="primary" dashed @click="handleAddScopePolicy">新增Scope规则</NButton>
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
                    placeholder="选择Scope类型"
                  />
                  <NInput v-model:value="item.scopeValue" placeholder="Scope值，可为空" />
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
