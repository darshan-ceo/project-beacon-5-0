import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
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
      } else {
        // Add temporarily to local state for "Use Once"
        const tempIssueType: IssueType = {
          id: `temp-${Date.now()}`,
          name: newIssueType.trim(),
          category: null,
          frequency_count: 0
        };
        
        // Add to local state so it appears in dropdown
        setIssueTypes(prev => [tempIssueType, ...prev]);
        
        toast({
          title: "Success",
          description: "Custom issue type added for this case",
        });
      }
      
      onValueChange(newIssueType.trim());
      setIsAddDialogOpen(false);
      setNewIssueType('');
      setAddToMaster(false);
      setOpen(false);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background"
            disabled={disabled || loading}
          >
            {value || "Select or search issue type..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-[200]" align="start" sideOffset={5}>
          <Command>
            <CommandInput placeholder="Search issue types..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading issue types..." : "No issue type found."}
              </CommandEmpty>
              <CommandGroup>
                {issueTypes.map((issue) => (
                  <CommandItem
                    key={issue.id}
                    value={`${issue.name} ${issue.category || ''}`}
                    onSelect={() => {
                      onValueChange(issue.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === issue.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{issue.name}</span>
                      {issue.category && (
                        <span className="text-xs text-muted-foreground">
                          {issue.category}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          
          {/* Add New Button */}
          <div className="border-t border-border p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsAddDialogOpen(true);
                setOpen(false);
              }}
              disabled={loading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Issue Type
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
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
