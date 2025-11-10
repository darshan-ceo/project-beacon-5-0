import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface IssueType {
  id: string;
  name: string;
  category: string | null;
  frequency_count: number;
}

interface IssueTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const IssueTypeSelector: React.FC<IssueTypeSelectorProps> = ({
  value,
  onValueChange,
  disabled
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIssueType, setNewIssueType] = useState('');
  const [addToMaster, setAddToMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load issue types from database
  useEffect(() => {
    loadIssueTypes();
  }, []);
  
  const loadIssueTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_types')
        .select('*')
        .eq('is_active', true)
        .order('frequency_count', { ascending: false });
      
      if (error) throw error;
      setIssueTypes(data || []);
    } catch (error) {
      console.error('Error loading issue types:', error);
      toast({
        title: "Error",
        description: "Failed to load issue types",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filteredIssues = issueTypes.filter(issue =>
    issue.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddNew = async () => {
    if (!newIssueType.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an issue type name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (addToMaster) {
        // Save to database
        const { error } = await supabase
          .from('issue_types')
          .insert({
            name: newIssueType.trim(),
            frequency_count: 1
          });
        
        if (error) {
          // Check if it's a unique constraint error
          if (error.code === '23505') {
            toast({
              title: "Already Exists",
              description: "This issue type already exists in the master list",
              variant: "destructive"
            });
            return;
          }
          throw error;
        }
        
        // Reload issue types
        await loadIssueTypes();
        
        toast({
          title: "Success",
          description: "Issue type added to master database",
        });
      }
      
      onValueChange(newIssueType.trim());
      setIsAddDialogOpen(false);
      setNewIssueType('');
      setAddToMaster(false);
    } catch (error) {
      console.error('Error adding issue type:', error);
      toast({
        title: "Error",
        description: "Failed to add issue type",
        variant: "destructive"
      });
    }
  };
  
  return (
    <>
      <div className="space-y-2">
        <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select or search issue type..." />
          </SelectTrigger>
          <SelectContent className="z-[200] bg-popover" position="popper" sideOffset={5}>
            <div className="p-2 sticky top-0 bg-popover border-b z-10">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.name}>
                    <div className="flex flex-col">
                      <span>{issue.name}</span>
                      {issue.category && (
                        <span className="text-xs text-muted-foreground">{issue.category}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No issue types found
                </div>
              )}
            </div>
            <div className="border-t mt-2 pt-2 sticky bottom-0 bg-popover z-10">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={(e) => {
                  e.preventDefault();
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Issue Type
              </Button>
            </div>
          </SelectContent>
        </Select>
      </div>
      
      {/* Add New Issue Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[290]" />
          <DialogContent className="z-[300]">
          <DialogHeader>
            <DialogTitle>Add Custom Issue Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newIssue">
                Issue Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newIssue"
                value={newIssueType}
                onChange={(e) => setNewIssueType(e.target.value)}
                placeholder="e.g., Advance Ruling Application"
                className="mt-2"
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="addToMaster"
                checked={addToMaster}
                onCheckedChange={(checked) => setAddToMaster(checked as boolean)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <label 
                  htmlFor="addToMaster" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Add to master database for future use
                </label>
                <p className="text-xs text-muted-foreground">
                  This will make the issue type available for all future cases
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNew}>
              {addToMaster ? 'Save & Add to Master' : 'Use Once'}
            </Button>
          </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};
