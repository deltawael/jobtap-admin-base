import { prisma } from './helper';
import { initCapability } from './sys/sysCapability';
import { initCapabilityApiBinding } from './sys/sysCapabilityApiBinding';
import { initCapabilityScopeTarget } from './sys/sysCapabilityScopeTarget';
import { initCapabilityUiBinding } from './sys/sysCapabilityUiBinding';
import { initCapabilityViewBinding } from './sys/sysCapabilityViewBinding';
import { initSysMenu } from './sys/sysMenu';
import { initScopeDimensionEntity } from './sys/sysScopeDimensionEntity';
import { initScopeResolvers } from './sys/sysScopeResolvers';
import { initSubjectDimensionRelation } from './sys/sysSubjectDimensionRelation';
import { initSysOrganization } from './sys/sysOrganization';
import { initSysRole } from './sys/sysRole';
import { initRoleTemplate } from './sys/sysRoleTemplate';
import { initRoleTemplateCapability } from './sys/sysRoleTemplateCapability';
import { initSysTenant } from './sys/sysTenant';
import { initSysUser } from './sys/sysUser';
import { initUserStaffBinding } from './sys/sysUserStaffBinding';
import { initSysUserRole } from './sys/sysUserRole';

const run = async () => {
  await initSysTenant();
  await initRoleTemplate();
  await initCapability();
  await initScopeDimensionEntity();
  await initScopeResolvers();
  await initSysOrganization();
  await initCapabilityApiBinding();
  await initCapabilityScopeTarget();
  await initCapabilityUiBinding();
  await initCapabilityViewBinding();
  await initRoleTemplateCapability();
  await initSysRole();
  await initSysUser();
  await initSysUserRole();
  await initUserStaffBinding();
  await initSubjectDimensionRelation();
  await initSysMenu();
};

(async () => {
  const date = new Date().getTime();
  console.log('Database initialization start');
  await run();
  console.log('Database initialization complete');
  console.log('Duration:', new Date().getTime() - date, 'ms');
  await prisma.$disconnect();
})();
