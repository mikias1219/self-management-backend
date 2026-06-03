import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './application/services/settings.service';
import { UserSettings } from './domain/entities/user-settings.entity';
import { SettingsController } from './presentation/controllers/settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
