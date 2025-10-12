/**
 * Enhanced Dashboard Component
 * Modular, personalization-enabled dashboard with vibrant tiles
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { CustomizeDashboard } from './CustomizeDashboard';
import { DashboardTile } from './DashboardTile';
import { filterTilesByRBAC, getDefaultTiles } from '@/utils/rbacHelper';
import { PageHelp } from '@/components/help/PageHelp';
import { InlineHelp } from '@/components/help/InlineHelp';

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
        const defaults = getDefaultTiles();
        setSelectedTiles(defaults);
      }
    } else {
      // Default to enabled tiles
      const defaults = getDefaultTiles();
      setSelectedTiles(defaults);
    }
  }, []);

  // Filter tiles by RBAC
  const accessibleTiles = useMemo(() => {
    return filterTilesByRBAC(selectedTiles, hasPermission);
  }, [selectedTiles, hasPermission]);

  // Sort tiles by order
  const sortedTiles = useMemo(() => {
    return [...accessibleTiles].sort((a, b) => a.order - b.order);
  }, [accessibleTiles]);

  const handleSaveLayout = (newSelection: string[]) => {
    setSelectedTiles(newSelection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
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

      {/* Tiles Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {sortedTiles.map((tile, index) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <DashboardTile tile={tile} />
          </motion.div>
        ))}
      </motion.div>

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
