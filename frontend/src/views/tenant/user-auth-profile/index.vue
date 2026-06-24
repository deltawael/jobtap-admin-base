<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  fetchGetCapabilities,
  fetchGetRoleList,
  fetchGetUserAuthProfile,
  fetchGetUserList,
  updateUserAuthProfile
} from '@/service/api';

const loading = ref(false);
const drawerVisible = ref(false);
const currentUserId = ref<string>('');
const users = ref<Api.SystemManage.User[]>([]);
const roleOptions = ref<CommonType.Option<string>[]>([]);
const capabilityOptions = ref<CommonType.Option<string>[]>([]);
const userOptions = ref<CommonType.Option<string>[]>([]);

const scopeTypeOptions: CommonType.Option[] = [
  { label: '全部', value: 'all' },
  { label: '本人', value: 'self' },
  { label: '区域', value: 'region' },
  { label: '部门', value: 'department' },
  { label: '自定义', value: 'custom' }
];

const effectOptions: CommonType.Option[] = [
  { label: '允许', value: 'allow' },
  { label: '拒绝', value: 'deny' }
];

const delegationStatusOptions: CommonType.Option[] = [
  { label: '生效', value: 'active' },
  { label: '过期', value: 'expired' },
  { label: '撤销', value: 'revoked' }
];

const model = reactive({
  tenantId: null as string | null,
  roles: [] as Api.SystemManage.Role[],
  capabilities: [] as Api.SystemManage.Capability[],
  scopes: [] as Api.SystemManage.ScopeOverride[],
  scopeOverrides: [] as Api.SystemManage.ScopeOverride[],
  delegations: [] as Api.SystemManage.Delegation[],
  linkedStaffId: null as string | null,
  roleIds: [] as string[]
});

const userAuthProfileColumns: DataTableColumns<Api.SystemManage.User> = [
  { key: 'username', title: '用户名' },
  { key: 'nickName', title: '昵称' },
  { key: 'roleIds', title: '角色数', render: row => row.roleIds?.length || 0 },
  {
    key: 'operate',
    title: '操作',
    render: row =>
      h(
        NButton,
        { type: 'primary', ghost: true, size: 'small', onClick: () => openProfile(row.id) },
        { default: () => '编辑授权档案' }
      )
  }
];

async function loadOptions() {
  const [{ data: roles }, { data: capabilities }, { data: userList }] = await Promise.all([
    fetchGetRoleList({ current: 1, size: 200, status: 'ENABLED' }),
    fetchGetCapabilities({ module: 'tenant' }),
    fetchGetUserList({ current: 1, size: 200 })
  ]);
  roleOptions.value = (roles?.records || []).map(item => ({ label: `${item.name} (${item.code})`, value: item.id }));
  capabilityOptions.value = (capabilities || []).map(item => ({
    label: `${item.name} (${item.code})`,
    value: item.id
  }));
  userOptions.value = (userList?.records || []).map(item => ({
    label: item.nickName || item.username,
    value: item.id
  }));
}

async function loadUsers() {
  loading.value = true;
  const { data } = await fetchGetUserList({ current: 1, size: 100 });
  users.value = data?.records || [];
  userOptions.value = (data?.records || []).map(item => ({ label: item.nickName || item.username, value: item.id }));
  loading.value = false;
}

function newScopeOverride(): Api.SystemManage.ScopeOverride {
  return { capabilityId: '', scopeType: 'all', scopeValue: null, effect: 'allow', startAt: null, endAt: null };
}

function newDelegation(): Api.SystemManage.Delegation {
  return {
    id: '',
    tenantId: '',
    fromUserId: '',
    toUserId: '',
    capabilityId: '',
    scopeType: 'all',
    scopeValue: null,
    status: 'active',
    startAt: '',
    endAt: '',
    createBy: '',
    createTime: '',
    updateBy: '',
    updateTime: ''
  };
}

async function openProfile(userId: string) {
  currentUserId.value = userId;
  const { data } = await fetchGetUserAuthProfile(userId);
  if (!data) return;
  Object.assign(model, {
    tenantId: data.tenantId,
    roles: data.roles || [],
    capabilities: data.capabilities || [],
    scopes: data.scopes || [],
    scopeOverrides: data.scopeOverrides || [],
    delegations: data.delegations || [],
    linkedStaffId: data.linkedStaffId || null,
    roleIds: data.roleIds || data.roles.map(item => item.id)
  });
  drawerVisible.value = true;
}

async function handleSubmit() {
  const payload = {
    roleIds: [...model.roleIds],
    linkedStaffId: model.linkedStaffId,
    scopeOverrides: model.scopeOverrides.map(item => ({
      id: item.id,
      capabilityId: item.capabilityId,
      scopeType: item.scopeType,
      scopeValue: item.scopeValue ?? null,
      effect: item.effect,
      startAt: item.startAt ?? null,
      endAt: item.endAt ?? null
    })),
    delegations: model.delegations.map(item => ({
      id: item.id,
      tenantId: model.tenantId || '',
      fromUserId: item.fromUserId,
      toUserId: currentUserId.value,
      capabilityId: item.capabilityId,
      scopeType: item.scopeType,
      scopeValue: item.scopeValue ?? null,
      status: item.status,
      startAt: item.startAt,
      endAt: item.endAt
    }))
  };
  const { error } = await updateUserAuthProfile(currentUserId.value, payload as any);
  if (error) return;
  drawerVisible.value = false;
  await loadUsers();
}

