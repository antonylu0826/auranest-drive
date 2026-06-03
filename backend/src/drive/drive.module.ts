import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { FoldersController } from './folders/folders.controller';
import { FoldersService } from './folders/folders.service';
import { FilesController } from './files/files.controller';
import { FilesService } from './files/files.service';

@Module({
  imports: [StorageModule],
  controllers: [FoldersController, FilesController],
  providers: [FoldersService, FilesService],
})
export class DriveModule {}
