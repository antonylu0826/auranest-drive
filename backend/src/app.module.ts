import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { DriveModule } from './drive/drive.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WopiModule } from './wopi/wopi.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, UsersModule, MetaModule, ApiKeysModule, DriveModule, WopiModule],
})
export class AppModule {}
