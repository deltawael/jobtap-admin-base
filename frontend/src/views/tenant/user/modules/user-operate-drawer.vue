<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import type { UserModel } from '@/service/api';
import { createUser, fetchGetRoleList, fetchGetTenants, updateUser } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'UserOperateDrawer' });

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.User | null;
}

const PLATFORM_TENANT_OPTION_VALUE = '__platform__';

type TenantSelectValue = string | typeof PLATFORM_TENANT_OPTION_VALUE | null;

const props = defineProps<Props>();
interface Emits {
  (e: 'submitted'): void;
}
const emit = defineEmits<Emits>();
const visible = defineModel<boolean>('visible', { default: false });
const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const title = computed(
  () => ({ add: $t('page.manage.user.addUser'), edit: $t('page.manage.user.editUser') })[props.operateType]
);
const roleOptions = ref<CommonType.Option<string>[]>([]);
const roleOptionsLoading = ref(false);
const tenants = ref<Api.SystemManage.Tenant[]>([]);
const tenantSelectValue = ref<TenantSelectValue>(PLATFORM_TENANT_OPTION_VALUE);
let initSequence = 0;
let lastRoleScopeKey = '';
const model: UserModel = reactive(createDefaultModel());

function createDefaultModel(): UserModel {
  return {
    id: undefined,
    username: '',
    password: '',
    tenantId: null,
    avatar: '',
    nickName: '',
    phoneNumber: '',
    email: '',
    status: null,
    roleIds: []
  };
}

const selectedTenantId = computed<string | null>(() => {
  if (!isSystemAdmin.value) return authStore.userInfo.tenantId ?? null;
  return normalizeTenantSelectValue(tenantSelectValue.value);
});

const tenantOptions = computed<CommonType.Option<string>[]>(() => [
  { label: '平台', value: PLATFORM_TENANT_OPTION_VALUE },
  ...tenants.value.map(item => ({ label: item.name, value: item.id }))
]);

