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
      <Tabs defaultValue={modules[0]} className="flex-1 flex flex-col -mt-2">
        {/* Responsive TabsList */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 mb-4">
          {modules.map((module) => (
            <TabsTrigger 
              key={module} 
              value={module} 
              className="text-xs sm:text-sm px-2 py-1.5"
            >
              {module}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tabs Content - Scrolls naturally in DialogBody */}
        {modules.map((module) => (
          <TabsContent 
            key={module} 
            value={module} 
            className="space-y-3 mt-0"
          >
            {tilesByModule[module].length > 0 ? (
              tilesByModule[module].map((tile) => (
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
              ))
            ) : (
              <div className="text-center py-12">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No tiles available in this module
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </ModalLayout>
  );
};
