import { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';

export interface ClickAction {
  navigateTo: string;
  tooltip?: string;
  requiresPermission?: string;
}

export const handleTileNavigation = (
  action: ClickAction,
  hasPermission: (module: string, action: string) => boolean,
  navigate: NavigateFunction
) => {
  // Check RBAC if required
  if (action.requiresPermission) {
    const [module, permission] = action.requiresPermission.split('_');
    if (!hasPermission(module, permission || 'read')) {
      toast.error('Access Denied', {
        description: 'You do not have permission to access this section.',
      });
      return;
    }
  }

  // Navigate
  navigate(action.navigateTo);
};

export const getLastUpdatedTimestamp = (): string => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
