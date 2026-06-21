<script setup lang="ts">
import { computed, reactive } from 'vue';
import { brandConfig } from '@/config/brand';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'PwdLogin'
});

const authStore = useAuthStore();
const { formRef, validate } = useNaiveForm();
const showDemoAccounts = brandConfig.login.showDemoAccounts;

interface FormModel {
  identifier: string;
  password: string;
}

const model: FormModel = reactive({
  identifier: showDemoAccounts ? brandConfig.demoAccounts.super.identifier : '',
  password: showDemoAccounts ? '123456' : ''
});

const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
  const { formRules } = useFormRules();

  return {
    identifier: formRules.userName,
    password: formRules.pwd
  };
});

async function handleSubmit() {
  await validate();
  await authStore.login(model.identifier, model.password);
}

type AccountKey = 'super' | 'admin' | 'user';

interface Account {
  key: AccountKey;
  label: string;
  identifier: string;
  password: string;
}

const accounts = computed<Account[]>(() => [
  {
    key: 'super',
    label: $t('page.login.pwdLogin.superAdmin'),
    identifier: brandConfig.demoAccounts.super.identifier,
    password: '123456'
  },
  {
    key: 'admin',
    label: $t('page.login.pwdLogin.admin'),
    identifier: brandConfig.demoAccounts.admin.identifier,
    password: '123456'
  },
  {
    key: 'user',
    label: $t('page.login.pwdLogin.user'),
    identifier: brandConfig.demoAccounts.user.identifier,
    password: '123456'
  }
]);

async function handleAccountLogin(account: Account) {
  await authStore.login(account.identifier, account.password);
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
    <NFormItem path="identifier">
      <NInput v-model:value="model.identifier" :placeholder="$t('page.login.common.userNamePlaceholder')" />
    </NFormItem>
    <NFormItem path="password">
      <NInput
        v-model:value="model.password"
        type="password"
        show-password-on="click"
        :placeholder="$t('page.login.common.passwordPlaceholder')"
      />
    </NFormItem>
    <NSpace vertical :size="24">
      <div class="flex-y-center">
        <NCheckbox>{{ $t('page.login.pwdLogin.rememberMe') }}</NCheckbox>
      </div>
      <NButton type="primary" size="large" round block :loading="authStore.loginLoading" @click="handleSubmit">
        {{ $t('common.confirm') }}
      </NButton>
      <template v-if="showDemoAccounts">
        <NDivider class="text-14px text-#666 !m-0">{{ $t('page.login.pwdLogin.otherAccountLogin') }}</NDivider>
        <div class="flex-center gap-12px">
          <NButton v-for="item in accounts" :key="item.key" type="primary" @click="handleAccountLogin(item)">
            {{ item.label }}
          </NButton>
        </div>
      </template>
    </NSpace>
  </NForm>
</template>

<style scoped></style>
