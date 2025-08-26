import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Client, useAppState } from '@/contexts/AppStateContext';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode: 'create' | 'edit' | 'view';
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, client: clientData, mode }) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<{
    name: string;
    type: 'Individual' | 'Company' | 'Partnership' | 'Trust' | 'Society';
    email: string;
    phone: string;
    address: string;
    registrationNumber: string;
    panNumber: string;
    gstNumber: string;
    assignedCA: string;
  }>({
    name: '',
    type: 'Individual',
    email: '',
    phone: '',
    address: '',
    registrationNumber: '',
    panNumber: '',
    gstNumber: '',
    assignedCA: ''
  });

  useEffect(() => {
    if (clientData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: clientData.name,
        type: clientData.type,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        registrationNumber: clientData.registrationNumber || '',
        panNumber: clientData.panNumber,
        gstNumber: clientData.gstNumber || '',
        assignedCA: clientData.assignedCA
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'Individual',
        email: '',
        phone: '',
        address: '',
        registrationNumber: '',
        panNumber: '',
        gstNumber: '',
        assignedCA: ''
      });
    }
  }, [clientData, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      const newClient: Client = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        registrationNumber: formData.registrationNumber,
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        status: 'Active',
        assignedCA: formData.assignedCA,
        registrationDate: new Date().toISOString().split('T')[0],
        totalCases: 0,
        activeCases: 0,
        totalInvoiced: 0
      };

      dispatch({ type: 'ADD_CLIENT', payload: newClient });
      toast({
        title: "Client Created",
        description: `Client "${formData.name}" has been created successfully.`,
      });
    } else if (mode === 'edit' && clientData) {
      const updatedClient: Client = {
        ...clientData,
        name: formData.name,
        type: formData.type,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        registrationNumber: formData.registrationNumber,
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        assignedCA: formData.assignedCA
      };

      dispatch({ type: 'UPDATE_CLIENT', payload: updatedClient });
      toast({
        title: "Client Updated",
        description: `Client "${formData.name}" has been updated successfully.`,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (clientData) {
      dispatch({ type: 'DELETE_CLIENT', payload: clientData.id });
      toast({
        title: "Client Deleted",
        description: `Client "${clientData.name}" has been deleted.`,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Add New Client'}
            {mode === 'edit' && 'Edit Client'}
            {mode === 'view' && 'Client Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Client Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                  <SelectItem value="Trust">Trust</SelectItem>
                  <SelectItem value="Society">Society</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={mode === 'view'}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={mode === 'view'}
              rows={2}
              required
            />
          </div>

          {(formData.type === 'Company' || formData.type === 'Partnership' || formData.type === 'Trust' || formData.type === 'Society') && (
            <div>
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                disabled={mode === 'view'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                disabled={mode === 'view'}
                maxLength={10}
                required
              />
            </div>
            <div>
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={formData.gstNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                disabled={mode === 'view'}
                maxLength={15}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assignedCA">Assigned CA</Label>
            <Input
              id="assignedCA"
              value={formData.assignedCA}
              onChange={(e) => setFormData(prev => ({ ...prev, assignedCA: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'edit' && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Client
              </Button>
            )}
            {mode !== 'view' && (
              <Button type="submit">
                {mode === 'create' ? 'Add Client' : 'Update Client'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};