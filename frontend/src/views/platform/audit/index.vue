<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchGetAuditLogList } from '@/service/api';

const loading = ref(false);
const data = ref<Api.SystemManage.AuditLog[]>([]);

async function loadData() {
  loading.value = true;
  const { data: result } = await fetchGetAuditLogList({ current: 1, size: 100 });
  data.value = result?.records || [];
  loading.value = false;
}

onMounted(loadData);
</script>

<template>
  <NCard title="平台审计" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra><NButton @click="loadData">刷新</NButton></template>
    <NDataTable
      :columns="[
        { key: 'action', title: '动作' },
        { key: 'resourceType', title: '资源类型' },
        { key: 'actorUsername', title: '操作者' },
        { key: 'tenantId', title: '租户' },
        { key: 'createdAt', title: '时间' }
      ]"
      :data="data"
      :loading="loading"
      size="small"
    />
  </NCard>
</template>
