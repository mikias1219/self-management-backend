import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Between, Repository } from 'typeorm';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';
import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { resolveDateRange } from '../../../../common/utils/date-range.util';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { DailyPlan } from '../../domain/entities/daily-plan.entity';
import { PlanStatus } from '../../domain/enums/plan-status.enum';
import { CreateDailyPlanDto } from '../dto/create-daily-plan.dto';
import { ReportDailyPlanDto } from '../dto/report-daily-plan.dto';
import { UpdateDailyPlanDto } from '../dto/update-daily-plan.dto';

@Injectable()
export class DailyPlansService extends BaseCrudService<DailyPlan> {
  constructor(
    @InjectRepository(DailyPlan)
    repository: Repository<DailyPlan>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.DASHBOARD,
      entityType: 'DailyPlan',
    });
  }

  async findForPeriod(userId: string, query?: DateRangeQueryDto) {
    const range = resolveDateRange(
      query?.period ?? AnalyticsPeriod.DAY,
      query?.startDate,
      query?.endDate,
    );
    const dateBetween = Between(
      format(range.start, 'yyyy-MM-dd'),
      format(range.end, 'yyyy-MM-dd'),
    );
    return this.repository.find({
      where: { createdBy: userId, planDate: dateBetween },
      order: { planDate: 'ASC', createdAt: 'ASC' },
    });
  }

  async createPlan(userId: string, dto: CreateDailyPlanDto) {
    return this.create(
      {
        title: dto.title,
        module: dto.module,
        planDate: dto.planDate,
        plannedMinutes: dto.plannedMinutes,
        achievedMinutes: 0,
        planStatus: PlanStatus.PLANNED,
        notes: dto.notes,
      },
      userId,
    );
  }

  async updatePlan(userId: string, id: string, dto: UpdateDailyPlanDto) {
    const patch: Partial<DailyPlan> = { ...dto };
    if (dto.plannedMinutes != null || dto.title != null) {
      const existing = await this.findOneForUser(userId, id);
      if (existing.planStatus === PlanStatus.PLANNED && !dto.plannedMinutes) {
        patch.planStatus = PlanStatus.PLANNED;
      }
    }
    return this.update(id, patch, userId);
  }

  async startPlan(userId: string, id: string) {
    const plan = await this.findOneForUser(userId, id);
    if (plan.planStatus === PlanStatus.PLANNED) {
      plan.planStatus = PlanStatus.IN_PROGRESS;
      return this.repository.save(plan);
    }
    return plan;
  }

  async reportPlan(userId: string, id: string, dto: ReportDailyPlanDto) {
    const plan = await this.findOneForUser(userId, id);
    const achieved = dto.achievedMinutes;
    plan.achievedMinutes = achieved;
    plan.reportedAt = new Date();
    plan.notes = dto.notes ?? plan.notes;
    plan.planStatus =
      achieved >= plan.plannedMinutes
        ? PlanStatus.ACHIEVED
        : achieved > 0
          ? PlanStatus.ACHIEVED
          : PlanStatus.MISSED;

    const saved = await this.repository.save(plan);
    const pct = Math.round((achieved / plan.plannedMinutes) * 100);
    await this.activityLogs.log({
      userId,
      module: ActivityModule.DASHBOARD,
      action: ActivityAction.COMPLETED,
      entityType: 'DailyPlan',
      entityId: saved.id,
      description: `Reported plan: ${saved.title} — ${achieved}/${saved.plannedMinutes} min (${pct}%)`,
      metadata: {
        title: saved.title,
        module: saved.module,
        plannedMinutes: saved.plannedMinutes,
        achievedMinutes: achieved,
        fulfillmentPercent: pct,
      },
    });
    return saved;
  }
}
