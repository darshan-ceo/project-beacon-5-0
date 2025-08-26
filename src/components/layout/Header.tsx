import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Search, 
  Menu, 
  ChevronDown,
  Shield,
  LogOut,
  User,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { RoleSelector } from '@/components/dashboard/RoleSelector';

interface HeaderProps {
  user: {
    name: string;
    role: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
    avatar?: string;
  };
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onMenuToggle }) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-primary text-primary-foreground';
      case 'Partner/CA': return 'bg-secondary text-secondary-foreground';
      case 'Staff': return 'bg-warning text-warning-foreground';
      case 'Client': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 bg-background border-b border-border backdrop-blur-sm bg-background/95"
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Search */}
          <div className="relative w-96 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients, cases, documents..."
              className="pl-10 bg-muted/50 border-muted focus:bg-background"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu with Role Selector */}
          <RoleSelector />
        </div>
      </div>
    </motion.header>
  );
};