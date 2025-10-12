/**
 * RBAC Helper - Dashboard Tile Filtering
 * Filters dashboard tiles based on user permissions
 */

import dashboardTiles from '@/data/dashboardTiles.json';

export interface DashboardTile {
  id: string;
  module: string;
  title: string;
  type: string;
  icon: string;
  colorTheme: string;
  rbacTag: string[];
  mockDataSource: string;
  description: string;
  defaultEnabled: boolean;
  order: number;
}

/**
 * Filter tiles by user's RBAC permissions
 */
export const filterTilesByRBAC = (
  tileIds: string[],
  hasPermission: (module: string, action: string) => boolean
): DashboardTile[] => {
  return dashboardTiles.tiles.filter((tile) => {
    // Check if tile is in user's selected list
    if (!tileIds.includes(tile.id)) return false;

    // Check if user has at least one required permission
    return tile.rbacTag.some((module) => {
      return hasPermission(module, 'read');
    });
  }) as DashboardTile[];
};

/**
 * Get all accessible tiles for a user (regardless of selection)
 */
export const getAccessibleTiles = (
  hasPermission: (module: string, action: string) => boolean
): DashboardTile[] => {
  return dashboardTiles.tiles.filter((tile) => {
    return tile.rbacTag.some((module) => {
      return hasPermission(module, 'read');
    });
  }) as DashboardTile[];
};

/**
 * Get default enabled tiles
 */
export const getDefaultTiles = (): string[] => {
  return dashboardTiles.tiles
    .filter((tile) => tile.defaultEnabled)
    .map((tile) => tile.id);
};
