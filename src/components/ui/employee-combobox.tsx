import * as React from 'react';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  department?: string;
  status?: string;
}

interface EmployeeComboboxProps {
  employees: Employee[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showRole?: boolean;
  showDepartment?: boolean;
  filterActive?: boolean;
}

export function EmployeeCombobox({
  employees,
  value,
  onValueChange,
  placeholder = 'Select assignee...',
  disabled = false,
  className,
  showRole = true,
  showDepartment = false,
  filterActive = true,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Filter and sort employees alphabetically
  const filteredEmployees = React.useMemo(() => {
    let list = [...employees];
    
    // Filter active only if specified
    if (filterActive) {
      list = list.filter((e) => e.status === 'Active');
    }
    
    // Sort alphabetically by full_name
    list.sort((a, b) => 
      (a.full_name || '').toLowerCase().localeCompare((b.full_name || '').toLowerCase())
    );
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      list = list.filter((e) =>
        (e.full_name || '').toLowerCase().includes(searchLower) ||
        (e.email || '').toLowerCase().includes(searchLower) ||
        (e.role || '').toLowerCase().includes(searchLower)
      );
    }
    
    return list;
  }, [employees, search, filterActive]);

  const selectedEmployee = employees.find((e) => e.id === value);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selectedEmployee ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(selectedEmployee.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedEmployee.full_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {/* Unassigned option */}
              <CommandItem
                value=""
                onSelect={() => {
                  onValueChange('');
                  setOpen(false);
                  setSearch('');
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground italic">Unassigned</span>
                </div>
                <Check
                  className={cn(
                    'ml-auto h-4 w-4',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </CommandItem>
              
              {filteredEmployees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={employee.id}
                  onSelect={() => {
                    onValueChange(employee.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee.full_name}</p>
                      <div className="flex items-center gap-1.5">
                        {showRole && employee.role && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {employee.role}
                          </Badge>
                        )}
                        {showDepartment && employee.department && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {employee.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0',
                      value === employee.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
