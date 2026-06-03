import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateFolderDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
