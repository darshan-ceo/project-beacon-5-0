/**
 * Stage Transition History Component
 * Displays timeline of all stage changes for a case with expandable action cards
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Info, Search, Filter } from 'lucide-react';
import { StageActionCard } from './StageActionCard';
import { EnhancedStageTransition } from '@/types/stageAction';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StageTransitionHistoryProps {
  caseId: string;
}

export const StageTransitionHistory: React.FC<StageTransitionHistoryProps> = ({ caseId }) => {
  const [transitions, setTransitions] = useState<EnhancedStageTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadTransitions();
  }, [caseId]);

  const loadTransitions = async () => {
    if (!caseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('stage_transitions')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const enhancedTransitions: EnhancedStageTransition[] = (data || []).map((t: any) => ({
        id: t.id,
        caseId: t.case_id,
        fromStage: t.from_stage,
        toStage: t.to_stage,
        transitionType: t.transition_type,
        comments: t.comments,
        createdBy: t.created_by,
        createdAt: t.created_at,
        validationStatus: t.validation_status || 'passed',
        validationWarnings: t.validation_warnings || [],
        overrideReason: t.override_reason,
        requiresApproval: t.requires_approval || false,
        approvalStatus: t.approval_status,
        approvedBy: t.approved_by,
        approvedAt: t.approved_at,
        approvalComments: t.approval_comments,
        attachments: t.attachments || [],
        actorRole: t.actor_role,
        actorName: t.profiles?.full_name || 'Unknown User',
        isConfirmed: t.is_confirmed ?? true
      }));

      setTransitions(enhancedTransitions);
    } catch (err: any) {
      console.error('Failed to load stage transitions:', err);
      setError(err.message || 'Failed to load transition history');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransitions = transitions.filter(t => {
    const matchesSearch = !searchTerm || 
      t.toStage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fromStage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.actorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || t.transitionType === filterType;
    
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Stage Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Stage Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No stage transitions recorded yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Stage Transition History
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {transitions.length} transitions
          </Badge>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Forward">Forward</SelectItem>
              <SelectItem value="Send Back">Send Back</SelectItem>
              <SelectItem value="Remand">Remand</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px] pr-3">
          <div className="space-y-3">
            {filteredTransitions.map((transition, index) => (
              <StageActionCard
                key={transition.id}
                transition={transition}
                isLatest={index === 0}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
