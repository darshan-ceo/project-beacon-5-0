import React from 'react';
import { UserRole, useRBAC } from '@/hooks/useAdvancedRBAC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCheck, Shield, Users, User, Briefcase } from 'lucide-react';

const roleIcons: Record<UserRole, React.ElementType> = {
  Partner: Shield,
  Admin: UserCheck,
  Manager: Users,
  Associate: User,
  Clerk: Briefcase,
  Client: User,
  Advocate: User,
  Staff: User,
  Ca: Briefcase,
};

const roleColors: Record<UserRole, string> = {
  Partner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Associate: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Clerk: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  Client: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  Advocate: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  Staff: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  Ca: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export const RoleSelector: React.FC = () => {
  const { currentUser, switchRole } = useRBAC();
  const IconComponent = roleIcons[currentUser.role];

  const roles: UserRole[] = ['Partner', 'Admin', 'Manager', 'Associate', 'Clerk', 'Client'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-2">
          <div className="flex items-center space-x-2">
            <IconComponent className="h-4 w-4" />
            <div className="text-left">
              <div className="text-sm font-medium">{currentUser.name}</div>
              <Badge className={`text-xs ${roleColors[currentUser.role]}`}>
                {currentUser.role}
              </Badge>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Switch Role (Demo)</div>
        {roles.map((role) => {
          const RoleIcon = roleIcons[role];
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => switchRole(role)}
              className={currentUser.role === role ? 'bg-muted' : ''}
            >
              <RoleIcon className="mr-2 h-4 w-4" />
              <span>{role}</span>
              {currentUser.role === role && (
                <Badge className="ml-auto">Current</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};