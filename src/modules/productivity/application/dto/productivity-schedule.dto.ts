export type ScheduleItemKind =
  | 'task'
  | 'goal'
  | 'habit'
  | 'review'
  | 'calendar';

export interface ScheduleItem {
  id: string;
  kind: ScheduleItemKind;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  status?: string;
  progress?: number;
  entityId: string;
  measurable?: {
    plannedMinutes?: number;
    spentMinutes?: number;
    streak?: number;
  };
  syncedToCalendar?: boolean;
  meta?: Record<string, string | number | boolean | null>;
}

export interface TodaySuccess {
  tasksCompleted: number;
  tasksPlanned: number;
  minutesPlanned: number;
  minutesAchieved: number;
  completionRate: number;
  habitsDone: number;
  habitsTotal: number;
  successScore: number;
}

export interface ProductivitySchedule {
  range: { start: string; end: string };
  today: string;
  googleCalendar: {
    connected: boolean;
    configured: boolean;
    email: string | null;
    upcomingCount: number;
  };
  summary: {
    tasksOpen: number;
    tasksDueToday: number;
    habitsDueToday: number;
    habitsLoggedToday: number;
    goalsWithDeadline: number;
    reviewDoneToday: boolean;
  };
  todaySuccess: TodaySuccess;
  items: ScheduleItem[];
}