onMounted(async () => {
  await Promise.all([loadOptions(), loadUsers()]);
});
</script>

<template>
  <NCard title="用户授权档案" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra><NButton @click="loadUsers">刷新</NButton></template>
    <NDataTable :columns="userAuthProfileColumns" :data="users" :loading="loading" size="small" />
    <NDrawer v-model:show="drawerVisible" :width="720">
      <NDrawerContent title="编辑授权档案" closable>
        <NForm label-placement="left" :label-width="110">
          <NSpace vertical>
            <NFormItem label="角色分配">
              <NSelect
                v-model:value="model.roleIds"
                multiple
                filterable
                :options="roleOptions"
                placeholder="请选择角色"
              />
            </NFormItem>
            <NFormItem label="关联员工ID">
              <NInput v-model:value="model.linkedStaffId" placeholder="请输入关联员工ID" />
            </NFormItem>
            <div class="border border-[#e5e7eb] rounded-8px p-12px">
              <NSpace justify="space-between" class="mb-12px">
                <span>Scope 覆盖</span>
                <NButton
                  type="primary"
                  text
                  @click="model.scopeOverrides = [...model.scopeOverrides, newScopeOverride()]"
                >
                  新增
                </NButton>
              </NSpace>
              <div
                v-for="(item, index) in model.scopeOverrides"
                :key="index"
                class="mb-12px rounded-8px bg-[#f8fafc] p-12px"
              >
                <NForm label-placement="left" :label-width="110">
                  <NSpace vertical>
                    <NFormItem label="能力">
                      <NSelect
                        v-model:value="item.capabilityId"
                        filterable
                        :options="capabilityOptions"
                        placeholder="请选择能力"
                      />
                    </NFormItem>
                    <NFormItem label="Scope类型">
                      <NSelect
                        v-model:value="item.scopeType"
                        :options="scopeTypeOptions"
                        placeholder="请选择Scope类型"
                      />
                    </NFormItem>
                    <NFormItem label="Scope值">
                      <NInput v-model:value="item.scopeValue" placeholder="请输入Scope值" />
                    </NFormItem>
                    <NFormItem label="效果">
                      <NSelect v-model:value="item.effect" :options="effectOptions" placeholder="请选择效果" />
                    </NFormItem>
                    <NFormItem label="开始时间">
                      <NInput v-model:value="item.startAt" placeholder="例如 2026-06-23T00:00:00.000Z" />
                    </NFormItem>
                    <NFormItem label="结束时间">
                      <NInput v-model:value="item.endAt" placeholder="例如 2026-06-30T23:59:59.000Z" />
                    </NFormItem>
                    <NButton
                      type="error"
                      text
                      @click="model.scopeOverrides = model.scopeOverrides.filter((_, idx) => idx !== index)"
                    >
                      删除
                    </NButton>
                  </NSpace>
                </NForm>
              </div>
            </div>
            <div class="border border-[#e5e7eb] rounded-8px p-12px">
              <NSpace justify="space-between" class="mb-12px">
                <span>委派授权</span>
                <NButton type="primary" text @click="model.delegations = [...model.delegations, newDelegation()]">
                  新增
                </NButton>
              </NSpace>
              <div
                v-for="(item, index) in model.delegations"
                :key="index"
                class="mb-12px rounded-8px bg-[#f8fafc] p-12px"
              >
                <NForm label-placement="left" :label-width="110">
                  <NSpace vertical>
                    <NFormItem label="委派来源用户">
                      <NSelect
                        v-model:value="item.fromUserId"
                        filterable
                        :options="userOptions"
                        placeholder="请选择来源用户"
                      />
                    </NFormItem>
                    <NFormItem label="能力">
                      <NSelect
                        v-model:value="item.capabilityId"
                        filterable
                        :options="capabilityOptions"
                        placeholder="请选择能力"
                      />
                    </NFormItem>
                    <NFormItem label="Scope类型">
                      <NSelect
                        v-model:value="item.scopeType"
                        :options="scopeTypeOptions"
                        placeholder="请选择Scope类型"
                      />
                    </NFormItem>
                    <NFormItem label="Scope值">
                      <NInput v-model:value="item.scopeValue" placeholder="请输入Scope值" />
                    </NFormItem>
                    <NFormItem label="状态">
                      <NSelect
                        v-model:value="item.status"
                        :options="delegationStatusOptions"
                        placeholder="请选择状态"
                      />
                    </NFormItem>
                    <NFormItem label="开始时间">
                      <NInput v-model:value="item.startAt" placeholder="例如 2026-06-23T00:00:00.000Z" />
                    </NFormItem>
                    <NFormItem label="结束时间">
                      <NInput v-model:value="item.endAt" placeholder="例如 2026-06-30T23:59:59.000Z" />
                    </NFormItem>
                    <NButton
                      type="error"
                      text
                      @click="model.delegations = model.delegations.filter((_, idx) => idx !== index)"
                    >
                      删除
                    </NButton>
                  </NSpace>
                </NForm>
              </div>
            </div>
          </NSpace>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="drawerVisible = false">取消</NButton>
            <NButton type="primary" @click="handleSubmit">保存</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NCard>
</template>
