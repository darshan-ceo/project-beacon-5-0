/**
 * UI Help Service - Centralized management for three-layer help system
 * Loads and provides access to button, field, and menu item help text
 */

interface UIHelpEntry {
  id: string;
  module: string;
  type: 'button' | 'field' | 'menu-item' | 'feature' | 'card';
  label: string;
  explanation?: string;
  tooltip: {
    title: string;
    content: string;
    learnMoreUrl?: string;
  };
  accessibility: {
    ariaLabel: string;
    keyboardShortcut?: string;
  };
}

class UIHelpService {
  private helpData: Map<string, UIHelpEntry> = new Map();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Load help data from JSON file
   * Safe to call multiple times - only loads once
   */
  async loadHelpData(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadData();
    return this.loadPromise;
  }

  private async _loadData(): Promise<void> {
    try {
      const response = await fetch('/help/ui-tooltips.json');
      if (!response.ok) {
        throw new Error(`Failed to load UI tooltips: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Flatten modules into searchable map
      Object.entries(data.modules).forEach(([moduleName, moduleData]: [string, any]) => {
        ['buttons', 'fields', 'menu-items', 'cards', 'features'].forEach(type => {
          if (moduleData[type]) {
            moduleData[type].forEach((entry: any) => {
              this.helpData.set(entry.id, { 
                ...entry, 
                module: moduleName,
                type: type.replace('-items', '-item') as UIHelpEntry['type']
              });
            });
          }
        });
      });
      
      this.isLoaded = true;
      console.log(`✅ UI Help Service: Loaded ${this.helpData.size} help entries`);
    } catch (error) {
      console.error('❌ UI Help Service: Failed to load help data:', error);
      // Fallback to empty map - components will gracefully degrade
      this.isLoaded = true; // Mark as loaded to prevent retry loops
    }
  }

  /**
   * Get help entry by ID
   * Returns null if not found (graceful degradation)
   */
  getHelp(id: string): UIHelpEntry | null {
    if (!this.isLoaded) {
      console.warn(`UI Help Service: Data not loaded yet. Call loadHelpData() first.`);
      return null;
    }
    return this.helpData.get(id) || null;
  }

  /**
   * Search help entries by query string
   * Optionally filter by module
   */
  search(query: string, module?: string): UIHelpEntry[] {
    if (!this.isLoaded) {
      return [];
    }

    const results: UIHelpEntry[] = [];
    const lowerQuery = query.toLowerCase();

    this.helpData.forEach(entry => {
      if (module && entry.module !== module) return;
      
      const searchText = `${entry.label} ${entry.explanation} ${entry.tooltip.content}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        results.push(entry);
      }
    });

    return results;
  }

  /**
   * Get all help entries for a specific module
   */
  getModuleHelp(module: string): UIHelpEntry[] {
    if (!this.isLoaded) {
      return [];
    }

    const results: UIHelpEntry[] = [];
    this.helpData.forEach(entry => {
      if (entry.module === module) {
        results.push(entry);
      }
    });

    return results;
  }

  /**
   * Check if help data is loaded
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get total count of help entries
   */
  getCount(): number {
    return this.helpData.size;
  }
}

export const uiHelpService = new UIHelpService();
