import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '../src/modules');

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function write(relativePath, content) {
  const full = join(SRC, relativePath);
  ensureDir(dirname(full));
  writeFileSync(full, content);
  return full;
}

const CRUD_MODULES = [
  {
    name: 'tasks',
    route: 'tasks',
    tag: 'tasks',
    entity: 'Task',
    entityPath: '../../domain/entities/task.entity',
    module: 'TASKS',
    createFields: `
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  taskStatus?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goalId?: string;`,
    createImports: `import { TaskPriority, TaskStatus } from '../../domain/enums/task.enums';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`,
  },
  {
    name: 'goals',
    route: 'goals',
    tag: 'goals',
    entity: 'Goal',
    entityPath: '../../domain/entities/goal.entity',
    module: 'GOALS',
    createFields: `
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
  category?: string;`,
    createImports: `import { GoalLevel } from '../../domain/enums/goal.enums';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`,
  },
  {
    name: 'daily-reviews',
    route: 'daily-reviews',
    tag: 'daily-reviews',
    entity: 'DailyReview',
    entityPath: '../../domain/entities/daily-review.entity',
    module: 'DAILY_REVIEWS',
    createFields: `
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
  productivityScore?: number;`,
    createImports: `import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`,
  },
];

function generateCrudModule(config) {
  const { name, route, tag, entity, entityPath, module, createFields, createImports } = config;
  const kebab = name;
  const pascal = entity;
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  const serviceName = `${pascal}sService`.replace('DailyReviewsService', 'DailyReviewsService').replace('DailyReviewssService', 'DailyReviewsService');
  const actualService = kebab === 'daily-reviews' ? 'DailyReviewsService' : `${pascal}sService`;
  const actualController = kebab === 'daily-reviews' ? 'DailyReviewsController' : `${pascal}sController`;
  const dtoPrefix = kebab === 'daily-reviews' ? 'daily-review' : kebab.replace(/s$/, '').replace(/-reviews$/, '-review').replace('goal', 'goal').replace('task', 'task');
  const createDtoName = kebab === 'daily-reviews' ? 'CreateDailyReviewDto' : `Create${pascal}Dto`;
  const updateDtoName = kebab === 'daily-reviews' ? 'UpdateDailyReviewDto' : `Update${pascal}Dto`;
  const createFile = kebab === 'daily-reviews' ? 'create-daily-review.dto.ts' : `create-${kebab.replace(/s$/, '')}.dto.ts`;
  const updateFile = kebab === 'daily-reviews' ? 'update-daily-review.dto.ts' : `update-${kebab.replace(/s$/, '')}.dto.ts`;

  write(`${kebab}/application/dto/${createFile}`, `${createImports}

export class ${createDtoName} {${createFields}
}
`);

  write(`${kebab}/application/dto/${updateFile}`, `import { PartialType } from '@nestjs/mapped-types';
import { ${createDtoName} } from './${createFile.replace('.ts', '')}';

export class ${updateDtoName} extends PartialType(${createDtoName}) {}
`);

  write(`${kebab}/application/services/${kebab}.service.ts`, `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { ${pascal} } from '${entityPath}.entity';

@Injectable()
export class ${actualService} extends BaseCrudService<${pascal}> {
  constructor(
    @InjectRepository(${pascal})
    repository: Repository<${pascal}>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.${module},
      entityType: '${pascal}',
    });
  }
}
`);

  write(`${kebab}/presentation/controllers/${kebab}.controller.ts`, `import {
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
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { ${actualService} } from '../../application/services/${kebab}.service';
import { ${createDtoName} } from '../../application/dto/${createFile.replace('.ts', '')}';
import { ${updateDtoName} } from '../../application/dto/${updateFile.replace('.ts', '')}';

@ApiTags('${tag}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${route}')
export class ${actualController} {
  constructor(private readonly service: ${actualService}) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: ${createDtoName}) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: ${updateDtoName},
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
`);

  write(`${kebab}/${kebab}.module.ts`, `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${pascal} } from './domain/entities/${kebab === 'daily-reviews' ? 'daily-review' : kebab.replace(/s$/, '')}.entity';
import { ${actualService} } from './application/services/${kebab}.service';
import { ${actualController} } from './presentation/controllers/${kebab}.controller';

@Module({
  imports: [TypeOrmModule.forFeature([${pascal}])],
  controllers: [${actualController}],
  providers: [${actualService}],
  exports: [${actualService}],
})
export class ${pascal}sModule {}
`.replace('DailyReviewsModule', 'DailyReviewsModule').replace('DailyReviewsDailyReviewsModule', 'DailyReviewsModule'));
}

for (const mod of CRUD_MODULES) {
  generateCrudModule(mod);
}

console.log('Generated basic CRUD modules');
