import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppState } from '@/contexts/AppStateContext';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  caseId?: string;
  onFolderCreated?: (folder: any) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  parentId,
  caseId,
  onFolderCreated
}) => {
  const { dispatch } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Unable to determine tenant');

      // Generate folder ID and path
      const folderId = crypto.randomUUID();
      const folderPath = parentId 
        ? `${parentId}/${formData.name.trim()}`
        : formData.name.trim();

      // Insert into document_folders table
      const { data: newFolder, error: insertError } = await supabase
        .from('document_folders')
        .insert({
          id: folderId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          path: folderPath,
          parent_id: parentId || null,
          case_id: caseId || null,
          tenant_id: profile.tenant_id,
          created_by: user.id,
          is_default: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Dispatch to update state
      dispatch({
        type: 'ADD_FOLDER',
        payload: {
          id: newFolder.id,
          name: newFolder.name,
          description: newFolder.description || '',
          path: newFolder.path,
          parentId: newFolder.parent_id || undefined,
          caseId: newFolder.case_id || undefined,
          createdAt: newFolder.created_at,
          lastAccess: newFolder.updated_at,
          documentCount: 0,
          size: 0
        }
      });

      toast({
        title: "Success",
        description: `Folder "${newFolder.name}" created successfully.`,
      });

      onFolderCreated?.(newFolder);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (error) {
      console.error('Folder creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your documents.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isCreating}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder-description">Description (Optional)</Label>
            <Textarea
              id="folder-description"
              placeholder="Brief description of folder contents"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isCreating}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.name.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};