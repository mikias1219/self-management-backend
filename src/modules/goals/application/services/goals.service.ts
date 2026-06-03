import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { Goal } from '../../domain/entities/goal.entity';
import { CreateGoalDto } from '../dto/create-goal.dto';

@Injectable()
export class GoalsService extends BaseCrudService<Goal> {
  protected override readonly relations = { children: true, parent: true };

  constructor(
    @InjectRepository(Goal)
    repository: Repository<Goal>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.GOALS,
      entityType: 'Goal',
    });
  }

  async create(dto: CreateGoalDto, userId: string): Promise<Goal> {
    if (dto.parentId) {
      const parent = await this.findOneForUser(userId, dto.parentId);
      if (parent.parentId) {
        throw new BadRequestException('Parent goal cannot be a sub-goal');
      }
    }
    return super.create(dto as DeepPartial<Goal>, userId);
  }
}
