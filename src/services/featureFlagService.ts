/**
 * Feature Flag Service for Beacon Essential 5.0
 * Manages runtime feature toggles for controlled rollouts
 */

export interface FeatureFlag {
  key: string;
  isEnabled: boolean;
  version?: string;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags() {
    // GST Client Auto-fill Feature
    const gstFeature = import.meta.env.VITE_FEATURE_GST_CLIENT_AUTOFILL || 'off';
    this.flags.set('gst_client_autofill_v1', {
      key: 'gst_client_autofill_v1',
      isEnabled: gstFeature === 'on',
      version: gstFeature === 'on' ? 'v1' : undefined
    });

    // Cyclic Lifecycle Features (UAT enabled)
    this.flags.set('lifecycle_cycles_v1', {
      key: 'lifecycle_cycles_v1',
      isEnabled: true, // ON in UAT
      version: 'v1'
    });

    this.flags.set('stage_checklist_v1', {
      key: 'stage_checklist_v1', 
      isEnabled: true, // ON in UAT
      version: 'v1'
    });

    this.flags.set('stage_task_automation_v1', {
      key: 'stage_task_automation_v1',
      isEnabled: true, // ON in UAT
      version: 'v1'
    });
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    return flag?.isEnabled ?? false;
  }

  /**
   * Get feature flag details
   */
  getFlag(flagKey: string): FeatureFlag | null {
    return this.flags.get(flagKey) ?? null;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Runtime feature flag override (for testing)
   */
  override(flagKey: string, enabled: boolean) {
    const existing = this.flags.get(flagKey);
    if (existing) {
      this.flags.set(flagKey, { ...existing, isEnabled: enabled });
    }
  }
}

export const featureFlagService = new FeatureFlagService();