<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { REG_EMAIL, REG_PHONE } from '@/constants/reg';
import { changeOwnPassword, fetchGetSelfProfile, updateSelfProfile } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getActorTypeLabel } from '@/utils/capability';
import { $t } from '@/locales';

defineOptions({
  name: 'UserCenterPage'
});

const authStore = useAuthStore();
const { toLogin } = useRouterPush();
const {
  formRef: profileFormRef,
  validate: validateProfile,
  restoreValidation: restoreProfileValidation
} = useNaiveForm();
const {
  formRef: passwordFormRef,
  validate: validatePassword,
  restoreValidation: restorePasswordValidation
} = useNaiveForm();
const { defaultRequiredRule, formRules, createConfirmPwdRule } = useFormRules();

const loading = ref(false);
const profile = ref<Api.SystemManage.SelfProfile | null>(null);

const profileModel = reactive({
  avatar: '',
  nickName: '',
  phoneNumber: '',
  email: ''
});

const passwordModel = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const profileRules = computed(() => ({
  nickName: defaultRequiredRule,
  phoneNumber: {
    trigger: ['input', 'blur'],
    validator: (_rule: App.Global.FormRule, value: string) => {
      if (!value?.trim()) return Promise.resolve();
      return REG_PHONE.test(value) ? Promise.resolve() : Promise.reject(new Error($t('form.phone.invalid')));
    }
  },
  email: {
    trigger: ['input', 'blur'],
    validator: (_rule: App.Global.FormRule, value: string) => {
      if (!value?.trim()) return Promise.resolve();
      return REG_EMAIL.test(value) ? Promise.resolve() : Promise.reject(new Error($t('form.email.invalid')));
    }
  }
}));

const passwordRules = computed(() => ({
  oldPassword: formRules.pwd,
  newPassword: [
    ...formRules.pwd,
    {
      trigger: ['input', 'blur'],
      validator: (_rule: App.Global.FormRule, value: string) => {
        if (value && value === passwordModel.oldPassword) {
          return Promise.reject(new Error($t('page.userCenter.passwordReuseError')));
        }
        return Promise.resolve();
      }
    }
  ],
  confirmPassword: createConfirmPwdRule(computed(() => passwordModel.newPassword))
}));

const tenantName = computed(() => profile.value?.tenantName || '平台');
const actorTypeLabel = computed(() =>
  profile.value ? getActorTypeLabel(profile.value.actorType as Api.SystemManage.RoleTemplate['actorType']) : '-'
);
const statusType = computed<NaiveUI.ThemeColor>(() => {
  return profile.value?.status === 'ENABLED' ? 'success' : 'warning';
});
const statusLabelKey = computed(() => {
  const status = profile.value?.status as Api.Common.EnableStatus | null | undefined;
  if (status === 'ENABLED' || status === 'DISABLED') {
    return enableStatusRecord[status];
  }
  return null;
});

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function resetPasswordForm() {
  passwordModel.oldPassword = '';
  passwordModel.newPassword = '';
  passwordModel.confirmPassword = '';
  restorePasswordValidation();
}

function syncProfileForm(data: Api.SystemManage.SelfProfile) {
  profileModel.avatar = data.avatar || '';
  profileModel.nickName = data.nickName;
  profileModel.phoneNumber = data.phoneNumber || '';
  profileModel.email = data.email || '';
  restoreProfileValidation();
}

async function loadProfile() {
  loading.value = true;
  const { data, error } = await fetchGetSelfProfile();
  loading.value = false;
  if (error || !data) return;
  profile.value = data;
  syncProfileForm(data);
}

async function handleSaveProfile() {
  await validateProfile();
  const { data, error } = await updateSelfProfile({
    avatar: normalizeOptionalText(profileModel.avatar),
    nickName: profileModel.nickName,
    phoneNumber: normalizeOptionalText(profileModel.phoneNumber),
    email: normalizeOptionalText(profileModel.email)
  });
  if (error) return;
  window.$message?.success($t('common.updateSuccess'));
  if (data) {
    profile.value = data;
    syncProfileForm(data);
  }
  await loadProfile();
}

async function handleChangePassword() {
  await validatePassword();
  const { error } = await changeOwnPassword({
    oldPassword: passwordModel.oldPassword,
    newPassword: passwordModel.newPassword
  });
  if (error) return;
  window.$message?.success($t('common.updateSuccess'));
  resetPasswordForm();
  await authStore.resetStore();
  await toLogin(undefined, '');
}

