import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  Shield,
  LogOut,
  User,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { envConfig } from '@/utils/envConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { HeaderDateTime } from './HeaderDateTime';

interface HeaderProps {
  userId?: string;
}

export const Header: React.FC<HeaderProps> = ({ userId }) => {
  const { signOut, userProfile, user } = useAuth();
  const navigate = useNavigate();

  // Get display name from profile or email
  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'User';
  
  // Get role from employee data
  const userRole = userProfile?.role || 'Staff';
  
  // Get avatar URL
  const avatarUrl = userProfile?.avatar_url || undefined;
  
  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-primary text-primary-foreground';
      case 'Partner': return 'bg-secondary text-secondary-foreground';
      case 'Manager': return 'bg-accent text-accent-foreground';
      case 'CA':
      case 'Advocate': return 'bg-muted text-muted-foreground';
      case 'Staff':
      case 'User': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const isDevMode = envConfig.QA_ON || !envConfig.API_SET || envConfig.MOCK_ON;

  return (
    <div className="flex items-center justify-between w-full gap-4">
      {/* Left Section - Global Search */}
      <div className="flex items-center flex-1 max-w-lg">
        <GlobalSearch />
      </div>

      {/* Right Section - Grouped items with uniform height */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Dev Mode Badge - Hidden on mobile */}
        {isDevMode && (
          <Badge variant="destructive" className="hidden md:flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            DEV MODE
          </Badge>
        )}

        {/* Date/Time Display - Hidden on mobile */}
        <HeaderDateTime />
        
        {/* Vertical Separator */}
        <div className="hidden md:block h-8 w-px bg-border mx-1" />
        
        {/* Notification Bell - Larger touch target */}
        {userId && (
          <NotificationBell 
            userId={userId} 
            className="h-10 w-10"
          />
        )}

        {/* Unified User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-11">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {/* User info - Hidden on mobile */}
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium leading-tight">{displayName}</span>
                <Badge className={`text-[10px] ${getRoleColor(userRole)}`}>
                  {userRole}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 hidden sm:block text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
              <Badge className={`text-xs mt-1 w-fit ${getRoleColor(userRole)}`}>
                {userRole}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {(userRole === 'Admin' || userRole === 'Partner') && (
              <DropdownMenuItem onClick={() => navigate('/access-roles')}>
                <Shield className="mr-2 h-4 w-4" />
                Access & Roles
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
