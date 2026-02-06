import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, FolderOpen, Calendar, User, Scale } from 'lucide-react';
import Fuse from 'fuse.js';
import { useAppState } from '@/contexts/AppStateContext';
import { format, parseISO, isValid } from 'date-fns';

interface CaseSearchPanelProps {
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string, caseData: any) => void;
  extractedGstin?: string;
}

export const CaseSearchPanel: React.FC<CaseSearchPanelProps> = ({
  selectedCaseId,
  onCaseSelect,
  extractedGstin
}) => {
  const { state } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to get client name by ID
  const getClientName = (clientId: string | undefined): string => {
    if (!clientId) return 'Unknown Client';
    const client = (state.clients || []).find((c: any) => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Helper to get GSTIN by client ID
  const getClientGstin = (clientId: string | undefined): string | undefined => {
    if (!clientId) return undefined;
    const client = (state.clients || []).find((c: any) => c.id === clientId);
    return client?.gstin;
  };

  // Enrich cases with client name for searching
  const enrichedCases = useMemo(() => {
    return (state.cases || []).map((c: any) => ({
      ...c,
      clientName: getClientName(c.clientId),
      gstin: getClientGstin(c.clientId)
    }));
  }, [state.cases, state.clients]);

  // Build search index
  const fuse = useMemo(() => {
    return new Fuse(enrichedCases, {
      keys: [
        { name: 'caseNumber', weight: 2 },
        { name: 'noticeNo', weight: 2 },
        { name: 'clientName', weight: 1.5 },
        { name: 'gstin', weight: 1.5 },
        { name: 'title', weight: 1 }
      ],
      threshold: 0.3,
      includeScore: true
    });
  }, [enrichedCases]);

  // Filter cases
  const filteredCases = useMemo(() => {
    if (!searchTerm.trim()) {
      // If no search term but we have extracted GSTIN, prioritize matching cases
      if (extractedGstin) {
        const matchingGstin = enrichedCases.filter((c: any) => 
          c.gstin?.toLowerCase() === extractedGstin.toLowerCase()
        );
        const others = enrichedCases.filter((c: any) => 
          c.gstin?.toLowerCase() !== extractedGstin.toLowerCase()
        );
        return [...matchingGstin, ...others].slice(0, 20);
      }
      return enrichedCases.slice(0, 20);
    }

    const results = fuse.search(searchTerm);
    return results.map(r => r.item).slice(0, 20);
  }, [searchTerm, fuse, extractedGstin, enrichedCases]);

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return enrichedCases.find((c: any) => c.id === selectedCaseId);
  }, [selectedCaseId, enrichedCases]);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'dd MMM yyyy') : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="case-search" className="text-sm font-medium">
          Search for Case
        </Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="case-search"
            placeholder="Search by case number, notice no, client name, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {extractedGstin && (
          <p className="text-xs text-muted-foreground mt-1">
            Showing cases matching GSTIN: <span className="font-mono">{extractedGstin}</span>
          </p>
        )}
      </div>

      {/* Selected Case Preview */}
      {selectedCase && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Selected Case
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCaseSelect('', null)}
                className="text-xs"
              >
                Change
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">{selectedCase.caseNumber}</span>
                <Badge variant="outline">{selectedCase.currentStage || 'Assessment'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedCase.title || selectedCase.clientName || 'Untitled'}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {selectedCase.clientName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedCase.createdDate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Available Cases ({filteredCases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {filteredCases.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cases found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredCases.map((caseItem: any) => {
                  const isSelected = caseItem.id === selectedCaseId;
                  const matchesGstin = extractedGstin && 
                    caseItem.gstin?.toLowerCase() === extractedGstin.toLowerCase();
                  
                  return (
                    <button
                      key={caseItem.id}
                      className={`w-full p-3 text-left hover:bg-secondary/50 transition-colors ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => onCaseSelect(caseItem.id, caseItem)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium truncate">
                              {caseItem.caseNumber}
                            </span>
                            {matchesGstin && (
                              <Badge variant="secondary" className="text-xs">
                                GSTIN Match
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {caseItem.title || caseItem.clientName || 'Untitled'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{caseItem.clientName}</span>
                            <span>•</span>
                            <span>{caseItem.currentStage || 'Assessment'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={caseItem.status === 'Active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {caseItem.status || 'Active'}
                          </Badge>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
