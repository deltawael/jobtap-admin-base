<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import type { UserModel } from '@/service/api';
import { createUser, fetchGetRoleList, updateUser } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'UserOperateDrawer' });

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.User | null;
}

const props = defineProps<Props>();
interface Emits {
  (e: 'submitted'): void;
}
const emit = defineEmits<Emits>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const title = computed(
  () => ({ add: $t('page.manage.user.addUser'), edit: $t('page.manage.user.editUser') })[props.operateType]
);
const roleOptions = ref<CommonType.Option<string>[]>([]);
const roleOptionsLoading = ref(false);
let roleOptionsPromise: Promise<boolean> | null = null;
let initSequence = 0;
const model: UserModel = reactive(createDefaultModel());

function createDefaultModel(): UserModel {
  return {
    id: undefined,
    username: '',
    password: '',
    avatar: '',
    nickName: '',
    phoneNumber: '',
    email: '',
    status: null,
    roleIds: []
  };
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
async function ensureRoleOptionsLoaded(forceRefresh = false) {
  if (!forceRefresh && roleOptions.value.length > 0) return true;
  if (!forceRefresh && roleOptionsPromise) return roleOptionsPromise;
  roleOptionsLoading.value = true;
  roleOptionsPromise = (async () => {
    const { error, data } = await fetchGetRoleList({ current: 1, size: 100, status: 'ENABLED' });
    if (error || !data) {
      window.$message?.error($t('common.error'));
      return false;
    }
    roleOptions.value = data.records.map(item => ({ label: item.name, value: String(item.id) }));
    return true;
  })();
  try {
    return await roleOptionsPromise;
  } finally {
    roleOptionsLoading.value = false;
    roleOptionsPromise = null;
  }
}
function initFormModel() {
  Object.assign(model, createDefaultModel());
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      ...props.rowData,
      avatar: props.rowData.avatar ?? '',
      email: props.rowData.email ?? '',
      phoneNumber: props.rowData.phoneNumber ?? '',
      roleIds: normalizeRoleIds(props.rowData.roleIds),
      password: ''
    });
  }
}
function closeDrawer() {
  visible.value = false;
}
async function handleSubmit() {
  await validate();
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
  await ensureRoleOptionsLoaded();
  if (!visible.value || sequence !== initSequence) return;
  initFormModel();
  restoreValidation();
}
watch([visible, () => props.operateType, () => props.rowData?.id], async ([isVisible]) => {
  if (isVisible) await initializeDrawer();
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="420">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.manage.user.userName')" path="username">
          <NInput v-model:value="model.username" :placeholder="$t('page.manage.user.form.userName')" />
        </NFormItem>
        <NFormItem v-if="props.operateType === 'add'" label="Password" path="password">
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
