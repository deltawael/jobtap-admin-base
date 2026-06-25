import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { PaginationParams } from '@lib/infra/rest/pagination-params';

export class PageUsersDto extends PaginationParams {
  @ApiProperty({ required: false, enum: ['all', 'platform', 'tenant'] })
  @IsOptional()
  @IsIn(['all', 'platform', 'tenant'], { message: 'tenantScope must be one of all, platform or tenant' })
  tenantScope?: 'all' | 'platform' | 'tenant';

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'tenantId must be a string' })
  tenantId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username cannot be empty' })
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Nickname must be a string' })
  @IsNotEmpty({ message: 'Nickname cannot be empty' })
  nickName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(Status, { message: 'Status must be a valid enum value' })
  status?: Status;
}
