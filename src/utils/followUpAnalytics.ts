import { Task, TaskFollowUp } from '@/contexts/AppStateContext';

export interface FollowUpMetrics {
  totalFollowUps: number;
  followUpsThisWeek: number;
  followUpsThisMonth: number;
  averageFollowUpsPerTask: number;
  mostActiveUsers: { userId: string; userName: string; count: number }[];
  outcomeDistribution: Record<string, number>;
  averageTimeToFirstFollowUp: number; // in hours
  tasksWithOverdueFollowUps: number;
}

export function calculateFollowUpMetrics(
  tasks: Task[],
  taskFollowUps: TaskFollowUp[]
): FollowUpMetrics {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Follow-ups this week/month
  const followUpsThisWeek = taskFollowUps.filter(
    f => new Date(f.createdAt) > oneWeekAgo
  ).length;

  const followUpsThisMonth = taskFollowUps.filter(
    f => new Date(f.createdAt) > oneMonthAgo
  ).length;

  // Average follow-ups per task
  const tasksWithFollowUps = new Set(taskFollowUps.map(f => f.taskId)).size;
  const averageFollowUpsPerTask = tasksWithFollowUps > 0
    ? taskFollowUps.length / tasksWithFollowUps
    : 0;

  // Most active users
  const userCounts = taskFollowUps.reduce((acc, f) => {
    const key = `${f.createdBy}:${f.createdByName}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostActiveUsers = Object.entries(userCounts)
    .map(([key, count]) => {
      const [userId, userName] = key.split(':');
      return { userId, userName, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Outcome distribution
  const outcomeDistribution = taskFollowUps.reduce((acc, f) => {
    const outcome = f.outcome || 'Unknown';
    acc[outcome] = (acc[outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Average time to first follow-up
  const timeToFirstFollowUp = tasks
    .filter(t => t.isLocked && t.lockedAt)
    .map(t => {
      const created = new Date(t.createdDate).getTime();
      const locked = new Date(t.lockedAt!).getTime();
      return (locked - created) / (1000 * 60 * 60); // hours
    });

  const averageTimeToFirstFollowUp = timeToFirstFollowUp.length > 0
    ? timeToFirstFollowUp.reduce((sum, time) => sum + time, 0) / timeToFirstFollowUp.length
    : 0;

  // Overdue follow-ups
  const tasksWithOverdueFollowUps = tasks.filter(t => {
    if (!t.currentFollowUpDate) return false;
    return new Date(t.currentFollowUpDate) < now;
  }).length;

  return {
    totalFollowUps: taskFollowUps.length,
    followUpsThisWeek,
    followUpsThisMonth,
    averageFollowUpsPerTask: Math.round(averageFollowUpsPerTask * 10) / 10,
    mostActiveUsers,
    outcomeDistribution,
    averageTimeToFirstFollowUp: Math.round(averageTimeToFirstFollowUp * 10) / 10,
    tasksWithOverdueFollowUps
  };
}
