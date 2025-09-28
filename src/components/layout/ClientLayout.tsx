import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const { currentUser, switchRole } = useRBAC();

  const handleBackToAdmin = () => {
    switchRole('Admin');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToAdmin}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">H-Office Client Portal</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{currentUser.name}</div>
                  <Badge variant="secondary" className="text-xs">
                    Client Access
                  </Badge>
                </div>
              </div>
              
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © 2024 H-Office Legal Practice Management. Secure client portal.
          </div>
        </div>
      </footer>
    </div>
  );
};