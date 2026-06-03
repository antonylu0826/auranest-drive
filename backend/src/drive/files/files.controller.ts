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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery } from '../../common/pagination';
import { ShareFileDto, UpdateFileDto } from './dto/file.dto';
import { FilesService } from './files.service';

interface AuthRequest {
  user: { sub: string };
}

@Controller('drive/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
    // Multer decodes Content-Disposition filename as Latin-1; browsers send UTF-8 bytes
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.filesService.upload(req.user.sub, file.buffer, originalName, file.mimetype, folderId ?? null);
  }

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('folderId') folderId?: string,
    @Query('trashed') trashed?: string,
  ) {
    return this.filesService.findAll(req.user.sub, {
      ...query,
      folderId,
      trashed: trashed === 'true',
    });
  }

  @Post('trash/empty')
  @HttpCode(200)
  emptyTrash(@Request() req: AuthRequest) {
    return this.filesService.emptyTrash(req.user.sub);
  }

  @Get('shared-with-me')
  findSharedWithMe(
    @Request() req: AuthRequest,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.filesService.findSharedWithMe(req.user.sub, query);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.filesService.findOne(req.user.sub, id);
  }

  @Get(':id/download')
  async download(@Request() req: AuthRequest, @Param('id') id: string) {
    const url = await this.filesService.getDownloadUrl(req.user.sub, id);
    return { url };
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.filesService.update(req.user.sub, id, dto);
  }

  @Patch(':id/trash')
  trash(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.filesService.trash(req.user.sub, id);
  }

  @Patch(':id/restore')
  restore(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.filesService.restore(req.user.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.filesService.remove(req.user.sub, id);
  }

  @Post(':id/shares')
  share(@Request() req: AuthRequest, @Param('id') fileId: string, @Body() dto: ShareFileDto) {
    return this.filesService.share(req.user.sub, fileId, dto);
  }

  @Delete(':id/shares/:userId')
  @HttpCode(204)
  unshare(
    @Request() req: AuthRequest,
    @Param('id') fileId: string,
    @Param('userId') userId: string,
  ) {
    return this.filesService.unshare(req.user.sub, fileId, userId);
  }
}
