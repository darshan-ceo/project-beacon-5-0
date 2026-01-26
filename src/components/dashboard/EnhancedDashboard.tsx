/**
 * Enhanced Dashboard Component
 * Modular, personalization-enabled dashboard with consistent widget sizing
 * UI/UX aligned with Compliance Dashboard
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, RefreshCw, LayoutGrid } from 'lucide-react';
import { PageHelp } from '@/components/help/PageHelp';
import { InlineHelp } from '@/components/help/InlineHelp';
import { DashboardWidget } from './DashboardWidget';
import { DashboardStatsBar } from './DashboardStatsBar';
import { toast } from 'sonner';
import { CustomizeDashboard } from './CustomizeDashboard';
import { filterTilesByRBAC, getDefaultTiles, DashboardTile } from '@/utils/rbacHelper';
import { format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSwappingStrategy,
} from '@dnd-kit/sortable';

const STORAGE_KEY = 'dashboard_user_tiles';
const HIDDEN_TILES_KEY = 'dashboard_hidden_tiles';

// Categorize widgets by type for layout grouping
const categorizeWidgets = (tiles: DashboardTile[]) => {
  const kpiWidgets: DashboardTile[] = [];
  const chartWidgets: DashboardTile[] = [];
  const listWidgets: DashboardTile[] = [];

  tiles.forEach((tile) => {
    if (tile.type === 'metric' || tile.type === 'gauge' || tile.type === 'status') {
      kpiWidgets.push(tile);
    } else if (tile.type === 'barChart' || tile.type === 'pieChart' || tile.type === 'trafficLight') {
      chartWidgets.push(tile);
    } else {
      listWidgets.push(tile);
    }
  });

  return { kpiWidgets, chartWidgets, listWidgets };
};

export const EnhancedDashboard: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission } = useRBAC();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hiddenTiles, setHiddenTiles] = useState<string[]>([]);

  // Load hidden tiles from localStorage
  useEffect(() => {
    const savedHidden = localStorage.getItem(HIDDEN_TILES_KEY);
    if (savedHidden) {
      try {
        setHiddenTiles(JSON.parse(savedHidden));
      } catch (error) {
        console.error('Failed to parse hidden tiles:', error);
      }
    }
  }, []);

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

  // Maintain user's custom order and filter out hidden tiles
  const sortedTiles = useMemo(() => {
    return accessibleTiles.filter(tile => !hiddenTiles.includes(tile.id));
  }, [accessibleTiles, hiddenTiles]);

  // Categorize widgets for grouped layout
  const { kpiWidgets, chartWidgets, listWidgets } = useMemo(() => {
    return categorizeWidgets(sortedTiles);
  }, [sortedTiles]);

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app would trigger data refetch
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const handleHideWidget = (tileId: string) => {
    const newHidden = [...hiddenTiles, tileId];
    setHiddenTiles(newHidden);
    localStorage.setItem(HIDDEN_TILES_KEY, JSON.stringify(newHidden));
    
    toast.info('Widget hidden', {
      description: 'Restore it from Customize dashboard',
      action: {
        label: 'Undo',
        onClick: () => {
          const restored = hiddenTiles.filter(id => id !== tileId);
          setHiddenTiles(restored);
          localStorage.setItem(HIDDEN_TILES_KEY, JSON.stringify(restored));
        }
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedTiles.findIndex((tile) => tile.id === active.id);
      const newIndex = sortedTiles.findIndex((tile) => tile.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedTiles, oldIndex, newIndex);
        const newIds = reordered.map((tile) => tile.id);

        setSelectedTiles(newIds);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));

        console.debug('[Dashboard] Reordered tiles:', { from: oldIndex, to: newIndex });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        data-tour="dashboard-header"
      >
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Practice Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive insights and metrics for your workspace
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-tour="quick-actions">
          {/* Last Updated */}
          <span className="text-xs text-muted-foreground hidden md:inline">
            Last updated: {format(lastUpdated, 'HH:mm')}
          </span>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Hidden Count Badge */}
          {hiddenTiles.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {hiddenTiles.length} hidden
            </Badge>
          )}

          {/* Customize Button */}
          <Button onClick={() => setCustomizeOpen(true)} variant="outline" size="sm">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Customize
          </Button>

          <PageHelp pageId="dashboard" variant="floating" />
          <InlineHelp module="dashboard" />
        </div>
      </motion.div>

      {/* Stats Bar - KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        data-tour="kpi-cards"
      >
        <DashboardStatsBar />
      </motion.div>

      {/* Dashboard Widgets with Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTiles.map((tile) => tile.id)}
          strategy={rectSwappingStrategy}
        >
          {/* KPI Widgets Row - 4 columns, equal size */}
          {kpiWidgets.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              data-tour="upcoming-deadlines"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiWidgets.map((tile) => (
                  <div key={tile.id} className="h-[180px]">
                    <DashboardWidget tile={tile} onHide={handleHideWidget} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chart Widgets Row - 2 columns */}
          {chartWidgets.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartWidgets.map((tile) => (
                  <div key={tile.id} className="h-[320px]">
                    <DashboardWidget tile={tile} onHide={handleHideWidget} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* List Widgets Row - 3 columns */}
          {listWidgets.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              data-tour="recent-activity"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listWidgets.map((tile) => (
                  <div key={tile.id} className="h-[280px]">
                    <DashboardWidget tile={tile} onHide={handleHideWidget} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </SortableContext>

        <DragOverlay>
          {activeDragId ? (
            <div className="opacity-80 scale-105 shadow-2xl">
              <DashboardWidget
                tile={sortedTiles.find((t) => t.id === activeDragId)!}
                onHide={handleHideWidget}
              />
            </div>
          ) : null}
        </DragOverlay>
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
