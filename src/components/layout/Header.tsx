import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Search, 
  ChevronDown,
  Shield,
  LogOut,
  User,
  Settings,
  AlertTriangle,
  Database,
  TestTube
} from 'lucide-react';
import { envConfig } from '@/utils/envConfig';
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
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { searchService, SearchProvider } from '@/services/searchService';

interface HeaderProps {
  user: {
    name: string;
    role: 'Admin' | 'Partner/CA' | 'Staff' | 'Client';
    avatar?: string;
  };
  onMenuToggle: () => void; // Still needed for compatibility but not used
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const [searchProvider, setSearchProvider] = useState<SearchProvider | null>(null);

  useEffect(() => {
    // Subscribe to search provider changes
    const unsubscribe = searchService.subscribeProvider?.(setSearchProvider);
    
    // Get initial provider if available
    const currentProvider = searchService.getProvider?.();
    if (currentProvider) {
      setSearchProvider(currentProvider);
    }
    
    return unsubscribe;
  }, []);

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
    <div className="flex items-center justify-between w-full">
      {/* Left Section - Global Search */}
      <div className="flex items-center space-x-4 flex-1">
        <GlobalSearch />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Dev Mode Badge - Hidden on mobile */}
        {(envConfig.QA_ON || !envConfig.API_SET || envConfig.MOCK_ON) && (
          <Badge variant="destructive" className="hidden md:flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            DEV MODE
          </Badge>
        )}
        
        {/* Search Provider Badge - Hidden on mobile */}
        {searchProvider && (
          <Badge 
            variant={searchProvider === 'API' ? 'default' : 'secondary'} 
            className="hidden md:flex items-center gap-1"
          >
            {searchProvider === 'API' ? (
              <Database className="h-3 w-3" />
            ) : (
              <TestTube className="h-3 w-3" />
            )}
            <span className="hidden lg:inline">Search: {searchProvider}</span>
          </Badge>
        )}
        
        {/* Role Selector - Hidden on small mobile */}
        <div className="hidden sm:block">
          <RoleSelector />
        </div>
        
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* User info - Hidden on mobile */}
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium">{user.name}</span>
                <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                  {user.role}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Shield className="mr-2 h-4 w-4" />
              RBAC
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};