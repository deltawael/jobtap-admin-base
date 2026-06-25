import { Prisma } from '@prisma/client';

import { prisma } from '../helper';

const DEFAULT_PASSWORD_HASH = '$2a$10$BrNwelZswsGy9FGCTARd5efBtM0Ra4Xz8e8DoT86EOju9Ii0jpBg6';
const DEFAULT_AVATAR = 'https://minio.bytebytebrew.com/default/Ugly%20Avatar%20Face.png';

export const initSysUser = async () => {
  const data: Prisma.SysUserCreateInput[] = [
    { id: 'user-system-admin', username: 'system_admin', password: DEFAULT_PASSWORD_HASH, tenantId: null, actorType: 'system_admin', built_in: true, avatar: DEFAULT_AVATAR, email: 'system_admin@jobtap.local', phoneNumber: '18500000001', nickName: 'System Admin', status: 'ENABLED', createdAt: new Date('2026-01-01T00:00:00.000Z'), createdBy: '-1', updatedAt: null, updatedBy: null },
    { id: 'user-tenant-admin-a', username: 'tenant_admin_a', password: DEFAULT_PASSWORD_HASH, tenantId: 'tenant-a', actorType: 'tenant_admin', built_in: true, avatar: DEFAULT_AVATAR, email: 'tenant_admin_a@jobtap.local', phoneNumber: '18500000002', nickName: 'Tenant Admin A', status: 'ENABLED', createdAt: new Date('2026-01-01T00:00:00.000Z'), createdBy: '-1', updatedAt: null, updatedBy: null },
    { id: 'user-tenant-admin-b', username: 'tenant_admin_b', password: DEFAULT_PASSWORD_HASH, tenantId: 'tenant-b', actorType: 'tenant_admin', built_in: true, avatar: DEFAULT_AVATAR, email: 'tenant_admin_b@jobtap.local', phoneNumber: '18500000003', nickName: 'Tenant Admin B', status: 'ENABLED', createdAt: new Date('2026-01-01T00:00:00.000Z'), createdBy: '-1', updatedAt: null, updatedBy: null }
  ];

  return prisma.sysUser.createMany({ data, skipDuplicates: true });
};