<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { changeManagedUserPassword } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'UserPasswordModal' });

interface Props {
  rowData?: Api.SystemManage.User | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', { default: false });
const authStore = useAuthStore();
const { formRef, validate, restoreValidation } = useNaiveForm();
const { formRules, createConfirmPwdRule } = useFormRules();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');

const model = reactive({
  newPassword: '',
  confirmPassword: ''
});

const title = computed(() => {
  const userName = props.rowData?.username || '-';
  return `${$t('page.manage.user.passwordDialogTitle')} - ${userName}`;
});

const rules = computed(() => ({
  newPassword: formRules.pwd,
  confirmPassword: createConfirmPwdRule(computed(() => model.newPassword))
}));

const tenantLabel = computed(() => {
  if (!props.rowData) return '-';
  return props.rowData.tenantId ? props.rowData.tenantName || props.rowData.tenantId : '平台';
});

function resetModel() {
  model.newPassword = '';
  model.confirmPassword = '';
}

function closeModal() {
  visible.value = false;
}

async function handleSubmit() {
  if (!props.rowData?.id) return;
  await validate();
  const { error } = await changeManagedUserPassword(props.rowData.id, { newPassword: model.newPassword });
  if (error) return;
  window.$message?.success($t('common.updateSuccess'));
  resetModel();
  closeModal();
}

watch(visible, value => {
  if (!value) {
    resetModel();
    restoreValidation();
    return;
  }

  restoreValidation();
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="title" class="w-420px">
    <NSpace vertical :size="16">
      <NDescriptions bordered label-placement="left" :column="1">
        <NDescriptionsItem :label="$t('page.manage.user.userName')">
          {{ props.rowData?.username || '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="isSystemAdmin" :label="$t('page.userCenter.fields.tenantName')">
          {{ tenantLabel }}
        </NDescriptionsItem>
      </NDescriptions>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="96">
        <NFormItem :label="$t('page.userCenter.fields.newPassword')" path="newPassword">
          <NInput
            v-model:value="model.newPassword"
            type="password"
            show-password-on="click"
            :placeholder="$t('page.userCenter.placeholders.newPassword')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.userCenter.fields.confirmPassword')" path="confirmPassword">
          <NInput
            v-model:value="model.confirmPassword"
            type="password"
            show-password-on="click"
            :placeholder="$t('page.userCenter.placeholders.confirmPassword')"
          />
        </NFormItem>
      </NForm>
    </NSpace>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" @click="handleSubmit">{{ $t('page.manage.user.changePassword') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
