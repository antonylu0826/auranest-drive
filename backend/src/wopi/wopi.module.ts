import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { SpacesModule } from '../spaces/spaces.module';
import { StorageModule } from '../storage/storage.module';
import { WopiController } from './wopi.controller';
import { WopiTokenGuard } from './wopi-token.guard';
import { WopiTokenService } from './wopi-token.service';

@Module({
  imports: [StorageModule, ApiKeysModule, SpacesModule],
  controllers: [WopiController],
  providers: [WopiTokenService, WopiTokenGuard],
  exports: [WopiTokenService],
})
export class WopiModule {}
