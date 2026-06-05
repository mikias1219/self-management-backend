import { AnalyticsPeriod } from '../../../../common/domain/enums/period.enum';

export interface PeriodTrendPoint {
  date: string;
  completed: number;
  planned: number;
  habitLogs: number;
}

export interface PeriodProductivityMetrics {
  period: AnalyticsPeriod;
  range: { start: string; end: string };
  successScore: number;
  tasks: {
    total: number;
    completed: number;
    open: number;
    overdue: number;
    completionRate: number;
    plannedMinutes: number;
    spentMinutes: number;
    dueInPeriod: number;
    completedInPeriod: number;
  };
  goals: {
    active: number;
    avgProgress: number;
    completed: number;
    byLevel: Record<string, number>;
  };
  habits: {
    totalHabits: number;
    logsCount: number;
    completionRate: number;
    targetLogs: number;
  };
  trend: PeriodTrendPoint[];
}

export interface ProductivityMetricsAll {
  daily: PeriodProductivityMetrics;
  weekly: PeriodProductivityMetrics;
  monthly: PeriodProductivityMetrics;
  yearly: PeriodProductivityMetrics;
}
