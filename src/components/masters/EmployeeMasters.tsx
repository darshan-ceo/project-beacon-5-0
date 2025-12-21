import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dropdown-menu';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { ExportButton } from '@/components/ui/export-button';
import { EmployeeModalV2 } from '@/components/modals/EmployeeModalV2';
import { ImportWizard } from '@/components/importExport/ImportWizard';
import { ExportWizard } from '@/components/importExport/ExportWizard';
import { UnifiedEmployeeSearch } from '@/components/masters/UnifiedEmployeeSearch';
import { useAppState } from '@/contexts/AppStateContext';
import { employeesService, Employee } from '@/services/employeesService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { roleMapperService } from '@/services/roleMapperService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  UserCheck, 
  UserX, 
  Trash2,
  Users,
  UserPlus,
  Building,
  Phone,
  Mail,
  Upload,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useImportRefresh } from '@/hooks/useImportRefresh';

export const EmployeeMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const queryClient = useQueryClient();
  const { reloadEmployees } = useImportRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch employees from database
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          profiles!inner(full_name, phone)
        `)
        .order('employee_code', { ascending: true });
      
      if (error) throw error;
      
      // Transform to match Employee interface
      return (data || []).map((emp: any) => ({
        id: emp.id,
        employeeCode: emp.employee_code,
        full_name: emp.profiles.full_name,
        email: emp.email,
        mobile: emp.mobile || emp.profiles.phone,
        role: emp.role,
        status: emp.status,
        department: emp.department,
        designation: emp.designation,
        date_of_joining: emp.date_of_joining,
        officialEmail: emp.official_email,
        personalEmail: emp.personal_email,
        alternateContact: emp.alternate_contact,
        currentAddress: emp.current_address,
        permanentAddress: emp.permanent_address,
        city: emp.city,
        state: emp.state,
        pincode: emp.pincode,
        branch: emp.branch,
        employmentType: emp.employment_type,
        confirmationDate: emp.confirmation_date,
        reportingTo: emp.reporting_to,
        managerId: emp.manager_id,
        weeklyOff: emp.weekly_off,
        workShift: emp.work_shift,
        workloadCapacity: emp.workload_capacity,
        profilePhoto: emp.profile_photo,
        gender: emp.gender,
        dob: emp.dob,
        pan: emp.pan,
        aadhaar: emp.aadhaar,
        bloodGroup: emp.blood_group,
        barCouncilNo: emp.bar_council_no,
        icaiNo: emp.icai_no,
        gstPractitionerId: emp.gst_practitioner_id,
        qualification: emp.qualification,
        experienceYears: emp.experience_years,
        areasOfPractice: emp.areas_of_practice,
        university: emp.university,
        graduationYear: emp.graduation_year,
        specialization: emp.specialization,
        billingRate: emp.billing_rate,
        billable: emp.billable,
        defaultTaskCategory: emp.default_task_category,
        incentiveEligible: emp.incentive_eligible,
        moduleAccess: emp.module_access,
        dataScope: emp.data_scope,
        aiAccess: emp.ai_access,
        whatsappAccess: emp.whatsapp_access,
        documents: emp.documents,
        notes: emp.notes,
        tenantId: emp.tenant_id,
        createdBy: emp.created_by,
        createdAt: emp.created_at,
        updatedBy: emp.updated_by,
        updatedAt: emp.updated_at,
      }));
    },
  });

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [employees, searchTerm, statusFilter, roleFilter, departmentFilter]);

  // Get unique values for filters
  const roles = [...new Set(employees.map(emp => emp.role))];
  const departments = [...new Set(employees.map(emp => emp.department))];

  // Get statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(emp => emp.status === 'Active').length;
    const inactive = total - active;
    const partners = employees.filter(emp => emp.role === 'Partner').length;
    const cas = employees.filter(emp => emp.role === 'CA').length;
    
    return { total, active, inactive, partners, cas };
  }, [employees]);

  // Deactivate employee mutation
  const deactivateMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'Inactive' })
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee deactivated",
        description: "Employee has been deactivated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate employee",
        variant: "destructive",
      });
    },
  });

  // Activate employee mutation
  const activateMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'Active' })
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee activated",
        description: "Employee has been activated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate employee",
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      // Check dependencies
      const { data: cases } = await supabase
        .from('cases')
        .select('id')
        .eq('assigned_to', employeeId);
      
      if (cases && cases.length > 0) {
        throw new Error(`Cannot delete: Employee has ${cases.length} assigned cases`);
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_to', employeeId);
      
      if (tasks && tasks.length > 0) {
        throw new Error(`Cannot delete: Employee has ${tasks.length} assigned tasks`);
      }

      // Delete employee (cascades to profile and auth user)
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Employee deleted",
        description: "Employee has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setModalMode('create');
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('edit');
    setIsEmployeeModalOpen(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('view');
    setIsEmployeeModalOpen(true);
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      if (employee.status === 'Active') {
        // Check if this is the last active partner/CA
        const activeInRole = employees.filter(emp => 
          emp.role === employee.role && emp.status === 'Active' && emp.id !== employee.id
        );
        
        if ((employee.role === 'Partner' || employee.role === 'CA') && activeInRole.length === 0) {
          toast({
            title: "Warning",
            description: `This is the last active ${employee.role}. Consider adding another before deactivating.`,
            variant: "destructive",
          });
          return;
        }
        
        await deactivateMutation.mutateAsync(employee.id);
      } else {
        await activateMutation.mutateAsync(employee.id);
      }
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    try {
      await deleteMutation.mutateAsync(employee.id);
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'Partner': 'bg-purple-100 text-purple-800',
      'CA': 'bg-blue-100 text-blue-800',
      'Advocate': 'bg-green-100 text-green-800',
      'Manager': 'bg-indigo-100 text-indigo-800',
      'Staff': 'bg-gray-100 text-gray-800',
      'RM': 'bg-orange-100 text-orange-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Admin': 'bg-red-100 text-red-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage employee profiles and assignments</p>
        </div>
        <div className="flex space-x-3">
          {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.import.employee', 'write') && (
            <Button 
              variant="outline" 
              onClick={() => setIsImportOpen(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Excel</span>
            </Button>
          )}
          {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.export.employee', 'write') && (
            <Button 
              variant="outline" 
              onClick={async () => {
                if (filteredEmployees.length === 0) {
                  toast({
                    title: "No data to export",
                    description: "There are no employees matching your current filters.",
                  });
                  return;
                }
                
                toast({
                  title: "Exporting data...",
                  description: "Preparing your employee data export"
                });
                
                try {
                  const { exportRows } = await import('@/utils/exporter');
                  
                  await exportRows({
                    moduleKey: 'employees',
                    rows: filteredEmployees,
                    options: {
                      format: 'xlsx',
                      dateFormat: 'dd-MM-yyyy'
                    }
                  });
                  
                  toast({
                    title: "Export complete!",
                    description: `Exported ${filteredEmployees.length} employees successfully`
                  });
                } catch (error) {
                  console.error('Export error:', error);
                  toast({
                    title: "Export failed",
                    description: "Failed to export employee data",
                  });
                }
              }}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </Button>
          )}
          <Button onClick={handleCreateEmployee} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partners</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.partners}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CAs</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.cas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <UnifiedEmployeeSearch
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            activeFilters={{
              ...(roleFilter !== 'all' && { role: roleFilter }),
              ...(departmentFilter !== 'all' && { department: departmentFilter }),
              ...(statusFilter !== 'all' && { status: statusFilter })
            }}
            onFiltersChange={(filters) => {
              setRoleFilter(filters.role || 'all');
              setDepartmentFilter(filters.department || 'all');
              setStatusFilter(filters.status || 'all');
            }}
            roles={roles}
            departments={departments}
            designations={[]}
            skills={['GST', 'Income Tax', 'Corporate Law', 'Compliance', 'Litigation', 'Advisory']}
          />
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">₹/hr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow 
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => hasPermission('employees', 'write') ? handleEditEmployee(employee) : handleViewEmployee(employee)}
                >
                  <TableCell>
                    <span className="font-mono text-sm">{employee.employeeCode || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                      </div>
                      <div className="font-medium text-foreground">{employee.full_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(employee.role)}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{employee.designation || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{employee.branch || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{employee.officialEmail || employee.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.mobile ? (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{employee.mobile}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-mono">
                      {employee.billingRate ? `₹${employee.billingRate}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                          <Users className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                          {employee.status === 'Active' ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No employees found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                  ? 'Try adjusting your search criteria' 
                  : 'Get started by adding your first employee'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Modal */}
      <EmployeeModalV2
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employee={selectedEmployee}
        mode={modalMode}
      />

      {/* Import/Export Wizards */}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entityType="employee"
        onImportComplete={async (job) => {
          console.log('Employee import completed:', job);
          if (job.counts.processed > 0) {
            await reloadEmployees();
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast({
              title: "Import Complete",
              description: `${job.counts.processed} employees imported successfully`
            });
          }
        }}
      />

      <ExportWizard
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        entityType="employee"
        currentFilters={{
          search: searchTerm,
          active: statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : undefined
        }}
        currentData={filteredEmployees}
      />
    </div>
  );
};