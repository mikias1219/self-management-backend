#!/usr/bin/env node
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

const learningEntities = [
  {
    sub: 'skills', entity: 'Skill', entityFile: 'skill.entity.ts', service: 'SkillsService',
    controller: 'SkillsController', createClass: 'CreateSkillDto', updateClass: 'UpdateSkillDto',
    createFile: 'create-skill.dto.ts', updateFile: 'update-skill.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  proficiency?: number;
}`,
  },
  {
    sub: 'courses', entity: 'Course', entityFile: 'course.entity.ts', service: 'CoursesService',
    controller: 'CoursesController', createClass: 'CreateCourseDto', updateClass: 'UpdateCourseDto',
    createFile: 'create-course.dto.ts', updateFile: 'update-course.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  hoursSpent?: number;
}`,
  },
  {
    sub: 'books', entity: 'Book', entityFile: 'book.entity.ts', service: 'BooksService',
    controller: 'BooksController', createClass: 'CreateBookDto', updateClass: 'UpdateBookDto',
    createFile: 'create-book.dto.ts', updateFile: 'update-book.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesRead?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPages?: number;
}`,
  },
  {
    sub: 'projects', entity: 'LearningProject', entityFile: 'learning-project.entity.ts', service: 'LearningProjectsService',
    controller: 'LearningProjectsController', createClass: 'CreateLearningProjectDto', updateClass: 'UpdateLearningProjectDto',
    createFile: 'create-learning-project.dto.ts', updateFile: 'update-learning-project.dto.ts',
    route: 'learning/projects',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LearningItemStatus } from '../../domain/enums/learning.enums';

export class CreateLearningProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LearningItemStatus })
  @IsOptional()
  @IsEnum(LearningItemStatus)
  learningStatus?: LearningItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;
}`,
  },
  {
    sub: 'study-sessions', entity: 'StudySession', entityFile: 'study-session.entity.ts', service: 'StudySessionsService',
    controller: 'StudySessionsController', createClass: 'CreateStudySessionDto', updateClass: 'UpdateStudySessionDto',
    createFile: 'create-study-session.dto.ts', updateFile: 'update-study-session.dto.ts',
    route: 'learning/study-sessions',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateStudySessionDto {
  @ApiProperty()
  @IsDateString()
  sessionDate: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}`,
  },
];

for (const e of learningEntities) {
  const route = e.route ?? `learning/${e.sub}`;
  w(`learning/application/dto/${e.createFile}`, e.createDto);
  w(`learning/application/dto/${e.updateFile}`, `import { PartialType } from '@nestjs/mapped-types';
import { ${e.createClass} } from './${e.createFile.replace('.ts', '')}';
export class ${e.updateClass} extends PartialType(${e.createClass}) {}
`);
  w(`learning/application/services/${e.sub}.service.ts`, `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { ${e.entity} } from '../../domain/entities/${e.entityFile.replace('.ts', '')}';

@Injectable()
export class ${e.service} extends BaseCrudService<${e.entity}> {
  constructor(
    @InjectRepository(${e.entity}) repository: Repository<${e.entity}>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: '${e.entity}',
    });
  }
}
`);
  w(`learning/presentation/controllers/${e.sub}.controller.ts`, `import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ${e.createClass} } from '../../application/dto/${e.createFile.replace('.ts', '')}';
import { ${e.updateClass} } from '../../application/dto/${e.updateFile.replace('.ts', '')}';
import { ${e.service} } from '../../application/services/${e.sub}.service';

@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${route}')
export class ${e.controller} {
  constructor(private readonly service: ${e.service}) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: ${e.createClass}) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: ${e.updateClass}) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
