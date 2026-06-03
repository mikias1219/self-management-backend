#!/usr/bin/env node
/**
 * Generates LifeOS CRUD module files
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../src/modules');
const created = [];

function w(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  created.push('src/modules/' + rel);
}

function crudModule(cfg) {
  const {
    folder, route, tag, entity, entityFile, service, controller, moduleClass,
    activityModule, createDto, createDtoClass, updateDtoClass, createDtoFile, updateDtoFile,
    serviceFile, controllerFile,
  } = cfg;

  w(`${folder}/application/dto/${createDtoFile}`, createDto);
  w(`${folder}/application/dto/${updateDtoFile}`, `import { PartialType } from '@nestjs/mapped-types';
import { ${createDtoClass} } from './${createDtoFile.replace('.ts', '')}';

export class ${updateDtoClass} extends PartialType(${createDtoClass}) {}
`);

  w(`${folder}/application/services/${serviceFile}`, `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { ${entity} } from '../../domain/entities/${entityFile}';

@Injectable()
export class ${service} extends BaseCrudService<${entity}> {
  constructor(
    @InjectRepository(${entity})
    repository: Repository<${entity}>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.${activityModule},
      entityType: '${entity}',
    });
  }
}
`);

  w(`${folder}/presentation/controllers/${controllerFile}`, `import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ${createDtoClass} } from '../../application/dto/${createDtoFile.replace('.ts', '')}';
import { ${updateDtoClass} } from '../../application/dto/${updateDtoFile.replace('.ts', '')}';
import { ${service} } from '../../application/services/${serviceFile.replace('.ts', '')}';

@ApiTags('${tag}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${route}')
export class ${controller} {
  constructor(private readonly service: ${service}) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: ${createDtoClass}) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: ${updateDtoClass},
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
`);

  w(`${folder}/${folder}.module.ts`, `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${service} } from './application/services/${serviceFile.replace('.ts', '')}';
import { ${entity} } from './domain/entities/${entityFile.replace('.ts', '')}';
import { ${controller} } from './presentation/controllers/${controllerFile.replace('.ts', '')}';

@Module({
  imports: [TypeOrmModule.forFeature([${entity}])],
  controllers: [${controller}],
  providers: [${service}],
  exports: [${service}],
})
export class ${moduleClass} {}
`);
}

// Goals
crudModule({
  folder: 'goals', route: 'goals', tag: 'goals', entity: 'Goal', entityFile: 'goal.entity.ts',
  service: 'GoalsService', controller: 'GoalsController', moduleClass: 'GoalsModule',
  activityModule: 'GOALS', createDtoClass: 'CreateGoalDto', updateDtoClass: 'UpdateGoalDto', createDtoFile: 'create-goal.dto.ts', updateDtoFile: 'update-goal.dto.ts',
  serviceFile: 'goals.service.ts', controllerFile: 'goals.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { GoalLevel } from '../../domain/enums/goal.enums';

export class CreateGoalDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GoalLevel })
  @IsEnum(GoalLevel)
  level: GoalLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
`,
  updateDtoClass: 'UpdateGoalDto',
});

// Daily Reviews
crudModule({
  folder: 'daily-reviews', route: 'daily-reviews', tag: 'daily-reviews', entity: 'DailyReview', entityFile: 'daily-review.entity.ts',
  service: 'DailyReviewsService', controller: 'DailyReviewsController', moduleClass: 'DailyReviewsModule',
  activityModule: 'DAILY_REVIEWS', createDtoClass: 'CreateDailyReviewDto', updateDtoClass: 'UpdateDailyReviewDto', createDtoFile: 'create-daily-review.dto.ts', updateDtoFile: 'update-daily-review.dto.ts',
  serviceFile: 'daily-reviews.service.ts', controllerFile: 'daily-reviews.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyReviewDto {
  @ApiProperty()
  @IsDateString()
  reviewDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wins?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challenges?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessons?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tomorrowFocus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  moodScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  productivityScore?: number;
}
`,
  updateDtoClass: 'UpdateDailyReviewDto',
});

// English
crudModule({
  folder: 'english', route: 'english', tag: 'english', entity: 'EnglishPractice', entityFile: 'english-practice.entity.ts',
  service: 'EnglishService', controller: 'EnglishController', moduleClass: 'EnglishModule',
  activityModule: 'ENGLISH', createDtoClass: 'CreateEnglishPracticeDto', updateDtoClass: 'UpdateEnglishPracticeDto', createDtoFile: 'create-english-practice.dto.ts', updateDtoFile: 'update-english-practice.dto.ts',
  serviceFile: 'english.service.ts', controllerFile: 'english.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EnglishPracticeType } from '../../domain/enums/english.enums';

export class CreateEnglishPracticeDto {
  @ApiProperty({ enum: EnglishPracticeType })
  @IsEnum(EnglishPracticeType)
  practiceType: EnglishPracticeType;

  @ApiProperty()
  @IsDateString()
  practiceDate: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  score?: number;
}
`,
  updateDtoClass: 'UpdateEnglishPracticeDto',
});

// Spiritual
crudModule({
  folder: 'spiritual', route: 'spiritual', tag: 'spiritual', entity: 'SpiritualActivity', entityFile: 'spiritual-activity.entity.ts',
  service: 'SpiritualService', controller: 'SpiritualController', moduleClass: 'SpiritualModule',
  activityModule: 'SPIRITUAL', createDtoClass: 'CreateSpiritualActivityDto', updateDtoClass: 'UpdateSpiritualActivityDto', createDtoFile: 'create-spiritual-activity.dto.ts', updateDtoFile: 'update-spiritual-activity.dto.ts',
  serviceFile: 'spiritual.service.ts', controllerFile: 'spiritual.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SpiritualActivityType } from '../../domain/enums/spiritual.enums';

export class CreateSpiritualActivityDto {
  @ApiProperty({ enum: SpiritualActivityType })
  @IsEnum(SpiritualActivityType)
  activityType: SpiritualActivityType;

  @ApiProperty()
  @IsDateString()
  activityDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
`,
  updateDtoClass: 'UpdateSpiritualActivityDto',
});

// Health
crudModule({
  folder: 'health', route: 'health', tag: 'health', entity: 'HealthLog', entityFile: 'health-log.entity.ts',
  service: 'HealthService', controller: 'HealthController', moduleClass: 'HealthModule',
  activityModule: 'HEALTH', createDtoClass: 'CreateHealthLogDto', updateDtoClass: 'UpdateHealthLogDto', createDtoFile: 'create-health-log.dto.ts', updateDtoFile: 'update-health-log.dto.ts',
  serviceFile: 'health.service.ts', controllerFile: 'health.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { HealthMetricType } from '../../domain/enums/health.enums';

export class CreateHealthLogDto {
  @ApiProperty({ enum: HealthMetricType })
  @IsEnum(HealthMetricType)
  metricType: HealthMetricType;

  @ApiProperty()
  @IsDateString()
  logDate: string;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
`,
  updateDtoClass: 'UpdateHealthLogDto',
});

// Journal
crudModule({
  folder: 'journal', route: 'journal', tag: 'journal', entity: 'JournalEntry', entityFile: 'journal-entry.entity.ts',
  service: 'JournalService', controller: 'JournalController', moduleClass: 'JournalModule',
  activityModule: 'JOURNAL', createDtoClass: 'CreateJournalEntryDto', updateDtoClass: 'UpdateJournalEntryDto', createDtoFile: 'create-journal-entry.dto.ts', updateDtoFile: 'update-journal-entry.dto.ts',
  serviceFile: 'journal.service.ts', controllerFile: 'journal.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { JournalEntryType } from '../../domain/enums/journal.enums';

export class CreateJournalEntryDto {
  @ApiProperty({ enum: JournalEntryType })
  @IsEnum(JournalEntryType)
  entryType: JournalEntryType;

  @ApiProperty()
  @IsDateString()
  entryDate: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
`,
  updateDtoClass: 'UpdateJournalEntryDto',
});

// Notifications
crudModule({
  folder: 'notifications', route: 'notifications', tag: 'notifications', entity: 'Notification', entityFile: 'notification.entity.ts',
  service: 'NotificationsService', controller: 'NotificationsController', moduleClass: 'NotificationsModule',
  activityModule: 'NOTIFICATIONS', createDtoClass: 'CreateNotificationDto', updateDtoClass: 'UpdateNotificationDto', createDtoFile: 'create-notification.dto.ts', updateDtoFile: 'update-notification.dto.ts',
  serviceFile: 'notifications.service.ts', controllerFile: 'notifications.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  readAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;
}
`,
  updateDtoClass: 'UpdateNotificationDto',
});

// AI Coach
crudModule({
  folder: 'ai-coach', route: 'ai-coach', tag: 'ai-coach', entity: 'AiCoachSession', entityFile: 'ai-coach-session.entity.ts',
  service: 'AiCoachService', controller: 'AiCoachController', moduleClass: 'AiCoachModule',
  activityModule: 'AI_COACH', createDtoClass: 'CreateAiCoachSessionDto', updateDtoClass: 'UpdateAiCoachSessionDto', createDtoFile: 'create-ai-coach-session.dto.ts', updateDtoFile: 'update-ai-coach-session.dto.ts',
  serviceFile: 'ai-coach.service.ts', controllerFile: 'ai-coach.controller.ts',
  createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoachMessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsString()
  createdAt: string;
}

export class CreateAiCoachSessionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ type: [CoachMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoachMessageDto)
  messages?: CoachMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
`,
  updateDtoClass: 'UpdateAiCoachSessionDto',
});

console.log('Created', created.length, 'files');
fs.writeFileSync(path.join(__dirname, 'created-files.json'), JSON.stringify(created, null, 2));
