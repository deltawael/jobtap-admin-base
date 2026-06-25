import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSelfProfileDto {
  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'avatar must be a string or null' })
  @Type(() => String)
  avatar: string | null;

  @ApiProperty({ required: true })
  @IsString({ message: 'nickName must be a string' })
  @IsNotEmpty({ message: 'nickName cannot be empty' })
  nickName: string;

  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string or null' })
  @Type(() => String)
  phoneNumber: string | null;

  @ApiProperty({ type: 'string', required: false, nullable: true })
  @IsOptional()
  @IsString({ message: 'email must be a string or null' })
  @Type(() => String)
  email: string | null;
}

export class ChangeOwnPasswordDto {
  @ApiProperty({ required: true })
  @IsString({ message: 'oldPassword must be a string' })
  @IsNotEmpty({ message: 'oldPassword cannot be empty' })
  @MinLength(6)
  oldPassword: string;

  @ApiProperty({ required: true })
  @IsString({ message: 'newPassword must be a string' })
  @IsNotEmpty({ message: 'newPassword cannot be empty' })
  @MinLength(6)
  newPassword: string;
}

export class ChangeUserPasswordDto {
  @ApiProperty({ required: true })
  @IsString({ message: 'newPassword must be a string' })
  @IsNotEmpty({ message: 'newPassword cannot be empty' })
  @MinLength(6)
  newPassword: string;
}
