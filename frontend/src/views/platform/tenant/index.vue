<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { createTenant, fetchGetTenants } from '@/service/api';

const loading = ref(false);
const visible = ref(false);
const data = ref<Api.SystemManage.Tenant[]>([]);
const model = reactive<Api.SystemManage.TenantModel>({ code: '', name: '', description: '', status: 'ENABLED' });

async function loadData() {
  loading.value = true;
  const { data: records } = await fetchGetTenants();
  data.value = records || [];
  loading.value = false;
}

function openModal() {
  Object.assign(model, { code: '', name: '', description: '', status: 'ENABLED' });
  visible.value = true;
}

async function handleSubmit() {
  const { error } = await createTenant(model);
  if (error) return;
  visible.value = false;
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <NCard title="租户管理" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra>
      <NSpace>
        <NButton type="primary" @click="openModal">新增租户</NButton>
        <NButton @click="loadData">刷新</NButton>
      </NSpace>
    </template>
    <NDataTable
      :columns="[
        { key: 'code', title: '编码' },
        { key: 'name', title: '名称' },
        { key: 'description', title: '描述' },
        { key: 'status', title: '状态' }
      ]"
      :data="data"
      :loading="loading"
      size="small"
    />
    <NModal v-model:show="visible" preset="card" title="新增租户" class="w-480px">
      <NSpace vertical>
        <NInput v-model:value="model.code" placeholder="租户编码" />
        <NInput v-model:value="model.name" placeholder="租户名称" />
        <NInput v-model:value="model.description" placeholder="租户描述" />
      </NSpace>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
