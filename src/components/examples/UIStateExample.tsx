/**
 * Example component demonstrating UI State migration
 * Shows how to use useUIState hook instead of localStorage
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUIState } from '@/hooks/useUIState';

export const UIStateExample: React.FC = () => {
  // Before (localStorage):
  // const [darkMode, setDarkMode] = useState(() => {
  //   const saved = localStorage.getItem('theme_preference');
  //   return saved ? JSON.parse(saved) : false;
  // });
  // useEffect(() => {
  //   localStorage.setItem('theme_preference', JSON.stringify(darkMode));
  // }, [darkMode]);

  // After (Supabase UI State):
  const [darkMode, setDarkMode, isLoading] = useUIState<boolean>(
    'ui.theme.dark_mode',
    false,
    {
      category: 'preferences',
      description: 'Dark mode preference'
    }
  );

  // More examples:
  const [sidebarCollapsed, setSidebarCollapsed] = useUIState<boolean>(
    'ui.layout.sidebar_collapsed',
    false,
    { category: 'layout' }
  );

  const [tablePageSize, setTablePageSize] = useUIState<number>(
    'ui.table.page_size',
    25,
    { category: 'preferences' }
  );

  const [caseFilters, setCaseFilters] = useUIState<{
    status?: string;
    priority?: string;
  }>(
    'ui.cases.filters',
    {},
    { category: 'filters' }
  );

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI State Management Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode">Dark Mode</Label>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sidebar">Sidebar Collapsed</Label>
          <Switch
            id="sidebar"
            checked={sidebarCollapsed}
            onCheckedChange={setSidebarCollapsed}
          />
        </div>

        <div className="space-y-2">
          <Label>Table Page Size</Label>
          <div className="flex gap-2">
            {[10, 25, 50, 100].map(size => (
              <Button
                key={size}
                variant={tablePageSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTablePageSize(size)}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Case Filters (Example)</Label>
          <div className="flex gap-2">
            <Button
              variant={caseFilters.status === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCaseFilters({ ...caseFilters, status: 'active' })}
            >
              Active
            </Button>
            <Button
              variant={caseFilters.priority === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCaseFilters({ ...caseFilters, priority: 'high' })}
            >
              High Priority
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCaseFilters({})}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>
            All preferences are automatically saved to Supabase and will sync across your devices.
            No need to manually save or worry about browser cache clearing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
