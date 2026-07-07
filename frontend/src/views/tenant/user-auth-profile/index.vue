<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  fetchGetCapabilities,
  fetchGetRoleList,
  fetchGetScopeDimensionRecords,
  fetchGetUserAuthProfile,
  fetchGetUserList,
  updateUserAuthProfile
} from '@/service/api';

defineOptions({ name: 'UserAuthProfilePage' });

const loading = ref(false);
const drawerVisible = ref(false);
const currentUserId = ref<string>('');
const users = ref<Api.SystemManage.User[]>([]);
const roles = ref<Api.SystemManage.Role[]>([]);
const capabilities = ref<Api.SystemManage.Capability[]>([]);
const roleOptions = ref<CommonType.Option<string>[]>([]);
const userOptions = ref<CommonType.Option<string>[]>([]);
const dimensionOptionMap = ref<Record<string, CommonType.Option<string>[]>>({});

const delegationStatusOptions: CommonType.Option[] = [
  { label: '生效', value: 'active' },
  { label: '过期', value: 'expired' },
  { label: '撤销', value: 'revoked' }
];

const model = reactive({
  userId: '',
  tenantId: null as string | null,
  roles: [] as Api.SystemManage.Role[],
  capabilities: [] as Api.SystemManage.Capability[],
  relationBindings: [] as Api.SystemManage.RelationBinding[],
  resolvedRelations: [] as Api.SystemManage.ResolvedRelation[],
  scopeAssignments: [] as Api.SystemManage.ScopeAssignment[],
  scopeCapabilities: [] as Api.SystemManage.ScopeCapability[],
  delegations: [] as Api.SystemManage.Delegation[],
  linkedStaffId: null as string | null,
  roleIds: [] as string[]
});

const capabilityMap = computed(() => new Map(capabilities.value.map(item => [item.id, item] as const)));

const delegationCapabilityOptions = computed<CommonType.Option<string>[]>(() =>
  capabilities.value
    .filter(item => (item.scopeTargets || []).some(target => target.dimensionEntityCode))
    .sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'))
    .map(item => ({
      label: `${item.name} (${item.code})`,
      value: item.id
    }))
);

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

function getDimensionOptions(dimensionEntityCode?: string | null) {
  if (!dimensionEntityCode) return [];
  return dimensionOptionMap.value[dimensionEntityCode] || [];
}

function getDelegationDimensionOptions(capabilityId: string) {
  const capability = capabilityMap.value.get(capabilityId);
  if (!capability) return [];

  return (capability.scopeTargets || [])
    .filter(target => target.dimensionEntityCode)
    .map(target => ({
      label: target.dimensionEntityName || target.dimensionEntityCode || '范围维度',
      value: target.dimensionEntityCode as string
    }))
    .filter((item, index, source) => source.findIndex(candidate => candidate.value === item.value) === index);
}

function getAssignmentEntityIds(capabilityId: string, dimensionEntityCode: string) {
  return (
    model.scopeAssignments.find(
      item => item.capabilityId === capabilityId && item.dimensionEntityCode === dimensionEntityCode
    )?.entityIds || []
  );
}

function setAssignmentEntityIds(capabilityId: string, dimensionEntityCode: string, entityIds: string[]) {
  const normalizedIds = [...new Set((entityIds || []).filter(Boolean))];
  const existing = model.scopeAssignments.find(
    item => item.capabilityId === capabilityId && item.dimensionEntityCode === dimensionEntityCode
  );

  if (existing) {
    existing.entityIds = normalizedIds;
    existing.entities = getDimensionOptions(dimensionEntityCode)
      .filter(option => normalizedIds.includes(String(option.value)))
      .map(option => ({ id: String(option.value), label: String(option.label) }));
    return;
  }

  model.scopeAssignments.push({
    capabilityId,
    dimensionEntityCode,
    entityIds: normalizedIds,
    entities: getDimensionOptions(dimensionEntityCode)
      .filter(option => normalizedIds.includes(String(option.value)))
      .map(option => ({ id: String(option.value), label: String(option.label) }))
  });
}

function handleAssignmentChange(
  capabilityId: string,
  dimensionEntityCode: string,
  values: Array<string | number> | null
) {
  setAssignmentEntityIds(
    capabilityId,
    dimensionEntityCode,
    Array.isArray(values) ? values.map(item => String(item)) : []
  );
}

function newDelegation(): Api.SystemManage.Delegation {
  return {
    id: '',
    tenantId: model.tenantId || '',
    fromUserId: '',
    toUserId: currentUserId.value,
    capabilityId: '',
    dimensionEntityCode: null,
    entityId: null,
    status: 'active',
    startAt: '',
    endAt: '',
    createBy: '',
    createTime: '',
    updateBy: '',
    updateTime: ''
  };
}

