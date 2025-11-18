import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale, Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Download, Upload, RotateCcw, AlertCircle, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authorityHierarchyService } from '@/services/authorityHierarchyService';
import { AuthorityLevelConfig, MatterTypeConfig } from '@/types/authority-matter-hierarchy';
import { AuthorityLevelForm } from './AuthorityLevelForm';
import { MatterTypeForm } from './MatterTypeForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AuthorityHierarchySettings: React.FC = () => {
  const [levels, setLevels] = useState<AuthorityLevelConfig[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [levelFormOpen, setLevelFormOpen] = useState(false);
  const [matterTypeFormOpen, setMatterTypeFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AuthorityLevelConfig | null>(null);
  const [editingMatterType, setEditingMatterType] = useState<{ levelId: string; matterType: MatterTypeConfig | null }| null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'level' | 'matterType'; id: string; levelId?: string } | null>(null);

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = () => {
    const allLevels = authorityHierarchyService.getAllAuthorityLevels();
    setLevels(allLevels);
    // Auto-expand levels with matter types
    const expanded = new Set<string>();
    allLevels.forEach(level => {
      if (level.allowsMatterTypes && level.matterTypes.length > 0) {
        expanded.add(level.id);
      }
    });
    setExpandedLevels(expanded);
  };

  const toggleExpanded = (levelId: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(levelId)) {
        next.delete(levelId);
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  const handleAddLevel = () => {
    setEditingLevel(null);
    setLevelFormOpen(true);
  };

  const handleEditLevel = (level: AuthorityLevelConfig) => {
    setEditingLevel(level);
    setLevelFormOpen(true);
  };

  const handleDeleteLevel = (levelId: string) => {
    setDeleteConfirm({ type: 'level', id: levelId });
  };

  const handleAddMatterType = (levelId: string) => {
    setEditingMatterType({ levelId, matterType: null });
    setMatterTypeFormOpen(true);
  };

  const handleEditMatterType = (levelId: string, matterType: MatterTypeConfig) => {
    setEditingMatterType({ levelId, matterType });
    setMatterTypeFormOpen(true);
  };

  const handleDeleteMatterType = (levelId: string, matterTypeId: string) => {
    setDeleteConfirm({ type: 'matterType', id: matterTypeId, levelId });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'level') {
        authorityHierarchyService.deleteAuthorityLevel(deleteConfirm.id);
        toast({
          title: "Authority Level Deleted",
          description: "The authority level has been removed successfully.",
        });
      } else if (deleteConfirm.type === 'matterType' && deleteConfirm.levelId) {
        authorityHierarchyService.deleteMatterType(deleteConfirm.levelId, deleteConfirm.id);
        toast({
          title: "Matter Type Deleted",
          description: "The matter type has been removed successfully.",
        });
      }
      loadHierarchy();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive"
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = (level: AuthorityLevelConfig) => {
    authorityHierarchyService.updateAuthorityLevel(level.id, { isActive: !level.isActive });
    toast({
      title: level.isActive ? "Authority Level Deactivated" : "Authority Level Activated",
      description: `${level.name} is now ${level.isActive ? 'inactive' : 'active'}.`,
    });
    loadHierarchy();
  };

  const handleToggleMatterTypeActive = (levelId: string, matterType: MatterTypeConfig) => {
    authorityHierarchyService.updateMatterType(levelId, matterType.id, { isActive: !matterType.isActive });
    toast({
      title: matterType.isActive ? "Matter Type Deactivated" : "Matter Type Activated",
      description: `${matterType.name} is now ${matterType.isActive ? 'inactive' : 'active'}.`,
    });
    loadHierarchy();
  };

  const handleExport = () => {
    const json = authorityHierarchyService.exportHierarchy();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `authority-hierarchy-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Configuration Exported",
      description: "Authority hierarchy has been exported successfully.",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            authorityHierarchyService.importHierarchy(json);
            loadHierarchy();
            toast({
              title: "Configuration Imported",
              description: "Authority hierarchy has been imported successfully.",
            });
          } catch (error) {
            toast({
              title: "Import Failed",
              description: "Invalid configuration file format.",
              variant: "destructive"
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default configuration? This cannot be undone.")) {
      authorityHierarchyService.resetToDefault();
      loadHierarchy();
      toast({
        title: "Configuration Reset",
        description: "Authority hierarchy has been reset to defaults.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Authority Level & Matter Type Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage authority levels and their sub-categories (matter types) to customize your legal hierarchy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleAddLevel}>
            <Plus className="h-4 w-4 mr-2" />
            Add Authority Level
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes made here will immediately reflect in Legal Authorities and Case Management forms. 
          Deactivating a level or matter type will hide it from dropdown selections but preserve existing data.
        </AlertDescription>
      </Alert>

      {/* Authority Levels List */}
      <div className="space-y-3">
        {levels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scale className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">No authority levels configured</p>
              <Button onClick={handleAddLevel} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Authority Level
              </Button>
            </CardContent>
          </Card>
        ) : (
          levels.map((level, index) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!level.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <Badge variant="outline" className="font-mono text-xs">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{level.name}</CardTitle>
                          {!level.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                          {level.allowsMatterTypes && (
                            <Badge variant="outline" className="text-xs">
                              Has Sub-Levels
                            </Badge>
                          )}
                        </div>
                        {level.description && (
                          <CardDescription className="mt-1">{level.description}</CardDescription>
                        )}
                      </div>
                      <div 
                        className={`w-12 h-12 rounded-lg ${level.color || 'bg-gray-100'} flex items-center justify-center`}
                        title={level.name}
                      >
                        <Scale className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${level.id}`} className="text-sm text-muted-foreground">
                          Active
                        </Label>
                        <Switch
                          id={`active-${level.id}`}
                          checked={level.isActive}
                          onCheckedChange={() => handleToggleActive(level)}
                        />
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLevel(level)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLevel(level.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {level.allowsMatterTypes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(level.id)}
                        >
                          {expandedLevels.has(level.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Matter Types Section */}
                {level.allowsMatterTypes && expandedLevels.has(level.id) && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Matter Types (Sub-Levels)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddMatterType(level.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Matter Type
                        </Button>
                      </div>

                      {level.matterTypes.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          No matter types defined. Click "Add Matter Type" to create one.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {level.matterTypes.map((matterType) => (
                            <div
                              key={matterType.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                !matterType.isActive ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{matterType.name}</span>
                                    {!matterType.isActive && (
                                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                    )}
                                    {matterType.requiresLocation && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                                        <MapPin className="h-3 w-3" />
                                        Location Required
                                      </Badge>
                                    )}
                                  </div>
                                  {matterType.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {matterType.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={matterType.isActive}
                                  onCheckedChange={() => handleToggleMatterTypeActive(level.id, matterType)}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMatterType(level.id, matterType)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMatterType(level.id, matterType.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Authority Level Form Modal */}
      <AuthorityLevelForm
        open={levelFormOpen}
        onOpenChange={setLevelFormOpen}
        level={editingLevel}
        onSave={() => {
          loadHierarchy();
          setLevelFormOpen(false);
        }}
      />

      {/* Matter Type Form Modal */}
      {editingMatterType && (
        <MatterTypeForm
          open={matterTypeFormOpen}
          onOpenChange={setMatterTypeFormOpen}
          levelId={editingMatterType.levelId}
          matterType={editingMatterType.matterType}
          onSave={() => {
            loadHierarchy();
            setMatterTypeFormOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteConfirm?.type === 'level' ? 'authority level' : 'matter type'}. 
              This action cannot be undone. Existing cases and legal authorities using this will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
