import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { AnalyticsPeriod } from '../domain/enums/period.enum';

export interface DateRange {
  start: Date;
  end: Date;
}

export function resolveDateRange(
  period?: AnalyticsPeriod,
  startDate?: string,
  endDate?: string,
  reference = new Date(),
): DateRange {
  if (period === AnalyticsPeriod.CUSTOM && startDate && endDate) {
    return {
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate)),
    };
  }

  switch (period) {
    case AnalyticsPeriod.WEEK:
      return {
        start: startOfWeek(reference, { weekStartsOn: 1 }),
        end: endOfWeek(reference, { weekStartsOn: 1 }),
      };
    case AnalyticsPeriod.MONTH:
      return {
        start: startOfMonth(reference),
        end: endOfMonth(reference),
      };
    case AnalyticsPeriod.QUARTER:
      return {
        start: startOfQuarter(reference),
        end: endOfQuarter(reference),
      };
    case AnalyticsPeriod.YEAR:
      return {
        start: startOfYear(reference),
        end: endOfYear(reference),
      };
    case AnalyticsPeriod.DAY:
    default:
      return {
        start: startOfDay(reference),
        end: endOfDay(reference),
      };
  }
}
