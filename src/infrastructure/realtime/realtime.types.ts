import {
  ActivityAction,
  ActivityModule,
} from '../../common/domain/enums/activity-action.enum';

export interface RealtimePayload {
  module: ActivityModule;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  at: string;
}
