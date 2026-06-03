import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Course } from '../../domain/entities/course.entity';

@Injectable()
export class CoursesService extends BaseCrudService<Course> {
  constructor(
    @InjectRepository(Course) repository: Repository<Course>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.LEARNING,
      entityType: 'Course',
    });
  }
}
