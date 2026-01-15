/**
 * Status Colors - Condition Within a Stage
 * Status defines the CONDITION of items (tasks, hearings, cases)
 * H-Office Litigation CRM Brand Guidelines v1.0
 */

export type StatusType = 'success' | 'partial' | 'pending' | 'warning' | 'overdue' | 'info';

export interface StatusColorConfig {
  label: string;
  color: string;
  hsl: string;
  className: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const STATUS_COLORS: Record<StatusType, StatusColorConfig> = {
  success: {
    label: "Favourable / Completed",
    color: "#16A34A",
    hsl: "142 76% 36%",
    className: "bg-green-50 text-green-700 border-green-200",
    badgeVariant: "default"
  },
  partial: {
    label: "Partial Relief",
    color: "#65A30D",
    hsl: "84 81% 44%",
    className: "bg-lime-50 text-lime-700 border-lime-200",
    badgeVariant: "secondary"
  },
  pending: {
    label: "Pending / In Progress",
    color: "#2563EB",
    hsl: "217 91% 60%",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    badgeVariant: "secondary"
  },
  warning: {
    label: "Pending Compliance / Attention",
    color: "#F59E0B",
    hsl: "38 92% 50%",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    badgeVariant: "outline"
  },
  overdue: {
    label: "Overdue / Risk",
    color: "#DC2626",
    hsl: "0 84% 50%",
    className: "bg-red-50 text-red-700 border-red-200",
    badgeVariant: "destructive"
  },
  info: {
    label: "Informational",
    color: "#0284C7",
    hsl: "199 89% 48%",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    badgeVariant: "secondary"
  }
};

/**
 * Map common status strings to StatusType
 */
export function mapStatusToType(status: string): StatusType {
  const statusLower = status.toLowerCase();
  
  // Success/Completed statuses
  if (['completed', 'done', 'approved', 'favourable', 'resolved', 'closed'].some(s => statusLower.includes(s))) {
    return 'success';
  }
  
  // Partial relief
  if (['partial'].some(s => statusLower.includes(s))) {
    return 'partial';
  }
  
  // Overdue/Risk statuses
  if (['overdue', 'expired', 'missed', 'critical', 'urgent', 'risk'].some(s => statusLower.includes(s))) {
    return 'overdue';
  }
  
  // Warning/Attention statuses
  if (['warning', 'attention', 'due', 'upcoming'].some(s => statusLower.includes(s))) {
    return 'warning';
  }
  
  // Pending/In Progress statuses
  if (['pending', 'in progress', 'active', 'open', 'scheduled', 'draft'].some(s => statusLower.includes(s))) {
    return 'pending';
  }
  
  // Default to info
  return 'info';
}

/**
 * Get status color config from status string
 */
export function getStatusColor(status: string): StatusColorConfig {
  const statusType = mapStatusToType(status);
  return STATUS_COLORS[statusType];
}

/**
 * Priority to status type mapping (for priority badges)
 * NOTE: Orange is NOT used per brand guidelines
 */
export function mapPriorityToStatus(priority: string): StatusType {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'overdue';      // Red
    case 'high':
      return 'warning';      // Amber (NOT orange)
    case 'medium':
      return 'pending';      // Blue
    case 'low':
      return 'success';      // Green
    default:
      return 'info';
  }
}
