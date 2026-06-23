<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import type { RoleModel } from '@/service/api';
import { createRole, fetchGetCapabilities, fetchGetRoleTemplates, updateRole } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.Role | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.manage.role.addRole'),
    edit: $t('page.manage.role.editRole')
  };
  return titles[props.operateType];
});

const loading = ref(false);
const templateOptions = ref<CommonType.Option<string>[]>([]);
const capabilityOptions = ref<CommonType.Option<string>[]>([]);
const templateCapabilityMap = ref<Record<string, string[]>>({});

const model: RoleModel = reactive(createDefaultModel());

function createDefaultModel(): RoleModel {
  return {
    name: '',
    code: '',
    description: '',
    status: null,
    templateId: null,
    capabilityIds: []
  };
}

type RuleKey = Exclude<keyof RoleModel, 'description' | 'templateId' | 'capabilityIds' | 'id'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
  code: defaultRequiredRule,
  status: defaultRequiredRule
};

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
      capabilityIds: props.rowData.capabilityIds || []
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
    fetchGetCapabilities()
  ]);

  templateOptions.value = (templates || []).map(item => ({
    label: `${item.name} (${item.code})`,
    value: item.id
  }));
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
  <NDrawer v-model:show="visible" display-directive="show" :width="420">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules">
          <NFormItem :label="$t('page.manage.role.roleName')" path="name">
            <NInput v-model:value="model.name" :placeholder="$t('page.manage.role.form.roleName')" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.role.roleCode')" path="code">
            <NInput v-model:value="model.code" :placeholder="$t('page.manage.role.form.roleCode')" />
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
