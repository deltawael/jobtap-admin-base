import { ApiProperty } from '@nestjs/swagger';
import { ActorType, Status } from '@prisma/client';

import { UpdateAuditInfo } from '@lib/shared/prisma/db.constant';
import { CreationAuditInfoProperties } from '@lib/typings/global';

export type UserEssentialProperties = Readonly<
  Required<{
    id: string;
    username: string;
    tenantId: string | null;
    actorType: ActorType;
    nickName: string;
    status: Status;
  }>
>;
export type UserOptionalProperties = Readonly<
  Partial<{
    password: string;
    avatar: string | null;
    email: string | null;
    phoneNumber: string | null;
  }>
>;
export type UserRelationProperties = Readonly<{ roleIds: string[] }>;
export type UserProperties = UserEssentialProperties &
  Required<UserOptionalProperties> &
  UserRelationProperties;
export type UserCreateProperties = Omit<UserProperties, 'roleIds'> &
  CreationAuditInfoProperties;
export type UserUpdateProperties = Omit<
  UserProperties,
  'roleIds' | 'password' | 'tenantId' | 'actorType'
> &
  CreationAuditInfoProperties;

export class UserReadModel extends UpdateAuditInfo {
  @ApiProperty({ description: 'The unique identifier of the user' }) id: string;
  @ApiProperty({ description: 'Username of the user' }) username: string;
  @ApiProperty({
    description: 'Tenant identifier associated with the user',
    nullable: true,
  })
  tenantId: string | null;
  @ApiProperty({
    description: 'Actor type of the user',
    enum: Object.values(ActorType),
  })
  actorType: ActorType;
  @ApiProperty({ description: 'Nickname of the user' }) nickName: string;
  @ApiProperty({ description: 'Current status of the user', enum: Object.values(Status) }) status: Status;
  @ApiProperty({ description: 'Avatar URL of the user', nullable: true }) avatar: string | null;
  @ApiProperty({ description: 'Email address of the user', nullable: true }) email: string | null;
  @ApiProperty({ description: 'Phone number of the user', nullable: true }) phoneNumber: string | null;
  @ApiProperty({ description: 'Assigned role ids', type: [String] }) roleIds: string[];
}