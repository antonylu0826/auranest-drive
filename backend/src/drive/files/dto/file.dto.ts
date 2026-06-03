import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class UpdateFileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  folderId?: string;
}

export class ShareFileDto {
  @IsString()
  sharedWithId: string;

  @IsEnum(SharePermission)
  permission: SharePermission;
}
