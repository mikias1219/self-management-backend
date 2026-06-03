import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityModule } from '../../../../common/domain/enums/activity-action.enum';
import { BaseCrudService } from '../../../../common/services/base-crud.service';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { FinanceAccount } from '../../domain/entities/account.entity';

@Injectable()
export class AccountsService extends BaseCrudService<FinanceAccount> {
  constructor(
    @InjectRepository(FinanceAccount) repository: Repository<FinanceAccount>,
    activityLogs: ActivityLogsService,
  ) {
    super(repository, activityLogs, {
      userId: '',
      module: ActivityModule.FINANCE,
      entityType: 'FinanceAccount',
    });
  }
}
