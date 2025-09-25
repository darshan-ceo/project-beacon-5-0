import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { employeeService } from '@/mock/services';
import type { Employee } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { AddressForm } from '@/components/ui/AddressForm';
import { AddressView } from '@/components/ui/AddressView';
import { EnhancedAddressData, addressMasterService } from '@/services/addressMasterService';
import { featureFlagService } from '@/services/featureFlagService';
import { Mail, Phone, Calendar, MapPin, User, Building, X } from 'lucide-react';
import { FieldTooltip } from '@/components/ui/field-tooltip';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  mode: 'create' | 'edit' | 'view';
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  mode
}) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState<Partial<Employee & { address?: EnhancedAddressData; addressId?: string }>>({
    full_name: '',
    role: 'Staff',
    email: '',
    mobile: '',
    status: 'Active',
    date_of_joining: '',
    notes: '',
    department: 'General',
    workloadCapacity: 40,
    specialization: [],
    address: {
      line1: '',
      line2: '',
      locality: '',
      district: '',
      cityId: '',
      stateId: '',
      pincode: '',
      countryId: 'IN',
      source: 'manual'
    } as EnhancedAddressData
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specializationInput, setSpecializationInput] = useState('');
  const [isAddressMasterEnabled, setIsAddressMasterEnabled] = useState(false);

  // Initialize form data
  useEffect(() => {
    setIsAddressMasterEnabled(featureFlagService.isEnabled('address_master_v1'));
    
    if (mode === 'create') {
      setFormData({
        full_name: '',
        role: 'Staff',
        email: '',
        mobile: '',
        status: 'Active',
        date_of_joining: '',
        notes: '',
        department: 'General',
        workloadCapacity: 40,
        specialization: []
      });
    } else if (employee) {
      setFormData({ ...employee });
    }
  }, [employee, mode, isOpen]);

  // Get unique departments from existing employees
  const departments = ['General', 'Legal', 'Finance', 'Administration', 'Operations', 'HR'];

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSpecialization = () => {
    if (specializationInput.trim() && !formData.specialization?.includes(specializationInput.trim())) {
      const newSpecializations = [...(formData.specialization || []), specializationInput.trim()];
      setFormData(prev => ({ ...prev, specialization: newSpecializations }));
      setSpecializationInput('');
    }
  };

  const handleRemoveSpecialization = (index: number) => {
    const newSpecializations = formData.specialization?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, specialization: newSpecializations }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await employeeService.create({
          ...formData,
          full_name: formData.full_name!
        } as any);
      } else {
        await employeeService.update(employee!.id, formData as any);
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>
              {mode === 'create' && 'Add New Employee'}
              {mode === 'edit' && 'Edit Employee'}
              {mode === 'view' && 'Employee Details'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <FieldTooltip formId="create-employee" fieldId="name" />
                </div>
                <Input
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="role">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <FieldTooltip formId="create-employee" fieldId="role" />
                </div>
                <Select
                  value={formData.role || ''}
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partner">Partner</SelectItem>
                    <SelectItem value="CA">CA</SelectItem>
                    <SelectItem value="Advocate">Advocate</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="RM">RM</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <FieldTooltip formId="create-employee" fieldId="email" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isReadOnly}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="mobile"
                    value={formData.mobile || ''}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Work Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="department">Department</Label>
                  <FieldTooltip formId="create-employee" fieldId="department" />
                </div>
                <Select
                  value={formData.department || ''}
                  onValueChange={(value) => handleInputChange('department', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_joining">Date of Joining</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="date_of_joining"
                    type="date"
                    value={formData.date_of_joining || ''}
                    onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
                    disabled={isReadOnly}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="workloadCapacity">Workload Capacity (hours/week)</Label>
                  <FieldTooltip formId="create-employee" fieldId="workload" />
                </div>
                <Input
                  id="workloadCapacity"
                  type="number"
                  min="1"
                  max="80"
                  value={formData.workloadCapacity || ''}
                  onChange={(e) => handleInputChange('workloadCapacity', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.status === 'Active'}
                    onCheckedChange={(checked) => handleInputChange('status', checked ? 'Active' : 'Inactive')}
                    disabled={isReadOnly}
                  />
                  <span className="text-sm">
                    {formData.status === 'Active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specialization?.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {spec}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialization(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add specialization..."
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialization())}
                  />
                  <Button type="button" onClick={handleAddSpecialization} variant="outline">
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          {isAddressMasterEnabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Address Information</span>
              </h3>
              
              <AddressForm
                value={formData.address || {
                  line1: '',
                  line2: '',
                  locality: '',
                  district: '',
                  cityId: '',
                  stateId: '',
                  pincode: '',
                  countryId: 'IN',
                  source: 'manual'
                }}
                onChange={(address) => setFormData(prev => ({ ...prev, address: address }))}
                disabled={isReadOnly}
                module="employee"
                className="border rounded-lg p-4"
              />
            </div>
          )}

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isReadOnly}
                rows={3}
                placeholder="Additional notes about the employee..."
              />
            </div>
          </div>

          {/* Show dependencies in view mode */}
          {mode === 'view' && employee && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dependencies</h3>
                {(() => {
                  // Check for dependencies in demo mode
                  const dependencies: string[] = [];
                  
                  return dependencies.length > 0 ? (
                    <div className="space-y-2">
                      {dependencies.map((dep, index) => (
                        <Badge key={index} variant="outline">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active dependencies</p>
                  );
                })()}
              </div>
            </>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Employee' : 'Update Employee'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};