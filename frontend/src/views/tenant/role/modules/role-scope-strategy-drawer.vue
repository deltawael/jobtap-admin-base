<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchGetCapabilities, fetchGetRoleScopeStrategies, updateRoleScopeStrategies } from '@/service/api';

defineOptions({ name: 'RoleScopeStrategyDrawer' });

interface Props {
  rowData?: Api.SystemManage.Role | null;
}

const EMPTY_STRATEGY_VALUE = '__none__';

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'submitted'): void }>();
const visible = defineModel<boolean>('visible', { default: false });
const loading = ref(false);
const capabilities = ref<Api.SystemManage.Capability[]>([]);
const strategies = ref<Api.SystemManage.RoleScopeStrategy[]>([]);
const strategySelection = ref<Record<string, string>>({});

const capabilityMap = computed(() => new Map(capabilities.value.map(item => [item.id, item] as const)));

const configurableCapabilities = computed(() =>
  (props.rowData?.capabilityIds || [])
    .map(capabilityId => capabilityMap.value.get(capabilityId))
    .filter((item): item is Api.SystemManage.Capability => Boolean(item?.scopeTargets?.length))
    .sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'))
);

function resetStrategySelection() {
  strategySelection.value = {};
}

function encodeStrategyValue(strategy?: Api.SystemManage.RoleScopeStrategy | null) {
  if (!strategy) return EMPTY_STRATEGY_VALUE;
  if (strategy.strategyMode === 'all') return 'all';
  if (strategy.strategyMode === 'self') return 'self';
  if (strategy.dimensionEntityCode) return `${strategy.strategyMode}:${strategy.dimensionEntityCode}`;
  return EMPTY_STRATEGY_VALUE;
}

function decodeStrategyValue(capabilityId: string, value: string): Api.SystemManage.RoleScopeStrategy | null {
  if (!value || value === EMPTY_STRATEGY_VALUE) return null;
  if (value === 'all' || value === 'self') {
    return { capabilityId, strategyMode: value };
  }

  const [strategyMode, dimensionEntityCode] = value.split(':');
  if (!strategyMode || !dimensionEntityCode) return null;

  return {
    capabilityId,
    strategyMode: strategyMode as Api.SystemManage.ScopeStrategyMode,
    dimensionEntityCode
  };
}

function getStrategyOptions(capability: Api.SystemManage.Capability) {
  const options: Array<{ label: string; value: string }> = [
    { label: '未配置（默认放行）', value: EMPTY_STRATEGY_VALUE },
    { label: '全部', value: 'all' }
  ];
  const targets = capability.scopeTargets || [];

  if (targets.some(item => item.supportsSelf)) {
    options.push({ label: '本人', value: 'self' });
  }

  targets
    .filter(item => item.dimensionEntityCode)
    .forEach(item => {
      const dimensionLabel = item.dimensionEntityName || item.dimensionEntityCode || '范围维度';
      options.push({ label: `按关联${dimensionLabel}`, value: `relation:${item.dimensionEntityCode}` });
      options.push({ label: `按用户配置${dimensionLabel}`, value: `assignment:${item.dimensionEntityCode}` });
    });

  return options.filter(
    (item, index, source) => source.findIndex(candidate => candidate.value === item.value) === index
  );
}

async function loadData() {
  if (!props.rowData?.id) return;
  loading.value = true;
  const [{ data: capabilityData }, { data: strategyData }] = await Promise.all([
    fetchGetCapabilities(),
    fetchGetRoleScopeStrategies(props.rowData.id)
  ]);

  capabilities.value = capabilityData || [];
  strategies.value = strategyData || [];
  resetStrategySelection();

  const strategyMap = new Map(strategies.value.map(item => [item.capabilityId, item] as const));
  configurableCapabilities.value.forEach(capability => {
    strategySelection.value[capability.id] = encodeStrategyValue(strategyMap.get(capability.id));
  });
  loading.value = false;
}

async function handleSubmit() {
  if (!props.rowData?.id) return;
  const payload = configurableCapabilities.value
    .map(capability =>
      decodeStrategyValue(capability.id, strategySelection.value[capability.id] || EMPTY_STRATEGY_VALUE)
    )
    .filter((item): item is Api.SystemManage.RoleScopeStrategy => Boolean(item));

  const { error } = await updateRoleScopeStrategies(props.rowData.id, payload);
  if (error) return;

  window.$message?.success('范围策略已保存');
  visible.value = false;
  emit('submitted');
}

watch(visible, async value => {
  if (value) {
    await loadData();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="680">
    <NDrawerContent :title="`${props.rowData?.name || '角色'}的数据范围策略`" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <div class="flex-col gap-16px">
          <NAlert type="info" :show-icon="false">
            这里仅维护“按能力选策略”。未配置时保持默认放行；具体实体 ID 统一到用户授权档案里维护。
          </NAlert>

          <NEmpty v-if="!configurableCapabilities.length" description="当前角色的能力里没有声明可配置的数据范围能力" />

          <div v-else class="flex-col gap-12px">
            <div
              v-for="capability in configurableCapabilities"
              :key="capability.id"
              class="border border-[#e5e7eb] rounded-12px bg-[#fcfcfd] p-16px"
            >
              <div class="mb-12px flex items-start justify-between gap-12px">
                <div>
                  <div class="text-base text-[#111827]">{{ capability.name }}</div>
                  <div class="mt-4px text-xs text-[#6b7280]">{{ capability.code }}</div>
                </div>
                <NTag size="small" type="info">范围能力</NTag>
              </div>

              <NRadioGroup v-model:value="strategySelection[capability.id]">
                <NSpace vertical :size="10">
                  <NRadio
                    v-for="option in getStrategyOptions(capability)"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                  />
                </NSpace>
              </NRadioGroup>
            </div>
          </div>
        </div>
      </NSpin>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存策略</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
