import { prisma } from './helper';
import { initCasbinRule } from './sys/casbinRule';
import { initCapability } from './sys/sysCapability';
import { initSysDomain } from './sys/sysDomain';
import { initSysMenu } from './sys/sysMenu';
import { initSysRole } from './sys/sysRole';
import { initRoleTemplate } from './sys/sysRoleTemplate';
import { initRoleTemplateCapability } from './sys/sysRoleTemplateCapability';
import { initSysRoleMenu } from './sys/sysRoleMenu';
import { initSysTenant } from './sys/sysTenant';
import { initSysUser } from './sys/sysUser';
import { initSysUserRole } from './sys/sysUserRole';

const run = async () => {
  await initSysUser();
  await initSysRole();
  await initSysMenu();
  await initSysDomain();
  await initSysTenant();
  await initRoleTemplate();
  await initCapability();
  await initRoleTemplateCapability();
  await initSysUserRole();
  await initSysRoleMenu();
  await initCasbinRule();
};

(async () => {
  const date = new Date().getTime();
  console.log('Database initialization start');
  await run();
  console.log('Database initialization complete');
  console.log('Duration:', new Date().getTime() - date, 'ms');
  await prisma.$disconnect();
})();
