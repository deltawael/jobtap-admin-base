<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetTenants } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.RoleSearchParams>('model', { required: true });
const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.userInfo.actorType === 'system_admin');
const tenantFilterValue = ref<string>('all');
const tenantOptions = ref<CommonType.Option<string>[]>([
  { label: '全部', value: 'all' },
  { label: '平台', value: 'platform' }
]);

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

function reset() {
  if (isSystemAdmin.value) handleTenantFilterChange('all');
  emit('reset');
}

function search() {
  emit('search');
}

onMounted(async () => {
  await loadTenantOptions();
  syncTenantFilterValue();
});
</script>

<template>
  <NCard :title="$t('common.search')" :bordered="false" size="small" class="card-wrapper">
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.role.roleName')" path="name" class="pr-24px">
          <NInput v-model:value="model.name" :placeholder="$t('page.manage.role.form.roleName')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.role.roleCode')" path="code" class="pr-24px">
          <NInput v-model:value="model.code" :placeholder="$t('page.manage.role.form.roleCode')" />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.role.roleStatus')" path="status" class="pr-24px">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.manage.role.form.roleStatus')"
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
        <NFormItemGi span="24 s:12 m:6">
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
