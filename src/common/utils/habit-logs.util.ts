import type { Habit } from '../../modules/habits/domain/entities/habit.entity';
import type { HabitLog } from '../../modules/habits/domain/entities/habit-log.entity';

export function habitLogsInRange(
  habits: Habit[],
  start: Date,
  end: Date,
): HabitLog[] {
  return habits.flatMap((habit) => habit.logs ?? []).filter((log) => {
    const completedAt = new Date(log.completedAt);
    return completedAt >= start && completedAt <= end;
  });
}
