import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SignatoryModal } from './signatory-modal';
import { CompanySignatory } from '@/types/signatory';
import { toast } from '@/hooks/use-toast';
import { 
  Star, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users, 
  Crown,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';

interface SignatoryManagerProps {
  clientId: string;
  signatories: CompanySignatory[];
  onAdd: (signatory: Omit<CompanySignatory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  onUpdate: (signatory: CompanySignatory) => void;
  onDelete: (signatoryId: string) => void;
  onSetPrimary: (signatoryId: string) => void;
  disabled?: boolean;
}

export const SignatoryManager: React.FC<SignatoryManagerProps> = ({
  clientId,
  signatories,
  onAdd,
  onUpdate,
  onDelete,
  onSetPrimary,
  disabled = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSignatory, setSelectedSignatory] = useState<CompanySignatory | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signatoryToDelete, setSignatoryToDelete] = useState<string | null>(null);

  const activeSignatories = signatories.filter(s => s.status === 'Active');
  const primarySignatory = signatories.find(s => s.isPrimary && s.status === 'Active');

  const handleAddSignatory = () => {
    setSelectedSignatory(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditSignatory = (signatory: CompanySignatory) => {
    setSelectedSignatory(signatory);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteSignatory = (signatoryId: string) => {
    const signatory = signatories.find(s => s.id === signatoryId);
    
    // Prevent deleting the only active signatory
    if (activeSignatories.length === 1 && signatory?.status === 'Active') {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete the only active signatory. Add another signatory first.",
        variant: "destructive"
      });
      return;
    }

    setSignatoryToDelete(signatoryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (signatoryToDelete) {
      const signatory = signatories.find(s => s.id === signatoryToDelete);
      
      // If deleting primary signatory, check if there are other active signatories
      if (signatory?.isPrimary && activeSignatories.length > 1) {
        toast({
          title: "Primary Signatory Deleted",
          description: "Please select a new primary signatory from the remaining active signatories.",
          variant: "destructive"
        });
      }
      
      onDelete(signatoryToDelete);
      setDeleteDialogOpen(false);
      setSignatoryToDelete(null);
    }
  };

  const handleSetPrimary = (signatoryId: string) => {
    const signatory = signatories.find(s => s.id === signatoryId);
    if (signatory?.status !== 'Active') {
      toast({
        title: "Cannot Set Primary",
        description: "Only active signatories can be set as primary.",
        variant: "destructive"
      });
      return;
    }
    onSetPrimary(signatoryId);
  };

  const handleToggleStatus = (signatory: CompanySignatory) => {
    const newStatus = signatory.status === 'Active' ? 'Inactive' : 'Active';
    
    // If inactivating primary signatory, warn user
    if (signatory.isPrimary && newStatus === 'Inactive' && activeSignatories.length > 1) {
      toast({
        title: "Primary Signatory Inactivated",
        description: "Please select a new primary signatory from the remaining active signatories.",
        variant: "destructive"
      });
    }
    
    // Prevent inactivating the only active signatory
    if (signatory.status === 'Active' && activeSignatories.length === 1) {
      toast({
        title: "Cannot Inactivate",
        description: "Cannot inactivate the only active signatory. Add another signatory first.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedSignatory: CompanySignatory = {
      ...signatory,
      status: newStatus,
      // Remove primary flag if inactivating
      isPrimary: newStatus === 'Active' ? signatory.isPrimary : false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'current-user' // TODO: Get from auth context
    };
    
    onUpdate(updatedSignatory);
  };

  const handleSaveSignatory = (signatoryData: Omit<CompanySignatory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    if (modalMode === 'create') {
      onAdd(signatoryData);
    } else if (selectedSignatory) {
      const updatedSignatory: CompanySignatory = {
        ...selectedSignatory,
        ...signatoryData,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user' // TODO: Get from auth context
      };
      onUpdate(updatedSignatory);
    }
  };

  const getScopeBadges = (signingScope: string[]) => {
    if (signingScope.includes('All')) {
      return [<Badge key="all" variant="default" className="text-xs">All</Badge>];
    }
    
    return signingScope.slice(0, 2).map(scope => (
      <Badge key={scope} variant="outline" className="text-xs">
        {scope === 'GST Filings' ? 'GST' : scope}
      </Badge>
    )).concat(
      signingScope.length > 2 ? [
        <Badge key="more" variant="outline" className="text-xs">
          +{signingScope.length - 2}
        </Badge>
      ] : []
    );
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Authorized Signatories</Label>
          <Badge variant="outline" className="text-xs">
            {activeSignatories.length} Active
          </Badge>
        </div>
        <Button 
          onClick={handleAddSignatory} 
          disabled={disabled}
          size="sm"
          className="flex items-center space-x-1"
        >
          <Plus className="h-3 w-3" />
          <span>Add Signatory</span>
        </Button>
      </div>

      {signatories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No signatories added yet</p>
          <p className="text-xs">Add the first signatory to continue</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Designation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Signing Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signatories.map((signatory) => (
                <TableRow key={signatory.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {signatory.isPrimary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      <div>
                        <div className="font-medium">{signatory.fullName}</div>
                        {signatory.designation && (
                          <div className="text-xs text-muted-foreground">
                            {signatory.designation}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{signatory.email}</div>
                      <div className="text-muted-foreground">{signatory.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getScopeBadges(signatory.signingScope)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={signatory.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {signatory.status}
                      </Badge>
                      {signatory.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={disabled}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleEditSignatory(signatory)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        
                        {!signatory.isPrimary && signatory.status === 'Active' && (
                          <DropdownMenuItem onClick={() => handleSetPrimary(signatory.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Primary
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => handleToggleStatus(signatory)}>
                          {signatory.status === 'Active' ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Inactivate
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleDeleteSignatory(signatory.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Signatory Modal */}
      <SignatoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSignatory}
        signatory={selectedSignatory}
        clientId={clientId}
        existingSignatories={signatories}
        mode={modalMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signatory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this signatory? This action cannot be undone.
              {signatoryToDelete && signatories.find(s => s.id === signatoryToDelete)?.isPrimary && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  <strong>Warning:</strong> You are deleting the primary signatory. 
                  You will need to set another signatory as primary.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};