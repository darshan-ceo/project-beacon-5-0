export const HEARING_MINI_CALENDAR_CONFIG = {
  DEFAULT_LIMIT: 7,
  MOBILE_LIMIT: 3,
  TABLET_LIMIT: 5,
  DESKTOP_LIMIT: 7,
  DEFAULT_FILTER: 'My Cases',
  SHOW_ASSIGNEE: true,
  SHOW_CLIENT: true,
  CACHE_TTL: 60000, // 60 seconds
  COMPACT_ON_MOBILE: true,
} as const;

export const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'My Cases', value: 'my-cases' },
  { label: 'Team', value: 'team' },
  { label: 'This Week', value: 'this-week' },
  { label: 'Next 30 Days', value: 'next-30-days' },
] as const;

export const HEARING_STATUS_COLORS = {
  scheduled: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-800 dark:text-blue-200', label: 'Scheduled' },
  concluded: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-800 dark:text-green-200', label: 'Completed' },
  adjourned: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-800 dark:text-yellow-200', label: 'Adjourned' },
  'no-board': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200', label: 'No Board' },
  withdrawn: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-800 dark:text-red-200', label: 'Cancelled' },
} as const;
