<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetTenants } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.SystemManage.UserSearchParams>('model', { required: true });
const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const tenantFilterValue = ref<string>('all');
const tenantOptions = ref<CommonType.Option<string>[]>([
  { label: '全部', value: 'all' },
  { label: '平台', value: 'platform' }
]);

type RuleKey = Extract<keyof Api.SystemManage.UserSearchParams, 'email' | 'phoneNumber'>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => {
  const { patternRules } = useFormRules(); // inside computed to make locale reactive

  return {
    email: patternRules.email,
    phoneNumber: patternRules.phone
  };
});

async function loadTenantOptions() {
  if (!isSystemAdmin.value) return;
  const { data } = await fetchGetTenants();
  tenantOptions.value = [
    { label: '全部', value: 'all' },
    { label: '平台', value: 'platform' },
    ...((data || []).map(item => ({ label: item.name, value: item.id })) as CommonType.Option<string>[])
  ];
}

function syncTenantFilterValue() {
  if (!isSystemAdmin.value) return;
  if (model.value.tenantScope === 'platform') {
    tenantFilterValue.value = 'platform';
    return;
  }
  if (model.value.tenantScope === 'tenant' && model.value.tenantId) {
    tenantFilterValue.value = model.value.tenantId;
    return;
  }
  tenantFilterValue.value = 'all';
}

function handleTenantFilterChange(value: string) {
  tenantFilterValue.value = value;
  if (value === 'all') {
    model.value.tenantScope = 'all';
    model.value.tenantId = null;
    return;
  }
  if (value === 'platform') {
    model.value.tenantScope = 'platform';
    model.value.tenantId = null;
    return;
  }
  model.value.tenantScope = 'tenant';
  model.value.tenantId = value;
}

async function reset() {
  await restoreValidation();
  if (isSystemAdmin.value) handleTenantFilterChange('all');
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}

onMounted(async () => {
  await loadTenantOptions();
  syncTenantFilterValue();
});
</script>

<template>
  <NCard :title="$t('common.search')" :bordered="false" size="small" class="card-wrapper">
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userName')" path="username" class="pr-24px">
          <NInput v-model:value="model.username" :placeholder="$t('page.manage.user.form.userName')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.nickName')" path="nickName" class="pr-24px">
          <NInput v-model:value="model.nickName" :placeholder="$t('page.manage.user.form.nickName')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userPhone')" path="phoneNumber" class="pr-24px">
          <NInput v-model:value="model.phoneNumber" :placeholder="$t('page.manage.user.form.userPhone')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userEmail')" path="email" class="pr-24px">
          <NInput v-model:value="model.email" :placeholder="$t('page.manage.user.form.userEmail')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userStatus')" path="userStatus" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.manage.user.form.userStatus')"
            :options="translateOptions(enableStatusOptions)"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi v-if="isSystemAdmin" span="24 s:12 m:6" label="所属租户" path="tenantId" class="pr-24px">
          <NSelect
            v-model:value="tenantFilterValue"
            :options="tenantOptions"
            placeholder="请选择所属租户"
            @update:value="handleTenantFilterChange"
          />
        </NFormItemGi>
        <NFormItemGi span="24 m:12" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t('common.reset') }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t('common.search') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
