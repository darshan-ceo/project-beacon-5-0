import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uiHelpService } from '@/services/uiHelpService';

describe('UIHelpService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    uiHelpService['isLoaded'] = false;
    uiHelpService['helpData'].clear();
    vi.clearAllMocks();
  });

  describe('loadHelpData', () => {
    it('should load help data from JSON file', async () => {
      const mockData = {
        version: '1.0',
        modules: {
          cases: {
            buttons: [
              {
                id: 'button-create-case',
                label: 'Create Case',
                explanation: 'Start a new litigation case',
                tooltip: {
                  title: 'Create New Case',
                  content: 'Open wizard to register new case',
                  learnMoreUrl: '/help/cases'
                },
                accessibility: {
                  ariaLabel: 'Create a new case'
                }
              }
            ]
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      await uiHelpService.loadHelpData();

      expect(uiHelpService.isReady()).toBe(true);
      expect(uiHelpService.getCount()).toBe(1);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await uiHelpService.loadHelpData();

      expect(uiHelpService.isReady()).toBe(true);
      expect(uiHelpService.getCount()).toBe(0);
    });

    it('should not reload if already loaded', async () => {
      const mockData = {
        version: '1.0',
        modules: {
          cases: {
            buttons: [
              {
                id: 'button-test',
                label: 'Test',
                tooltip: {
                  title: 'Test',
                  content: 'Test content'
                },
                accessibility: {
                  ariaLabel: 'Test button'
                }
              }
            ]
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData
      } as Response);

      await uiHelpService.loadHelpData();
      await uiHelpService.loadHelpData();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHelp', () => {
    beforeEach(async () => {
      const mockData = {
        version: '1.0',
        modules: {
          cases: {
            buttons: [
              {
                id: 'button-create-case',
                label: 'Create Case',
                explanation: 'Start a new case',
                tooltip: {
                  title: 'Create New Case',
                  content: 'Detailed help content',
                  learnMoreUrl: '/help/cases'
                },
                accessibility: {
                  ariaLabel: 'Create a new case',
                  keyboardShortcut: 'Ctrl+N'
                }
              }
            ]
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      await uiHelpService.loadHelpData();
    });

    it('should return help entry for valid ID', () => {
      const help = uiHelpService.getHelp('button-create-case');

      expect(help).not.toBeNull();
      expect(help?.label).toBe('Create Case');
      expect(help?.explanation).toBe('Start a new case');
      expect(help?.tooltip.title).toBe('Create New Case');
      expect(help?.accessibility.keyboardShortcut).toBe('Ctrl+N');
    });

    it('should return null for invalid ID', () => {
      const help = uiHelpService.getHelp('non-existent-id');

      expect(help).toBeNull();
    });

    it('should include module information', () => {
      const help = uiHelpService.getHelp('button-create-case');

      expect(help?.module).toBe('cases');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const mockData = {
        version: '1.0',
        modules: {
          cases: {
            buttons: [
              {
                id: 'button-create-case',
                label: 'Create Case',
                explanation: 'Start a new litigation case',
                tooltip: {
                  title: 'Create New Case',
                  content: 'Open wizard to register new GST case'
                },
                accessibility: {
                  ariaLabel: 'Create case'
                }
              },
              {
                id: 'button-advance-stage',
                label: 'Advance Stage',
                explanation: 'Move to next stage',
                tooltip: {
                  title: 'Advance Stage',
                  content: 'Progress case lifecycle'
                },
                accessibility: {
                  ariaLabel: 'Advance stage'
                }
              }
            ]
          },
          tasks: {
            buttons: [
              {
                id: 'button-create-task',
                label: 'Create Task',
                explanation: 'Add new task',
                tooltip: {
                  title: 'Create Task',
                  content: 'Create task with case context'
                },
                accessibility: {
                  ariaLabel: 'Create task'
                }
              }
            ]
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      await uiHelpService.loadHelpData();
    });

    it('should find entries by query string', () => {
      const results = uiHelpService.search('case');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'button-create-case')).toBe(true);
    });

    it('should filter by module', () => {
      const results = uiHelpService.search('create', 'cases');

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('button-create-case');
    });

    it('should search case-insensitively', () => {
      const results = uiHelpService.search('GST');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = uiHelpService.search('xyz123nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('getModuleHelp', () => {
    beforeEach(async () => {
      const mockData = {
        version: '1.0',
        modules: {
          cases: {
            buttons: [
              {
                id: 'button-1',
                label: 'Button 1',
                tooltip: {
                  title: 'Title',
                  content: 'Content'
                },
                accessibility: {
                  ariaLabel: 'Button 1'
                }
              },
              {
                id: 'button-2',
                label: 'Button 2',
                tooltip: {
                  title: 'Title',
                  content: 'Content'
                },
                accessibility: {
                  ariaLabel: 'Button 2'
                }
              }
            ]
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      } as Response);

      await uiHelpService.loadHelpData();
    });

    it('should return all entries for a module', () => {
      const results = uiHelpService.getModuleHelp('cases');

      expect(results.length).toBe(2);
      expect(results.every(r => r.module === 'cases')).toBe(true);
    });

    it('should return empty array for non-existent module', () => {
      const results = uiHelpService.getModuleHelp('non-existent');

      expect(results).toEqual([]);
    });
  });
});
