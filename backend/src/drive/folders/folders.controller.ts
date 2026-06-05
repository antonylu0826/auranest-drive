import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Permission, SpaceRole } from '@prisma/client';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { RequireSpaceRole } from '../../auth/decorators/require-space-role.decorator';
import { JwtOrApiKeyGuard } from '../../auth/guards/jwt-or-api-key.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { SpaceMemberGuard } from '../../auth/guards/space-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery } from '../../common/pagination';
import { createFolderSchema, updateFolderSchema, CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { FoldersService } from './folders.service';

interface AuthRequest {
  user: { sub: string };
  query: Record<string, string>;
}

@Controller('drive/folders')
@UseGuards(JwtOrApiKeyGuard, PermissionGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @RequirePermissions(Permission.DRIVE_FOLDER_CREATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'body')
  create(
    @Request() req: AuthRequest,
    @Body(new ZodValidationPipe(createFolderSchema)) dto: CreateFolderDto,
  ) {
    return this.foldersService.create(req.user.sub, dto);
  }

  @Post('trash/empty')
  @RequirePermissions(Permission.DRIVE_FOLDER_DELETE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'query')
  @HttpCode(200)
  emptyTrash(@Query('spaceId') spaceId: string) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    return this.foldersService.emptyTrash(spaceId);
  }

  @Get()
  @RequirePermissions(Permission.DRIVE_FOLDER_READ)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'query')
  findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('spaceId') spaceId: string,
    @Query('parentId') parentId?: string,
    @Query('trashed') trashed?: string,
  ) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    return this.foldersService.findAll(spaceId, {
      ...query,
      parentId,
      trashed: trashed === 'true',
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.DRIVE_FOLDER_READ)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'folder-param')
  findOne(@Param('id') id: string) {
    return this.foldersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DRIVE_FOLDER_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'folder-param')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, dto);
  }

  @Patch(':id/trash')
  @RequirePermissions(Permission.DRIVE_FOLDER_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'folder-param')
  trash(@Param('id') id: string) {
    return this.foldersService.trash(id);
  }

  @Patch(':id/restore')
  @RequirePermissions(Permission.DRIVE_FOLDER_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'folder-param')
  restore(@Param('id') id: string) {
    return this.foldersService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DRIVE_FOLDER_DELETE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'folder-param')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.foldersService.remove(id);
  }
}
