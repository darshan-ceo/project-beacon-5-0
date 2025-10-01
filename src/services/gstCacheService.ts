/**
 * GST Cache Service for Beacon Essential 5.0
 * Handles caching of GST public lookups and re-verification tracking
 */

import { setItem, getItem, removeItem } from '@/data/storageShim';

export interface GSTCacheEntry {
  gstin: string;
  data: any;
  timestamp: number;
  lastVerified: number;
  source: 'public' | 'gsp' | 'manual';
}

class GSTCacheService {
  private static readonly CACHE_KEY = 'gst_cache_v1';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REVERIFY_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 days

  /**
   * Get cached GST data for a GSTIN
   */
  async get(gstin: string): Promise<GSTCacheEntry | null> {
    try {
      const cache = await this.getCache();
      const entry = cache[gstin];
      
      if (!entry) return null;
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - entry.timestamp > GSTCacheService.CACHE_DURATION) {
        await this.remove(gstin);
        return null;
      }
      
      return entry;
    } catch (error) {
      console.warn('GST Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached GST data for a GSTIN
   */
  async set(gstin: string, data: any, source: 'public' | 'gsp' | 'manual' = 'public'): Promise<void> {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      
      cache[gstin] = {
        gstin,
        data,
        timestamp: now,
        lastVerified: now,
        source
      };
      
      await setItem(GSTCacheService.CACHE_KEY, cache);
    } catch (error) {
      console.warn('GST Cache write error:', error);
    }
  }

  /**
   * Remove cached data for a GSTIN
   */
  async remove(gstin: string): Promise<void> {
    try {
      const cache = await this.getCache();
      delete cache[gstin];
      await setItem(GSTCacheService.CACHE_KEY, cache);
    } catch (error) {
      console.warn('GST Cache remove error:', error);
    }
  }

  /**
   * Check if GSTIN needs re-verification (>90 days old)
   */
  async needsReVerification(gstin: string): Promise<boolean> {
    const entry = await this.get(gstin);
    if (!entry) return false;
    
    const now = Date.now();
    return (now - entry.lastVerified) > GSTCacheService.REVERIFY_THRESHOLD;
  }

  /**
   * Update last verified timestamp
   */
  async updateVerificationTimestamp(gstin: string): Promise<void> {
    try {
      const cache = await this.getCache();
      if (cache[gstin]) {
        cache[gstin].lastVerified = Date.now();
        await setItem(GSTCacheService.CACHE_KEY, cache);
      }
    } catch (error) {
      console.warn('GST Cache verification update error:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      await removeItem(GSTCacheService.CACHE_KEY);
    } catch (error) {
      console.warn('GST Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalEntries: number; oldEntries: number; needsReVerification: number }> {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      let oldEntries = 0;
      let needsReVerification = 0;
      
      Object.values(cache).forEach(entry => {
        if (now - entry.timestamp > GSTCacheService.CACHE_DURATION) {
          oldEntries++;
        }
        if (now - entry.lastVerified > GSTCacheService.REVERIFY_THRESHOLD) {
          needsReVerification++;
        }
      });
      
      return {
        totalEntries: Object.keys(cache).length,
        oldEntries,
        needsReVerification
      };
    } catch (error) {
      console.warn('GST Cache stats error:', error);
      return { totalEntries: 0, oldEntries: 0, needsReVerification: 0 };
    }
  }

  /**
   * Get the cache object from storageShim
   */
  private async getCache(): Promise<Record<string, GSTCacheEntry>> {
    try {
      const cached = await getItem<Record<string, GSTCacheEntry>>(GSTCacheService.CACHE_KEY);
      return cached || {};
    } catch (error) {
      console.warn('GST Cache parse error:', error);
      return {};
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      let hasChanges = false;
      
      Object.keys(cache).forEach(gstin => {
        if (now - cache[gstin].timestamp > GSTCacheService.CACHE_DURATION) {
          delete cache[gstin];
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await setItem(GSTCacheService.CACHE_KEY, cache);
      }
    } catch (error) {
      console.warn('GST Cache cleanup error:', error);
    }
  }
}

export const gstCacheService = new GSTCacheService();