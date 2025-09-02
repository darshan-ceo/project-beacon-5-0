/**
 * GST Cache Service for Beacon Essential 5.0
 * Handles caching of GST public lookups and re-verification tracking
 */

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
  get(gstin: string): GSTCacheEntry | null {
    try {
      const cache = this.getCache();
      const entry = cache[gstin];
      
      if (!entry) return null;
      
      // Check if cache is still valid
      const now = Date.now();
      if (now - entry.timestamp > GSTCacheService.CACHE_DURATION) {
        this.remove(gstin);
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
  set(gstin: string, data: any, source: 'public' | 'gsp' | 'manual' = 'public'): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      
      cache[gstin] = {
        gstin,
        data,
        timestamp: now,
        lastVerified: now,
        source
      };
      
      localStorage.setItem(GSTCacheService.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('GST Cache write error:', error);
    }
  }

  /**
   * Remove cached data for a GSTIN
   */
  remove(gstin: string): void {
    try {
      const cache = this.getCache();
      delete cache[gstin];
      localStorage.setItem(GSTCacheService.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('GST Cache remove error:', error);
    }
  }

  /**
   * Check if GSTIN needs re-verification (>90 days old)
   */
  needsReVerification(gstin: string): boolean {
    const entry = this.get(gstin);
    if (!entry) return false;
    
    const now = Date.now();
    return (now - entry.lastVerified) > GSTCacheService.REVERIFY_THRESHOLD;
  }

  /**
   * Update last verified timestamp
   */
  updateVerificationTimestamp(gstin: string): void {
    try {
      const cache = this.getCache();
      if (cache[gstin]) {
        cache[gstin].lastVerified = Date.now();
        localStorage.setItem(GSTCacheService.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.warn('GST Cache verification update error:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    try {
      localStorage.removeItem(GSTCacheService.CACHE_KEY);
    } catch (error) {
      console.warn('GST Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; oldEntries: number; needsReVerification: number } {
    try {
      const cache = this.getCache();
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
   * Get the cache object from localStorage
   */
  private getCache(): Record<string, GSTCacheEntry> {
    try {
      const cached = localStorage.getItem(GSTCacheService.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('GST Cache parse error:', error);
      return {};
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    try {
      const cache = this.getCache();
      const now = Date.now();
      let hasChanges = false;
      
      Object.keys(cache).forEach(gstin => {
        if (now - cache[gstin].timestamp > GSTCacheService.CACHE_DURATION) {
          delete cache[gstin];
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem(GSTCacheService.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.warn('GST Cache cleanup error:', error);
    }
  }
}

export const gstCacheService = new GSTCacheService();