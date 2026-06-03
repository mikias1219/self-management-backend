import { Module } from '@nestjs/common';
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
