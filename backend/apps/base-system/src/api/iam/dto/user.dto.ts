import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UserCreateDto {
  @ApiProperty({ required: true })
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username cannot be empty' })
  @MinLength(6)
  username: string;

  @ApiProperty({ required: true })
  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password cannot be empty' })
  @MinLength(6)
  password: string;

  @ApiProperty({ required: true })
  @IsString({ message: 'nickName must be a string' })
  @IsNotEmpty({ message: 'nickName cannot be empty' })
  nickName: string;

  @ApiProperty({ required: true, enum: Object.values(Status) })
  @IsEnum(Status, { message: 'status must be a valid enum value' })
  status: Status;

  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'avatar must be a string or null' })
  @Type(() => String)
  avatar: string | null;

  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'email must be a string or null' })
  @Type(() => String)
  email: string | null;

  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string or null' })
  @Type(() => String)
  phoneNumber: string | null;

  @ApiProperty({ type: [String], required: true })
  @IsArray({ message: 'roleIds must be an array' })
  @ArrayNotEmpty({ message: 'roleIds cannot be empty' })
  @IsString({ each: true, message: 'each roleId must be a string' })
  roleIds: string[];
}

export class UserUpdateDto extends OmitType(UserCreateDto, ['password']) {
  @ApiProperty({ required: true })
  @IsString({ message: 'id must be a string' })
  @IsNotEmpty({ message: 'id cannot be empty' })
  id: string;
}