`);
}

w('learning/learning.module.ts', `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './application/services/books.service';
import { CoursesService } from './application/services/courses.service';
import { LearningProjectsService } from './application/services/projects.service';
import { SkillsService } from './application/services/skills.service';
import { StudySessionsService } from './application/services/study-sessions.service';
import { Book } from './domain/entities/book.entity';
import { Course } from './domain/entities/course.entity';
import { LearningProject } from './domain/entities/learning-project.entity';
import { Skill } from './domain/entities/skill.entity';
import { StudySession } from './domain/entities/study-session.entity';
import { BooksController } from './presentation/controllers/books.controller';
import { CoursesController } from './presentation/controllers/courses.controller';
import { LearningProjectsController } from './presentation/controllers/projects.controller';
import { SkillsController } from './presentation/controllers/skills.controller';
import { StudySessionsController } from './presentation/controllers/study-sessions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, Course, Book, LearningProject, StudySession])],
  controllers: [
    SkillsController,
    CoursesController,
    BooksController,
    LearningProjectsController,
    StudySessionsController,
  ],
  providers: [SkillsService, CoursesService, BooksService, LearningProjectsService, StudySessionsService],
  exports: [SkillsService, CoursesService, BooksService, LearningProjectsService, StudySessionsService],
})
export class LearningModule {}
`);

const financeEntities = [
  {
    sub: 'accounts', entity: 'FinanceAccount', entityFile: 'account.entity.ts', service: 'AccountsService',
    controller: 'AccountsController', route: 'finance/accounts',
    createClass: 'CreateAccountDto', updateClass: 'UpdateAccountDto',
    createFile: 'create-account.dto.ts', updateFile: 'update-account.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AccountType } from '../../domain/enums/finance.enums';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}`,
  },
  {
    sub: 'transactions', entity: 'FinanceTransaction', entityFile: 'transaction.entity.ts', service: 'TransactionsService',
    controller: 'TransactionsController', route: 'finance/transactions',
    createClass: 'CreateTransactionDto', updateClass: 'UpdateTransactionDto',
    createFile: 'create-transaction.dto.ts', updateFile: 'update-transaction.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { TransactionType } from '../../domain/enums/finance.enums';

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  accountId: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}`,
  },
  {
    sub: 'budgets', entity: 'FinanceBudget', entityFile: 'budget.entity.ts', service: 'BudgetsService',
    controller: 'BudgetsController', route: 'finance/budgets',
    createClass: 'CreateBudgetDto', updateClass: 'UpdateBudgetDto',
    createFile: 'create-budget.dto.ts', updateFile: 'update-budget.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  spent?: number;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}`,
  },
  {
    sub: 'savings-goals', entity: 'SavingsGoal', entityFile: 'savings-goal.entity.ts', service: 'SavingsGoalsService',
    controller: 'SavingsGoalsController', route: 'finance/savings-goals',
    createClass: 'CreateSavingsGoalDto', updateClass: 'UpdateSavingsGoalDto',
    createFile: 'create-savings-goal.dto.ts', updateFile: 'update-savings-goal.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  targetAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}`,
  },
  {
    sub: 'expense-categories', entity: 'ExpenseCategory', entityFile: 'expense-category.entity.ts', service: 'ExpenseCategoriesService',
    controller: 'ExpenseCategoriesController', route: 'finance/expense-categories',
    createClass: 'CreateExpenseCategoryDto', updateClass: 'UpdateExpenseCategoryDto',
    createFile: 'create-expense-category.dto.ts', updateFile: 'update-expense-category.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}`,
  },
  {
    sub: 'income-categories', entity: 'IncomeCategory', entityFile: 'income-category.entity.ts', service: 'IncomeCategoriesService',
    controller: 'IncomeCategoriesController', route: 'finance/income-categories',
    createClass: 'CreateIncomeCategoryDto', updateClass: 'UpdateIncomeCategoryDto',
    createFile: 'create-income-category.dto.ts', updateFile: 'update-income-category.dto.ts',
    createDto: `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateIncomeCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}`,
  },
];

for (const e of financeEntities) {
  w(`finance/application/dto/${e.createFile}`, e.createDto);
  w(`finance/application/dto/${e.updateFile}`, `import { PartialType } from '@nestjs/mapped-types';
import { ${e.createClass} } from './${e.createFile.replace('.ts', '')}';
export class ${e.updateClass} extends PartialType(${e.createClass}) {}
`);
  w(`finance/application/services/${e.sub}.service.ts`, `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { ${e.entity} } from '../../domain/entities/${e.entityFile.replace('.ts', '')}';

@Injectable()
export class ${e.service} extends BaseCrudService<${e.entity}> {
  constructor(
    @InjectRepository(${e.entity}) repository: Repository<${e.entity}>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: '${e.entity}',
    });
  }
}
`);
  w(`finance/presentation/controllers/${e.sub}.controller.ts`, `import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUserPayload, CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ${e.createClass} } from '../../application/dto/${e.createFile.replace('.ts', '')}';
import { ${e.updateClass} } from '../../application/dto/${e.updateFile.replace('.ts', '')}';
import { ${e.service} } from '../../application/services/${e.sub}.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${e.route}')
export class ${e.controller} {
  constructor(private readonly service: ${e.service}) {}

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: ${e.createClass}) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUserPayload, @Param('id') id: string, @Body() dto: ${e.updateClass}) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
`);
}

w('finance/finance.module.ts', `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './application/services/accounts.service';
import { BudgetsService } from './application/services/budgets.service';
import { ExpenseCategoriesService } from './application/services/expense-categories.service';
import { IncomeCategoriesService } from './application/services/income-categories.service';
import { SavingsGoalsService } from './application/services/savings-goals.service';
import { TransactionsService } from './application/services/transactions.service';
import { FinanceAccount } from './domain/entities/account.entity';
import { FinanceBudget } from './domain/entities/budget.entity';
import { ExpenseCategory } from './domain/entities/expense-category.entity';
import { IncomeCategory } from './domain/entities/income-category.entity';
import { SavingsGoal } from './domain/entities/savings-goal.entity';
import { FinanceTransaction } from './domain/entities/transaction.entity';
import { AccountsController } from './presentation/controllers/accounts.controller';
import { BudgetsController } from './presentation/controllers/budgets.controller';
import { ExpenseCategoriesController } from './presentation/controllers/expense-categories.controller';
import { IncomeCategoriesController } from './presentation/controllers/income-categories.controller';
import { SavingsGoalsController } from './presentation/controllers/savings-goals.controller';
import { TransactionsController } from './presentation/controllers/transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    FinanceAccount, FinanceTransaction, FinanceBudget, SavingsGoal, ExpenseCategory, IncomeCategory,
  ])],
  controllers: [
    AccountsController, TransactionsController, BudgetsController,
    SavingsGoalsController, ExpenseCategoriesController, IncomeCategoriesController,
  ],
  providers: [
    AccountsService, TransactionsService, BudgetsService,
    SavingsGoalsService, ExpenseCategoriesService, IncomeCategoriesService,
  ],
  exports: [
    AccountsService, TransactionsService, BudgetsService,
    SavingsGoalsService, ExpenseCategoriesService, IncomeCategoriesService,
  ],
})
export class FinanceModule {}
`);

console.log('Created', created.length, 'learning/finance files');
fs.appendFileSync(path.join(__dirname, 'created-files.json'), '\n' + JSON.stringify(created, null, 2));
