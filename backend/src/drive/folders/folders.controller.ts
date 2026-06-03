import {
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
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery } from '../../common/pagination';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { FoldersService } from './folders.service';

interface AuthRequest {
  user: { sub: string };
}

@Controller('drive/folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(req.user.sub, dto);
  }

  @Post('trash/empty')
  @HttpCode(200)
  emptyTrash(@Request() req: AuthRequest) {
    return this.foldersService.emptyTrash(req.user.sub);
  }

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('parentId') parentId?: string,
    @Query('trashed') trashed?: string,
  ) {
    return this.foldersService.findAll(req.user.sub, {
      ...query,
      parentId,
      trashed: trashed === 'true',
    });
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.foldersService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    return this.foldersService.update(req.user.sub, id, dto);
  }

  @Patch(':id/trash')
  trash(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.foldersService.trash(req.user.sub, id);
  }

  @Patch(':id/restore')
  restore(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.foldersService.restore(req.user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.foldersService.remove(req.user.sub, id);
  }
}
