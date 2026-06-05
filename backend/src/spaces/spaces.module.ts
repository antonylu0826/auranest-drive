import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { SpaceAccessService } from './space-access.service';
import { SpaceMemberGuard } from '../auth/guards/space-member.guard';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [SpacesController],
  providers: [SpacesService, SpaceAccessService, SpaceMemberGuard],
  exports: [SpaceAccessService, SpaceMemberGuard],
})
export class SpacesModule {}
