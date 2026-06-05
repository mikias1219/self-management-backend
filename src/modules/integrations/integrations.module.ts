import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsModule } from '../settings/settings.module';
import { Task } from '../tasks/domain/entities/task.entity';
import { UserSettings } from '../settings/domain/entities/user-settings.entity';
import { GoogleCalendarService } from './application/services/google-calendar.service';
import { IcalCalendarService } from './application/services/ical-calendar.service';
import { LifeosCalendarExportService } from './application/services/lifeos-calendar-export.service';
import { CalendarExportController } from './presentation/controllers/calendar-export.controller';
import { GoogleCalendarController } from './presentation/controllers/google-calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, UserSettings]),
    SettingsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'lifeos-dev-secret',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') ??
            '7d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [GoogleCalendarController, CalendarExportController],
  providers: [
    GoogleCalendarService,
    IcalCalendarService,
    LifeosCalendarExportService,
  ],
  exports: [
    GoogleCalendarService,
    IcalCalendarService,
    LifeosCalendarExportService,
  ],
})
export class IntegrationsModule {}
