export type CapabilityTreeNodeType = 'module' | 'group' | 'capability';

export interface CapabilityTreeNode {
  [key: string]: unknown;
  key: string;
  value: string;
  label: string;
  code: string;
  nodeType: CapabilityTreeNodeType;
  capabilityCount: number;
  module: string;
  children?: CapabilityTreeNode[];
  capability?: Api.SystemManage.Capability;
  kind?: Api.SystemManage.Capability['kind'];
  builtIn?: boolean | null;
  checkboxDisabled?: boolean;
}

const moduleLabelMap: Record<string, string> = {
  platform: '平台侧',
  tenant: '租户侧'
};

const segmentLabelMap: Record<string, string> = {
  audit: '审计',
  auth_profile: '授权档案',
  business: '业务',
  capability: '能力目录',
  dashboard: '看板',
  delegation: '委派',
  org: '组织',
  readonly: '只读',
  reference: '引用',
  resource_catalog: '资源目录',
  role: '角色',
  role_template: '角色模板',
  scope: '数据范围',
  self: '本人',
  staff: '员工',
  team: '团队',
  tenant: '租户',
  user: '用户'
};

function getModuleLabel(module: string) {
  return moduleLabelMap[module] ?? module;
}

function getSegmentLabel(segment: string) {
  return segmentLabelMap[segment] ?? segment;
}

function getGroupCode(code: string) {
  const segments = code.split('.').filter(Boolean);
  if (segments.length <= 2) return 'general';
  return segments.slice(1, -1).join('.');
}

function getGroupLabel(groupCode: string) {
  if (groupCode === 'general') return '默认分组';
  return groupCode.split('.').filter(Boolean).map(getSegmentLabel).join(' / ');
}

function sortByCode<T extends { code: string }>(items: T[]) {
  return [...items].sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'));
}

export function buildCapabilityTree(capabilities: Api.SystemManage.Capability[]) {
  const moduleMap = new Map<string, Map<string, Api.SystemManage.Capability[]>>();

  sortByCode(capabilities).forEach(capability => {
    const groupCode = getGroupCode(capability.code);
    const groups = moduleMap.get(capability.module) ?? new Map<string, Api.SystemManage.Capability[]>();
    const groupItems = groups.get(groupCode) ?? [];
    groupItems.push(capability);
    groups.set(groupCode, groupItems);
    moduleMap.set(capability.module, groups);
  });

  return [...moduleMap.entries()]
    .sort(([moduleA], [moduleB]) => moduleA.localeCompare(moduleB, 'zh-CN'))
    .map(([module, groups]) => {
      const groupNodes: CapabilityTreeNode[] = [...groups.entries()]
        .sort(([groupA], [groupB]) => groupA.localeCompare(groupB, 'zh-CN'))
        .map(([groupCode, items]) => {
          const children: CapabilityTreeNode[] = sortByCode(items).map(capability => ({
            key: capability.id,
            value: capability.id,
            label: capability.name,
            code: capability.code,
            nodeType: 'capability',
            capabilityCount: 1,
            module,
            capability,
            kind: capability.kind,
            builtIn: capability.builtIn
          }));

          return {
            key: `group:${module}:${groupCode}`,
            value: `group:${module}:${groupCode}`,
            label: getGroupLabel(groupCode),
            code: `${module}.${groupCode}`,
            nodeType: 'group',
            capabilityCount: children.length,
            module,
            children,
            builtIn: null
          } satisfies CapabilityTreeNode;
        });

      const capabilityCount = groupNodes.reduce((total, item) => total + item.capabilityCount, 0);

      return {
        key: `module:${module}`,
        value: `module:${module}`,
        label: getModuleLabel(module),
        code: module,
        nodeType: 'module',
        capabilityCount,
        module,
        children: groupNodes,
        builtIn: null
      } satisfies CapabilityTreeNode;
    });
}

function collectLeafIds(node: CapabilityTreeNode, leafMap: Map<string, string[]>): string[] {
  if (node.nodeType === 'capability') {
    leafMap.set(node.value, [node.value]);
    return [node.value];
  }

  const childLeafIds: string[] = (node.children ?? []).flatMap(child => collectLeafIds(child, leafMap));
  leafMap.set(node.value, childLeafIds);
  return childLeafIds;
}

export function normalizeCapabilityIds(selectedKeys: Array<string | null | undefined>, tree: CapabilityTreeNode[]) {
  const leafMap = new Map<string, string[]>();
  tree.forEach(node => collectLeafIds(node, leafMap));

  const result = new Set<string>();
  selectedKeys.forEach(key => {
    const normalizedKey = key?.trim();
    if (!normalizedKey) return;
    const leafIds = leafMap.get(normalizedKey) ?? [normalizedKey];
    leafIds.forEach(id => result.add(id));
  });

  return [...result];
}

export function getActorTypeLabel(actorType: Api.SystemManage.RoleTemplate['actorType']) {
  const labelMap: Record<Api.SystemManage.RoleTemplate['actorType'], string> = {
    system_admin: '系统管理员',
    tenant_admin: '租户管理员',
    tenant_user: '租户业务用户'
  };

  return labelMap[actorType];
}

export function getCapabilityKindLabel(kind?: Api.SystemManage.Capability['kind']) {
  if (kind === 'action') return '动作';
  if (kind === 'view') return '视图';
  return '-';
}
