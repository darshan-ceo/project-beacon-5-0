/**
 * Customize Dashboard Modal
 * Allows users to select which tiles appear on their dashboard
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Customize Your Dashboard</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which tiles you want to see on your dashboard
          </p>
        </DialogHeader>

        <Tabs defaultValue={modules[0]} className="flex-1">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(modules.length, 4)}, 1fr)` }}>
            {modules.map((module) => (
              <TabsTrigger key={module} value={module} className="text-xs">
                {module}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {modules.map((module) => (
              <TabsContent key={module} value={module} className="space-y-3 mt-0">
                {tilesByModule[module].map((tile) => (
                  <div
                    key={tile.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={tile.id}
                      checked={selected.includes(tile.id)}
                      onCheckedChange={() => handleToggle(tile.id)}
                    />
                    <label htmlFor={tile.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{tile.title}</p>
                      <p className="text-sm text-muted-foreground">{tile.description}</p>
                    </label>
                  </div>
                ))}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Layout</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