async function loadDimensionOptions(codes: Array<string | null | undefined>) {
  const pendingCodes = [...new Set(codes.filter((code): code is string => Boolean(code)))].filter(
    code => !dimensionOptionMap.value[code]
  );

  if (!pendingCodes.length) return;

  const responses = await Promise.all(pendingCodes.map(code => fetchGetScopeDimensionRecords(code)));
  const nextMap = { ...dimensionOptionMap.value };

  pendingCodes.forEach((code, index) => {
    nextMap[code] = (responses[index].data || []).map(item => ({
      label: item.label,
      value: item.id
    }));
  });

  dimensionOptionMap.value = nextMap;
}

async function loadOptions() {
  const [{ data: roleData }, { data: capabilityData }, { data: userList }] = await Promise.all([
    fetchGetRoleList({ current: 1, size: 200, status: 'ENABLED' }),
    fetchGetCapabilities({ module: 'tenant' }),
    fetchGetUserList({ current: 1, size: 200 })
  ]);

  roles.value = roleData?.records || [];
  capabilities.value = capabilityData || [];
  roleOptions.value = roles.value.map(item => ({ label: `${item.name} (${item.code})`, value: item.id }));
  userOptions.value = (userList?.records || []).map(item => ({
    label: item.nickName || item.username,
    value: item.id
  }));

  await loadDimensionOptions(
    capabilities.value.flatMap(item => (item.scopeTargets || []).map(target => target.dimensionEntityCode))
  );
}

async function loadUsers() {
  loading.value = true;
  const { data } = await fetchGetUserList({ current: 1, size: 100 });
  users.value = data?.records || [];
  userOptions.value = (data?.records || []).map(item => ({ label: item.nickName || item.username, value: item.id }));
  loading.value = false;
}

async function openProfile(userId: string) {
  currentUserId.value = userId;
  const { data } = await fetchGetUserAuthProfile(userId);
  if (!data) return;

  await loadDimensionOptions([
    ...data.scopeCapabilities.map(item => item.dimensionEntityCode),
    ...data.resolvedRelations.map(item => item.dimensionEntityCode),
    ...data.delegations.map(item => item.dimensionEntityCode)
  ]);

  Object.assign(model, {
    userId: data.userId,
    tenantId: data.tenantId,
    roles: data.roles || [],
    capabilities: data.capabilities || [],
    relationBindings: data.relationBindings || [],
    resolvedRelations: data.resolvedRelations || [],
    scopeAssignments: data.scopeAssignments || [],
    scopeCapabilities: data.scopeCapabilities || [],
    delegations: data.delegations || [],
    linkedStaffId: data.linkedStaffId || null,
    roleIds: data.roleIds || data.roles.map(item => item.id)
  });

  drawerVisible.value = true;
}

function handleDelegationCapabilityChange(item: Api.SystemManage.Delegation, capabilityId: string) {
  item.capabilityId = capabilityId;
  const dimensionOptions = getDelegationDimensionOptions(capabilityId);
  if (!dimensionOptions.some(option => option.value === item.dimensionEntityCode)) {
    item.dimensionEntityCode = dimensionOptions[0]?.value ? String(dimensionOptions[0].value) : null;
  }
  if (!getDimensionOptions(item.dimensionEntityCode).some(option => option.value === item.entityId)) {
    item.entityId = null;
  }
}

function handleDelegationDimensionChange(item: Api.SystemManage.Delegation, dimensionEntityCode: string | null) {
  item.dimensionEntityCode = dimensionEntityCode;
  if (!getDimensionOptions(dimensionEntityCode).some(option => option.value === item.entityId)) {
    item.entityId = null;
  }
}

