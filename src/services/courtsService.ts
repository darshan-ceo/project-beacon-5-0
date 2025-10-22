// BACKWARD COMPATIBILITY SERVICE
// @deprecated Use forumsService instead
// This service delegates to forumsService for backward compatibility during migration

import { forumsService, CreateForumData, UpdateForumData } from './forumsService';
import { Forum } from '@/contexts/AppStateContext';

console.warn('[DEPRECATED] courtsService is deprecated. Please migrate to forumsService.');

// Type aliases for backward compatibility
export type CreateCourtData = CreateForumData;
export type UpdateCourtData = UpdateForumData;
export type Court = Forum;

class CourtsService {
  async create(data: CreateCourtData): Promise<Court> {
    console.warn('[DEPRECATED] courtsService.create() - Use forumsService.create() instead');
    return forumsService.create(data);
  }

  async update(data: UpdateCourtData): Promise<Court> {
    console.warn('[DEPRECATED] courtsService.update() - Use forumsService.update() instead');
    return forumsService.update(data);
  }

  async get(id: string): Promise<Court | null> {
    console.warn('[DEPRECATED] courtsService.get() - Use forumsService.get() instead');
    return forumsService.get(id);
  }

  async delete(id: string): Promise<void> {
    console.warn('[DEPRECATED] courtsService.delete() - Use forumsService.delete() instead');
    return forumsService.delete(id);
  }

  async list(): Promise<Court[]> {
    console.warn('[DEPRECATED] courtsService.list() - Use forumsService.list() instead');
    return forumsService.list();
  }
}

export const courtsService = new CourtsService();
