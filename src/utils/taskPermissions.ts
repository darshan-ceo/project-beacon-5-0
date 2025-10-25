import { Task, UserProfile } from '@/contexts/AppStateContext';

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAddFollowUp: boolean;
  canUnlock: boolean;
  canForceEdit: boolean;
  reason?: string;
}

export const evaluateTaskPermissions = (
  task: Task,
  currentUser: UserProfile
): TaskPermissions => {
  const isCreator = task.assignedById === currentUser.id;
  const isAssignee = task.assignedToId === currentUser.id;
  const isAdmin = currentUser.role === 'Admin';
  const isLocked = task.isLocked === true;

  // Base permissions
  const permissions: TaskPermissions = {
    canEdit: false,
    canDelete: false,
    canAddFollowUp: false,
    canUnlock: false,
    canForceEdit: false,
  };

  // Add follow-up permissions (assignee, creator, or admin)
  if (isAssignee || isCreator || isAdmin) {
    permissions.canAddFollowUp = true;
  }

  // Unlocked task permissions
  if (!isLocked) {
    if (isCreator || isAdmin) {
      permissions.canEdit = true;
      permissions.canDelete = true;
    }
    return permissions;
  }

  // Locked task permissions
  if (isLocked) {
    // Admin can always force edit and unlock
    if (isAdmin) {
      permissions.canForceEdit = true;
      permissions.canUnlock = true;
      permissions.canEdit = true; // Admin override
      permissions.canDelete = true;
    } else {
      permissions.reason = `Task locked on ${new Date(task.lockedAt || '').toLocaleDateString()}. Only follow-ups can be added.`;
    }
  }

  return permissions;
};
