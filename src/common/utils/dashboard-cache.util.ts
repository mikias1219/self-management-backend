import type { Cache } from 'cache-manager';

export const dashboardOverviewCacheKey = (userId: string) =>
  `dashboard:overview:${userId}`;

export async function invalidateDashboardOverview(
  cache: Cache,
  userId: string,
): Promise<void> {
  await cache.del(dashboardOverviewCacheKey(userId));
}
