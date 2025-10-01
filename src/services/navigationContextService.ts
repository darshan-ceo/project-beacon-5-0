/**
 * Navigation Context Service
 * Manages navigation state across modules using HofficeDB
 */

import { setItem, getItem, removeItem } from '@/data/storageShim';

export interface NavigationContext {
  returnTo?: string;
  caseId?: string;
  taskId?: string;
  documentId?: string;
  stage?: string;
  [key: string]: any;
}

const CONTEXT_KEY = 'navigation-context';

class NavigationContextService {
  /**
   * Save navigation context for return navigation
   */
  async saveContext(context: NavigationContext): Promise<void> {
    await setItem(CONTEXT_KEY, context);
  }

  /**
   * Get current navigation context
   */
  async getContext(): Promise<NavigationContext | null> {
    return await getItem<NavigationContext>(CONTEXT_KEY);
  }

  /**
   * Clear navigation context after use
   */
  async clearContext(): Promise<void> {
    await removeItem(CONTEXT_KEY);
  }

  /**
   * Check if navigation context exists
   */
  async hasContext(): Promise<boolean> {
    const context = await this.getContext();
    return context !== null;
  }
}

export const navigationContextService = new NavigationContextService();