async function handleSubmit() {
  const payload = {
    roleIds: [...model.roleIds],
    linkedStaffId: model.linkedStaffId?.trim() || null,
    scopeAssignments: model.scopeCapabilities.map(item => ({
      capabilityId: item.capabilityId,
      dimensionEntityCode: item.dimensionEntityCode,
      entityIds: getAssignmentEntityIds(item.capabilityId, item.dimensionEntityCode)
    })),
    delegations: model.delegations
      .filter(
        item =>
          item.fromUserId &&
          item.capabilityId &&
          item.dimensionEntityCode &&
          item.entityId &&
          item.startAt &&
          item.endAt
      )
      .map(item => ({
        id: item.id,
        tenantId: model.tenantId || '',
        fromUserId: item.fromUserId,
        toUserId: currentUserId.value,
        capabilityId: item.capabilityId,
        dimensionEntityCode: item.dimensionEntityCode as string,
        entityId: item.entityId as string,
        status: item.status,
        startAt: item.startAt,
        endAt: item.endAt
      }))
  };

  const { error } = await updateUserAuthProfile(currentUserId.value, payload);
  if (error) return;

  window.$message?.success('授权档案已保存');
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

    <NDrawer v-model:show="drawerVisible" :width="920">
      <NDrawerContent title="编辑授权档案" closable>
        <div class="flex-col gap-16px">
          <NForm label-placement="left" :label-width="120">
            <NFormItem label="角色分配">
              <NSelect
                v-model:value="model.roleIds"
                multiple
                filterable
                :options="roleOptions"
                placeholder="请选择角色"
              />
            </NFormItem>
            <NFormItem label="关联员工 ID">
              <NInput v-model:value="model.linkedStaffId" placeholder="请输入关联员工 ID" />
            </NFormItem>
          </NForm>

          <div class="border border-[#e5e7eb] rounded-12px bg-[#fcfcfd] p-16px">
            <div class="mb-12px flex items-center justify-between">
              <div class="text-base text-[#111827]">关联关系快照</div>
              <NTag size="small" type="info">只读</NTag>
            </div>
            <NEmpty v-if="!model.resolvedRelations.length" description="当前用户还没有解析出任何范围维度关系" />
            <div v-else class="flex-col gap-12px">
              <div
                v-for="relation in model.resolvedRelations"
                :key="relation.dimensionEntityCode"
                class="rounded-10px bg-[#f8fafc] p-12px"
              >
                <div class="mb-8px text-sm text-[#374151]">
                  {{ relation.dimensionEntityName || relation.dimensionEntityCode }}
                </div>
                <NSpace wrap>
                  <NTag v-for="entity in relation.entities" :key="entity.id" size="small" type="success">
                    {{ entity.label }}
                  </NTag>
                </NSpace>
              </div>
            </div>
          </div>

          <div class="border border-[#e5e7eb] rounded-12px bg-[#fcfcfd] p-16px">
            <div class="mb-12px flex items-center justify-between">
              <div class="text-base text-[#111827]">显式范围配置</div>
              <NTag size="small" type="warning">仅 assignment 策略生效</NTag>
            </div>
            <NEmpty v-if="!model.scopeCapabilities.length" description="当前角色没有开启“按用户配置维度”的能力" />
            <div v-else class="flex-col gap-12px">
              <div
                v-for="scopeCapability in model.scopeCapabilities"
                :key="`${scopeCapability.capabilityId}:${scopeCapability.dimensionEntityCode}`"
                class="rounded-10px bg-[#f8fafc] p-12px"
              >
                <div class="mb-8px">
                  <div class="text-sm text-[#111827]">
                    {{
                      scopeCapability.capabilityName || scopeCapability.capabilityCode || scopeCapability.capabilityId
                    }}
                  </div>
                  <div class="mt-4px text-xs text-[#6b7280]">
                    {{ scopeCapability.dimensionEntityName || scopeCapability.dimensionEntityCode }}
                  </div>
                </div>
                <NSelect
                  :value="getAssignmentEntityIds(scopeCapability.capabilityId, scopeCapability.dimensionEntityCode)"
                  multiple
                  filterable
                  clearable
                  :options="getDimensionOptions(scopeCapability.dimensionEntityCode)"
                  placeholder="请选择实体范围"
                  @update:value="
                    values =>
                      handleAssignmentChange(scopeCapability.capabilityId, scopeCapability.dimensionEntityCode, values)
                  "
                />
              </div>
            </div>
          </div>

          <div class="border border-[#e5e7eb] rounded-12px bg-[#fcfcfd] p-16px">
            <div class="mb-12px flex items-center justify-between">
              <div class="text-base text-[#111827]">委派授权</div>
              <NButton type="primary" text @click="model.delegations = [...model.delegations, newDelegation()]">
                新增委派
              </NButton>
            </div>
            <NEmpty v-if="!model.delegations.length" description="当前没有委派授权记录" />
            <div v-else class="flex-col gap-12px">
              <div
                v-for="(item, index) in model.delegations"
                :key="item.id || index"
                class="rounded-10px bg-[#f8fafc] p-12px"
              >
                <NForm label-placement="left" :label-width="110">
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
                      :value="item.capabilityId"
                      filterable
                      :options="delegationCapabilityOptions"
                      placeholder="请选择能力"
                      @update:value="value => handleDelegationCapabilityChange(item, String(value || ''))"
                    />
                  </NFormItem>
                  <NFormItem label="维度实体">
                    <NSelect
                      :value="item.dimensionEntityCode"
                      :options="getDelegationDimensionOptions(item.capabilityId)"
                      placeholder="请选择维度实体"
                      @update:value="value => handleDelegationDimensionChange(item, value ? String(value) : null)"
                    />
                  </NFormItem>
                  <NFormItem label="实体 ID">
                    <NSelect
                      v-model:value="item.entityId"
                      filterable
                      clearable
                      :options="getDimensionOptions(item.dimensionEntityCode)"
                      placeholder="请选择实体"
                    />
                  </NFormItem>
                  <NFormItem label="状态">
                    <NSelect v-model:value="item.status" :options="delegationStatusOptions" placeholder="请选择状态" />
                  </NFormItem>
                  <NFormItem label="开始时间">
                    <NInput v-model:value="item.startAt" placeholder="例如 2026-07-03T00:00:00.000Z" />
                  </NFormItem>
                  <NFormItem label="结束时间">
                    <NInput v-model:value="item.endAt" placeholder="例如 2026-07-31T23:59:59.000Z" />
                  </NFormItem>
                  <NButton
                    type="error"
                    text
                    @click="model.delegations = model.delegations.filter((_, currentIndex) => currentIndex !== index)"
                  >
                    删除
                  </NButton>
                </NForm>
              </div>
            </div>
          </div>
        </div>

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
