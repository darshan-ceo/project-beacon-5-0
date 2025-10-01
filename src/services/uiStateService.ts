/**
 * UI State Service
 * Manages component-specific UI preferences using HofficeDB
 */

import { setItem, getItem } from '@/data/storageShim';

interface UIState {
  [componentKey: string]: any;
}

class UIStateService {
  /**
   * Save UI state for a specific component
   */
  async saveState(componentKey: string, state: any): Promise<void> {
    await setItem(`ui-state-${componentKey}`, state);
  }

  /**
   * Get UI state for a specific component
   */
  async getState<T = any>(componentKey: string, defaultValue?: T): Promise<T | null> {
    const state = await getItem<T>(`ui-state-${componentKey}`);
    return state !== null ? state : (defaultValue ?? null);
  }

  /**
   * Clear UI state for a specific component
   */
  async clearState(componentKey: string): Promise<void> {
    await setItem(`ui-state-${componentKey}`, null);
  }

  // Specific helpers for common UI patterns
  async saveViewMode(component: string, mode: string): Promise<void> {
    await this.saveState(`${component}-view-mode`, mode);
  }

  async getViewMode(component: string, defaultMode: string = 'list'): Promise<string> {
    const mode = await this.getState<string>(`${component}-view-mode`);
    return mode || defaultMode;
  }

  async saveExpandedState(component: string, expanded: boolean): Promise<void> {
    await this.saveState(`${component}-expanded`, expanded);
  }

  async getExpandedState(component: string, defaultExpanded: boolean = true): Promise<boolean> {
    const state = await this.getState<boolean>(`${component}-expanded`);
    return state !== null ? state : defaultExpanded;
  }

  async saveSavedViews(component: string, views: any[]): Promise<void> {
    await this.saveState(`${component}-saved-views`, views);
  }

  async getSavedViews(component: string): Promise<any[]> {
    const views = await this.getState<any[]>(`${component}-saved-views`);
    return views || [];
  }
}

export const uiStateService = new UIStateService();
