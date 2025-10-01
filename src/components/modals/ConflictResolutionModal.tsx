/**
 * Conflict Resolution Modal
 * Visual interface for resolving data conflicts between local and cloud
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User,
  ChevronRight,
  Laptop,
  Cloud
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export interface ConflictData {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  localValue: any;
  cloudValue: any;
  localTimestamp: Date;
  cloudTimestamp: Date;
  localUser?: string;
  cloudUser?: string;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'cloud' | 'merge';
  mergedValue?: any;
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictData[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

export function ConflictResolutionModal({
  open,
  onOpenChange,
  conflicts,
  onResolve,
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [currentTab, setCurrentTab] = useState(0);

  const currentConflict = conflicts[currentTab];
  const totalConflicts = conflicts.length;

  const handleResolutionChange = (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => {
    setResolutions(prev => {
      const next = new Map(prev);
      next.set(conflictId, { conflictId, resolution });
      return next;
    });
  };

  const handleResolveAll = () => {
    // Auto-resolve remaining conflicts (use cloud by default)
    const allResolutions: ConflictResolution[] = conflicts.map(conflict => {
      const existing = resolutions.get(conflict.id);
      if (existing) return existing;
      
      // Default: use newer version
      const useCloud = new Date(conflict.cloudTimestamp).getTime() > 
                       new Date(conflict.localTimestamp).getTime();
      
      return {
        conflictId: conflict.id,
        resolution: useCloud ? 'cloud' : 'local',
      };
    });

    onResolve(allResolutions);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentTab < totalConflicts - 1) {
      setCurrentTab(currentTab + 1);
    } else {
      handleResolveAll();
    }
  };

  const handlePrevious = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (!currentConflict) return null;

  const currentResolution = resolutions.get(currentConflict.id);
  const resolvedCount = resolutions.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Resolve Data Conflicts
          </DialogTitle>
          <DialogDescription>
            Changes were made to the same data in multiple places. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Conflict {currentTab + 1} of {totalConflicts}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {resolvedCount} resolved
              </span>
              <Badge variant="outline">
                {totalConflicts - resolvedCount} remaining
              </Badge>
            </div>
          </div>

          {/* Conflict Details */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{currentConflict.entityType}</strong> · Field: <code className="text-xs bg-muted px-1 py-0.5 rounded">{currentConflict.field}</code>
            </AlertDescription>
          </Alert>

          {/* Resolution Options */}
          <RadioGroup
            value={currentResolution?.resolution}
            onValueChange={(value) => handleResolutionChange(currentConflict.id, value as any)}
          >
            <div className="grid gap-4">
              {/* Local Version */}
              <div
                className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                  currentResolution?.resolution === 'local' 
                    ? 'border-primary bg-accent' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleResolutionChange(currentConflict.id, 'local')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="local" id="local" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="local" className="text-base font-semibold cursor-pointer">
                        Keep Local Version
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        Your Device
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Modified {format(new Date(currentConflict.localTimestamp), 'PPp')}
                      </div>
                      {currentConflict.localUser && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {currentConflict.localUser}
                        </div>
                      )}
                    </div>

                    <ScrollArea className="h-24 w-full rounded border bg-muted/50 p-3">
                      <pre className="text-xs font-mono">
                        {renderValue(currentConflict.localValue)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Cloud Version */}
              <div
                className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                  currentResolution?.resolution === 'cloud' 
                    ? 'border-primary bg-accent' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleResolutionChange(currentConflict.id, 'cloud')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="cloud" id="cloud" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="cloud" className="text-base font-semibold cursor-pointer">
                        Use Cloud Version
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        From Sync
                      </Badge>
                      {new Date(currentConflict.cloudTimestamp) > new Date(currentConflict.localTimestamp) && (
                        <Badge className="text-xs">Newer</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Modified {format(new Date(currentConflict.cloudTimestamp), 'PPp')}
                      </div>
                      {currentConflict.cloudUser && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {currentConflict.cloudUser}
                        </div>
                      )}
                    </div>

                    <ScrollArea className="h-24 w-full rounded border bg-muted/50 p-3">
                      <pre className="text-xs font-mono">
                        {renderValue(currentConflict.cloudValue)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentTab === 0}
            >
              Previous
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Auto-resolve all with cloud version
                const allResolutions: ConflictResolution[] = conflicts.map(conflict => ({
                  conflictId: conflict.id,
                  resolution: 'cloud',
                }));
                onResolve(allResolutions);
                onOpenChange(false);
              }}
            >
              Use Cloud for All
            </Button>
            <Button
              onClick={handleNext}
              disabled={!currentResolution}
            >
              {currentTab === totalConflicts - 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve All
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
