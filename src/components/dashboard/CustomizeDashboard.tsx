/**
 * Customize Dashboard Modal
 * Allows users to select which tiles appear on their dashboard
 */

import React, { useState, useEffect } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LayoutGrid } from 'lucide-react';
import { getAccessibleTiles } from '@/utils/rbacHelper';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

interface CustomizeDashboardProps {
  open: boolean;
  onClose: () => void;
  onSave: (selectedTiles: string[]) => void;
  currentSelection: string[];
}

export const CustomizeDashboard: React.FC<CustomizeDashboardProps> = ({
  open,
  onClose,
  onSave,
  currentSelection,
}) => {
  const { hasPermission } = useRBAC();
  const [selected, setSelected] = useState<string[]>(currentSelection);

  // Get only tiles user has permission to see
  const accessibleTiles = getAccessibleTiles(hasPermission);

  // Group tiles by module
  const tilesByModule = accessibleTiles.reduce((acc, tile) => {
    if (!acc[tile.module]) acc[tile.module] = [];
    acc[tile.module].push(tile);
    return acc;
  }, {} as Record<string, typeof accessibleTiles>);

  useEffect(() => {
    setSelected(currentSelection);
  }, [currentSelection]);

  const handleToggle = (tileId: string) => {
    setSelected((prev) =>
      prev.includes(tileId) ? prev.filter((id) => id !== tileId) : [...prev, tileId]
    );
  };

  const handleReset = () => {
    const defaults = accessibleTiles.filter((t) => t.defaultEnabled).map((t) => t.id);
    setSelected(defaults);
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleModuleToggle = (module: string, selectAll: boolean) => {
    const moduleIds = tilesByModule[module].map((t) => t.id);
    setSelected((prev) => {
      const set = new Set(prev);
      if (selectAll) {
        moduleIds.forEach((id) => set.add(id));
      } else {
        moduleIds.forEach((id) => set.delete(id));
      }
      return Array.from(set);
    });
  };

  const getModuleSelectionState = (module: string) => {
    const ids = tilesByModule[module].map((t) => t.id);
    const total = ids.length;
    const selectedCount = ids.filter((id) => selected.includes(id)).length;
    return {
      totalInModule: total,
      selectedInModule: selectedCount,
      allSelected: selectedCount === total && total > 0,
      noneSelected: selectedCount === 0,
      indeterminate: selectedCount > 0 && selectedCount < total,
    };
  };

  const modules = Object.keys(tilesByModule);

  return (
    <ModalLayout
      open={open}
      onOpenChange={onClose}
      title="Customize Your Dashboard"
      description={`Select which tiles you want to see on your dashboard (${selected.length} selected)`}
      icon={<Settings className="h-5 w-5" />}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex flex-col sm:flex-row w-full justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Reset to Default
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="flex-1 sm:flex-none"
            >
              Save Layout
            </Button>
          </div>
        </div>
      }
    >
      <Tabs defaultValue={modules[0]} className="flex-1 flex flex-col">
        {/* Responsive TabsList - No wrapping, better spacing */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6 border-b bg-background z-10 p-1 min-h-[48px]">
          {modules.map((module) => (
            <TabsTrigger 
              key={module} 
              value={module} 
              title={module}
              className="text-xs sm:text-sm px-2 py-1.5 whitespace-nowrap truncate"
            >
              {module}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tabs Content - Scrolls naturally in DialogBody */}
        {modules.map((module) => {
          const moduleState = getModuleSelectionState(module);
          
          return (
            <TabsContent 
              key={module} 
              value={module} 
              className="space-y-3 mt-0 min-h-[360px]"
            >
              {tilesByModule[module].length > 0 ? (
                <>
                  {/* Module-level Select All */}
                  <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Checkbox
                        id={`select-all-${module}`}
                        checked={
                          moduleState.allSelected
                            ? true
                            : moduleState.indeterminate
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={() =>
                          handleModuleToggle(module, !moduleState.allSelected)
                        }
                      />
                      <label
                        htmlFor={`select-all-${module}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Select all in {module}
                      </label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {moduleState.selectedInModule}/{moduleState.totalInModule} selected
                    </span>
                  </div>

                  {/* Individual Tiles */}
                  {tilesByModule[module].map((tile) => (
                <div
                  key={tile.id}
                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={tile.id}
                    checked={selected.includes(tile.id)}
                    onCheckedChange={() => handleToggle(tile.id)}
                    className="mt-1"
                  />
                  <label htmlFor={tile.id} className="flex-1 cursor-pointer">
                    <p className="font-medium text-sm">{tile.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tile.description}
                    </p>
                  </label>
                </div>
              ))}
                </>
              ) : (
              <div className="text-center py-12">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No tiles available in this module
                </p>
              </div>
            )}
            </TabsContent>
          );
        })}
      </Tabs>
    </ModalLayout>
  );
};
