/**
 * Enhanced Dashboard Component
 * Modular, personalization-enabled dashboard with vibrant tiles
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { PageHelp } from '@/components/help/PageHelp';
import { InlineHelp } from '@/components/help/InlineHelp';
import { FollowUpsDueWidget } from './FollowUpsDueWidget';
import { DashboardWidget } from './DashboardWidget';
import { CustomizeDashboard } from './CustomizeDashboard';
import { filterTilesByRBAC, getDefaultTiles } from '@/utils/rbacHelper';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const STORAGE_KEY = 'dashboard_user_tiles';

export const EnhancedDashboard: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission } = useRBAC();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);

  // Load user preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelectedTiles(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved tiles:', error);
        setSelectedTiles(getDefaultTiles());
      }
    } else {
      setSelectedTiles(getDefaultTiles());
    }
  }, []);

  // Filter tiles by RBAC
  const accessibleTiles = useMemo(() => {
    return filterTilesByRBAC(selectedTiles, hasPermission);
  }, [selectedTiles, hasPermission]);

  // Maintain user's custom order or default order
  const sortedTiles = useMemo(() => {
    return [...accessibleTiles];
  }, [accessibleTiles]);

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveLayout = (newSelection: string[]) => {
    setSelectedTiles(newSelection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedTiles.findIndex((tile) => tile.id === active.id);
      const newIndex = sortedTiles.findIndex((tile) => tile.id === over.id);

      const reorderedTiles = arrayMove(sortedTiles, oldIndex, newIndex);
      const reorderedIds = reorderedTiles.map((tile) => tile.id);
      
      setSelectedTiles(reorderedIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reorderedIds));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Practice Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights and metrics for your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCustomizeOpen(true)} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Customize Dashboard
          </Button>
          <PageHelp pageId="dashboard" variant="floating" />
          <InlineHelp module="dashboard" />
        </div>
      </motion.div>

      {/* Follow-Ups Due Widget (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <FollowUpsDueWidget />
      </motion.div>

      {/* Customizable Dashboard Widgets with Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTiles.map((tile) => tile.id)}
          strategy={rectSortingStrategy}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {sortedTiles.map((tile, index) => (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={tile.id === 'casesByStage' || tile.id === 'caseAgingSummary' ? 'md:col-span-2' : ''}
              >
                <DashboardWidget tile={tile} />
              </motion.div>
            ))}
          </motion.div>
        </SortableContext>
      </DndContext>

      {/* Customization Modal */}
      <CustomizeDashboard
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        onSave={handleSaveLayout}
        currentSelection={selectedTiles}
      />
    </div>
  );
};
