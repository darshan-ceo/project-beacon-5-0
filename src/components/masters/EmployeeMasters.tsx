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
import { EmployeeModal } from '@/components/modals/EmployeeModal';
import { ImportWizard } from '@/components/importExport/ImportWizard';
import { ExportWizard } from '@/components/importExport/ExportWizard';
import { useAppState } from '@/contexts/AppStateContext';
import { employeesService, Employee } from '@/services/employeesService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { roleMapperService } from '@/services/roleMapperService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

export const EmployeeMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return state.employees.filter(employee => {
      const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [state.employees, searchTerm, statusFilter, roleFilter, departmentFilter]);

  // Get unique values for filters
  const roles = [...new Set(state.employees.map(emp => emp.role))];
  const departments = [...new Set(state.employees.map(emp => emp.department))];

  // Get statistics
  const stats = useMemo(() => {
    const total = state.employees.length;
    const active = state.employees.filter(emp => emp.status === 'Active').length;
    const inactive = total - active;
    const partners = state.employees.filter(emp => emp.role === 'Partner').length;
    const cas = state.employees.filter(emp => emp.role === 'CA').length;
    
    return { total, active, inactive, partners, cas };
  }, [state.employees]);

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
        const activeInRole = state.employees.filter(emp => 
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
        
        await employeesService.deactivate(employee.id, dispatch);
      } else {
        await employeesService.activate(employee.id, dispatch);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update employee status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    try {
      const dependencies = employeesService.checkDependencies(
        employee.id, 
        state.cases, 
        state.tasks, 
        state.hearings
      );

      if (dependencies.length > 0) {
        toast({
          title: "Cannot delete employee",
          description: `Employee has active dependencies: ${dependencies.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      await employeesService.delete(employee.id, dispatch, dependencies);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete employee",
        variant: "destructive",
      });
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
              onClick={() => setIsExportOpen(true)}
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={[
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' }
              ]}
              onChange={setStatusFilter}
            />
            
            <FilterDropdown
              label="Role"
              value={roleFilter}
              options={roles.map(role => ({ label: role, value: role }))}
              onChange={setRoleFilter}
            />
            
            <FilterDropdown
              label="Department"
              value={departmentFilter}
              options={departments.map(dept => ({ label: dept, value: dept }))}
              onChange={setDepartmentFilter}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>RBAC Roles</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{employee.full_name}</div>
                        {employee.specialization && employee.specialization.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {employee.specialization.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(employee.role)}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-wrap gap-1">
                            {roleMapperService.getRBACRoleNamesForEmployee(employee.role).map((rbacRole) => (
                              <Badge key={rbacRole} variant="secondary" className="text-xs">
                                {rbacRole}
                              </Badge>
                            ))}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Auto-assigned based on employee role</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{employee.email}</span>
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
                  <TableCell>
                    <span className="text-sm">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
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
      <EmployeeModal
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
        onImportComplete={(job) => {
          // Generate mock employees and add them to state
          const mockEmployees: Employee[] = Array.from({ length: job.counts.processed }, (_, i) => ({
            id: `imported_${Date.now()}_${i}`,
            full_name: `Imported Employee ${i + 1}`,
            role: 'Staff' as const,
            email: `imported.employee${i + 1}@company.com`,
            mobile: `+91 98765 4321${i}`,
            status: 'Active' as const,
            date_of_joining: new Date().toISOString().split('T')[0],
            notes: `Imported via Excel on ${new Date().toLocaleDateString()}`,
            department: 'General',
            workloadCapacity: 40,
            specialization: []
          }));

          // Add imported employees to state
          mockEmployees.forEach(employee => {
            dispatch({ type: 'ADD_EMPLOYEE', payload: employee });
          });

          toast({
            title: "Import Complete",
            description: `${job.counts.processed} employees imported successfully and added to the system`
          });
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