onMounted(loadProfile);
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <NCard :title="$t('page.userCenter.title')" :bordered="false" size="small" class="card-wrapper" :loading="loading">
      <NSpace vertical :size="20">
        <NDescriptions bordered label-placement="left" :column="2">
          <NDescriptionsItem :label="$t('page.userCenter.fields.username')">
            {{ profile?.username || '-' }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.userCenter.fields.tenantName')">
            {{ tenantName }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.userCenter.fields.actorType')">
            {{ actorTypeLabel }}
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.userCenter.fields.status')">
            <NTag v-if="profile?.status" :type="statusType">
              {{ statusLabelKey ? $t(statusLabelKey) : profile.status }}
            </NTag>
            <span v-else>-</span>
          </NDescriptionsItem>
          <NDescriptionsItem :label="$t('page.userCenter.fields.roles')" :span="2">
            <NSpace v-if="profile?.roles?.length">
              <NTag v-for="role in profile.roles" :key="role.id" type="info">{{ role.name }} ({{ role.code }})</NTag>
            </NSpace>
            <span v-else>-</span>
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider>{{ $t('page.userCenter.basicTitle') }}</NDivider>

        <NForm
          ref="profileFormRef"
          :model="profileModel"
          :rules="profileRules"
          label-placement="left"
          :label-width="96"
        >
          <NGrid :cols="1" responsive="screen" :x-gap="16">
            <NGi>
              <NFormItem :label="$t('page.userCenter.fields.avatar')" path="avatar">
                <NSpace vertical class="w-full">
                  <NInput
                    v-model:value="profileModel.avatar"
                    clearable
                    :placeholder="$t('page.userCenter.placeholders.avatar')"
                  />
                  <NAvatar :size="72" :src="profileModel.avatar || undefined">
                    <SvgIcon icon="ph:user-circle" class="text-32px text-primary" />
                  </NAvatar>
                </NSpace>
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem :label="$t('page.userCenter.fields.nickName')" path="nickName">
                <NInput
                  v-model:value="profileModel.nickName"
                  :placeholder="$t('page.userCenter.placeholders.nickName')"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem :label="$t('page.userCenter.fields.phoneNumber')" path="phoneNumber">
                <NInput
                  v-model:value="profileModel.phoneNumber"
                  :placeholder="$t('page.userCenter.placeholders.phoneNumber')"
                />
              </NFormItem>
            </NGi>
            <NGi>
              <NFormItem :label="$t('page.userCenter.fields.email')" path="email">
                <NInput v-model:value="profileModel.email" :placeholder="$t('page.userCenter.placeholders.email')" />
              </NFormItem>
            </NGi>
          </NGrid>
        </NForm>

        <div class="flex justify-end">
          <NButton type="primary" @click="handleSaveProfile">{{ $t('page.userCenter.saveProfile') }}</NButton>
        </div>
      </NSpace>
    </NCard>

    <NCard :title="$t('page.userCenter.passwordTitle')" :bordered="false" size="small" class="card-wrapper">
      <NSpace vertical :size="16">
        <NAlert type="warning" :show-icon="false">
          {{ $t('page.userCenter.reloginTip') }}
        </NAlert>
        <NForm
          ref="passwordFormRef"
          :model="passwordModel"
          :rules="passwordRules"
          label-placement="left"
          :label-width="96"
        >
          <NFormItem :label="$t('page.userCenter.fields.oldPassword')" path="oldPassword">
            <NInput
              v-model:value="passwordModel.oldPassword"
              type="password"
              show-password-on="click"
              :placeholder="$t('page.userCenter.placeholders.oldPassword')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.userCenter.fields.newPassword')" path="newPassword">
            <NInput
              v-model:value="passwordModel.newPassword"
              type="password"
              show-password-on="click"
              :placeholder="$t('page.userCenter.placeholders.newPassword')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.userCenter.fields.confirmPassword')" path="confirmPassword">
            <NInput
              v-model:value="passwordModel.confirmPassword"
              type="password"
              show-password-on="click"
              :placeholder="$t('page.userCenter.placeholders.confirmPassword')"
            />
          </NFormItem>
        </NForm>
        <div class="flex justify-end">
          <NButton type="primary" @click="handleChangePassword">{{ $t('page.userCenter.passwordTitle') }}</NButton>
        </div>
      </NSpace>
    </NCard>
  </div>
</template>