function normalizeTenantSelectValue(value: TenantSelectValue) {
  if (value === PLATFORM_TENANT_OPTION_VALUE || value === null) return null;
  return value;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function normalizeRoleIds(roleIds: Array<string | null | undefined> | null | undefined) {
  const optionValues = new Set(roleOptions.value.map(item => item.value));
  return (roleIds ?? []).reduce<string[]>((acc, item) => {
    const normalized = item?.trim();
    if (normalized && optionValues.has(normalized)) acc.push(normalized);
    return acc;
  }, []);
}

const rules = computed(() => ({
  username: defaultRequiredRule,
  password: defaultRequiredRule,
  nickName: defaultRequiredRule,
  status: defaultRequiredRule,
  roleIds: {
    required: true,
    trigger: ['change', 'blur'],
    validator: (_rule: App.Global.FormRule, value: string[]) =>
      Array.isArray(value) && value.length > 0
        ? Promise.resolve()
        : Promise.reject(new Error($t('page.manage.user.form.userRole')))
  }
}));

function buildRoleListParams() {
  const params: Api.SystemManage.RoleSearchParams = {
    current: 1,
    size: 100,
    status: 'ENABLED',
    tenantScope: 'all',
    tenantId: null
  };
  if (!isSystemAdmin.value) return params;
  if (selectedTenantId.value === null) {
    params.tenantScope = 'platform';
    params.tenantId = null;
    return params;
  }
  params.tenantScope = 'tenant';
  params.tenantId = selectedTenantId.value;
  return params;
}

async function loadTenantOptions() {
  if (!isSystemAdmin.value) return;
  const { data } = await fetchGetTenants();
  tenants.value = data || [];
}

async function loadRoleOptions(forceRefresh = false) {
  const scopeKey = `${selectedTenantId.value ?? 'platform'}`;
  if (!forceRefresh && roleOptions.value.length > 0 && lastRoleScopeKey === scopeKey) return true;

  roleOptionsLoading.value = true;
  const { error, data } = await fetchGetRoleList(buildRoleListParams());
  roleOptionsLoading.value = false;

  if (error || !data) {
    window.$message?.error($t('common.error'));
    return false;
  }

  roleOptions.value = data.records.map(item => ({ label: `${item.name} (${item.code})`, value: String(item.id) }));
  lastRoleScopeKey = scopeKey;
  return true;
}

function initTenantValue() {
  let tenantId: string | null = null;

  if (props.operateType === 'edit' && props.rowData) {
    tenantId = props.rowData.tenantId;
  } else if (!isSystemAdmin.value) {
    tenantId = authStore.userInfo.tenantId ?? null;
  }

  model.tenantId = tenantId;
  tenantSelectValue.value = tenantId ?? PLATFORM_TENANT_OPTION_VALUE;
}

function initFormModel() {
  Object.assign(model, createDefaultModel());
  initTenantValue();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      id: props.rowData.id,
      username: props.rowData.username,
      tenantId: props.rowData.tenantId,
      avatar: props.rowData.avatar ?? '',
      nickName: props.rowData.nickName,
      phoneNumber: props.rowData.phoneNumber ?? '',
      email: props.rowData.email ?? '',
      status: props.rowData.status,
      roleIds: normalizeRoleIds(props.rowData.roleIds),
      password: ''
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleTenantChange(value: TenantSelectValue) {
  tenantSelectValue.value = value;
  model.tenantId = normalizeTenantSelectValue(value);
  model.roleIds = [];
  await loadRoleOptions(true);
}

async function handleSubmit() {
  await validate();
  model.tenantId = selectedTenantId.value;

  const payload: UserModel = {
    ...model,
    avatar: normalizeOptionalText(model.avatar),
    email: normalizeOptionalText(model.email),
    phoneNumber: normalizeOptionalText(model.phoneNumber)
  };

  if (props.operateType === 'add') {
    const { error } = await createUser(payload);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await updateUser(payload);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }
  closeDrawer();
  emit('submitted');
}

async function initializeDrawer() {
  initSequence += 1;
  const sequence = initSequence;
  await loadTenantOptions();
  initFormModel();
  const loaded = await loadRoleOptions(true);
  if (!visible.value || sequence !== initSequence || !loaded) return;
  if (props.operateType === 'edit' && props.rowData) {
    model.roleIds = normalizeRoleIds(props.rowData.roleIds);
  }
  restoreValidation();
}

watch([visible, () => props.operateType, () => props.rowData?.id], async ([isVisible]) => {
  if (isVisible) await initializeDrawer();
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="460">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
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
        <NFormItem :label="$t('page.manage.user.userName')" path="username">
          <NInput v-model:value="model.username" :placeholder="$t('page.manage.user.form.userName')" />
        </NFormItem>
        <NFormItem v-if="props.operateType === 'add'" label="密码" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="click"
            :placeholder="$t('page.manage.user.form.password')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.avatar')" path="avatar">
          <NSpace vertical class="w-full">
            <NInput v-model:value="model.avatar" clearable :placeholder="$t('page.manage.user.form.avatar')" />
            <NAvatar :size="64" :src="model.avatar || undefined">
              <SvgIcon icon="ph:user-circle" class="text-28px text-primary" />
            </NAvatar>
          </NSpace>
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.nickName')" path="nickName">
          <NInput v-model:value="model.nickName" :placeholder="$t('page.manage.user.form.nickName')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userRole')" path="roleIds">
          <NSelect
            v-model:value="model.roleIds"
            multiple
            filterable
            clearable
            :loading="roleOptionsLoading"
            :options="roleOptions"
            :placeholder="$t('page.manage.user.form.userRole')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userPhone')" path="phoneNumber">
          <NInput v-model:value="model.phoneNumber" :placeholder="$t('page.manage.user.form.userPhone')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userEmail')" path="email">
          <NInput v-model:value="model.email" :placeholder="$t('page.manage.user.form.userEmail')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
      </NForm>
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
