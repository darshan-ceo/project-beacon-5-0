import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, 
  Users, 
  AlertTriangle,
  CheckSquare,
  Square,
  Loader2,
  Search,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export const ClientCleanupManager: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Identify test/duplicate clients
  const clientsWithMetadata = useMemo(() => {
    return state.clients.map(client => {
      const caseCount = state.cases.filter(c => c.clientId === client.id).length;
      const isTestPattern = /test|sample|demo|dummy|new client/i.test(client.name);
      const isDuplicate = state.clients.filter(
        c => c.name.toLowerCase().trim() === client.name.toLowerCase().trim()
      ).length > 1;
      
      return {
        ...client,
        caseCount,
        isTestPattern,
        isDuplicate,
        isSafeToDelete: caseCount === 0
      };
    }).sort((a, b) => {
      // Sort: test patterns first, then duplicates, then by name
      if (a.isTestPattern !== b.isTestPattern) return a.isTestPattern ? -1 : 1;
      if (a.isDuplicate !== b.isDuplicate) return a.isDuplicate ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [state.clients, state.cases]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clientsWithMetadata;
    const term = searchTerm.toLowerCase();
    return clientsWithMetadata.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.gstin?.toLowerCase().includes(term) ||
      c.pan?.toLowerCase().includes(term)
    );
  }, [clientsWithMetadata, searchTerm]);

  const toggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const selectAll = () => {
    const safeClients = filteredClients.filter(c => c.isSafeToDelete);
    setSelectedClients(new Set(safeClients.map(c => c.id)));
  };

  const selectNone = () => {
    setSelectedClients(new Set());
  };

  const selectTestPatterns = () => {
    const testClients = filteredClients.filter(c => c.isTestPattern && c.isSafeToDelete);
    setSelectedClients(new Set(testClients.map(c => c.id)));
  };

  const handleDeleteSelected = async () => {
    if (selectedClients.size === 0) return;
    
    setIsDeleting(true);
    try {
      const clientIds = Array.from(selectedClients);
      
      // Delete from Supabase (single source of truth)
      const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', clientIds);
      
      if (error) throw error;
      
      // Update local AppState to reflect deletion
      clientIds.forEach(clientId => {
        dispatch({ type: 'DELETE_CLIENT', payload: clientId });
      });
      
      toast({
        title: "Clients Deleted",
        description: `Successfully deleted ${clientIds.length} client(s) from database.`,
      });
      
      setSelectedClients(new Set());
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete clients. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedCount = selectedClients.size;
  const hasLinkedCases = Array.from(selectedClients).some(id => {
    const client = clientsWithMetadata.find(c => c.id === id);
    return client && client.caseCount > 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5 text-primary" />
          Client Cleanup
        </CardTitle>
        <CardDescription>
          Review and remove test/duplicate clients before going live
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {state.clients.length} Total Clients
          </Badge>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {clientsWithMetadata.filter(c => c.isTestPattern).length} Test Patterns
          </Badge>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {clientsWithMetadata.filter(c => c.isDuplicate).length} Duplicates
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {clientsWithMetadata.filter(c => c.isSafeToDelete).length} Safe to Delete
          </Badge>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="mr-1 h-4 w-4" />
              Safe
            </Button>
            <Button variant="outline" size="sm" onClick={selectTestPatterns}>
              Test
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              <Square className="mr-1 h-4 w-4" />
              None
            </Button>
          </div>
        </div>

        {/* Client List */}
        <ScrollArea className="h-[300px] border rounded-lg p-2">
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedClients.has(client.id) 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-muted/50'
                } ${!client.isSafeToDelete ? 'opacity-60' : ''}`}
              >
                <Checkbox
                  checked={selectedClients.has(client.id)}
                  onCheckedChange={() => toggleClient(client.id)}
                  disabled={!client.isSafeToDelete}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{client.name}</span>
                    {client.isTestPattern && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        Test
                      </Badge>
                    )}
                    {client.isDuplicate && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {client.gstin && <span>GSTIN: {client.gstin}</span>}
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {format(new Date(client.createdAt || Date.now()), 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {client.caseCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {client.caseCount} cases
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-green-600">
                      No cases
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No clients found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Delete Action */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedCount} client(s) selected
            {hasLinkedCases && (
              <span className="text-destructive ml-2">
                (Some have linked cases - will be skipped)
              </span>
            )}
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={selectedCount === 0 || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                  Delete {selectedCount} Client(s)?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected clients. Clients with linked cases will be skipped.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteSelected}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Clients
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
