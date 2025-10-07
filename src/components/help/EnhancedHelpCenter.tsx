import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Users, Settings, Code, ExternalLink } from 'lucide-react';
import { enhancedHelpService } from '@/services/enhancedHelpService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { cn } from '@/lib/utils';

interface EnhancedHelpCenterProps {
  userRole: string;
}

export const EnhancedHelpCenter: React.FC<EnhancedHelpCenterProps> = ({ userRole }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [showTourModal, setShowTourModal] = useState(false);
  const { currentUser, hasPermission } = useRBAC();

  // Check if help module is enabled
  if (!featureFlagService.isEnabled('help_module_v1')) {
    return <div className="p-6 text-center text-muted-foreground">Help module is not available.</div>;
  }

  const availableTabs = useMemo(() => {
    const allTabs = [
      { id: 'users', label: 'Users', icon: Users, roles: ['all'] },
      { id: 'admin', label: 'Admin', icon: Settings, roles: ['Admin'] },
      { id: 'developers', label: 'Developers', icon: Code, roles: ['Admin', 'Developer'] }
    ];
    
    return allTabs.filter(tab => 
      tab.roles.includes('all') || 
      tab.roles.includes(userRole)
    );
  }, [userRole]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await enhancedHelpService.search(query, userRole, {
        limit: 10,
        threshold: 0.6
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="help-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Knowledge Center</h1>
          <p className="text-muted-foreground">Find answers, guides, and tutorials</p>
        </div>
        {featureFlagService.isEnabled('help_tours_v1') && (
          <Button onClick={() => setShowTourModal(true)} variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            Guided Tours
          </Button>
        )}
      </div>

      {/* Search Section */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles, guides, and glossary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchResults.slice(0, 10).map((result, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {result.type === 'glossary' ? result.item.term : result.item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.type === 'glossary' ? result.item.definition : result.item.description}
                    </p>
                  </div>
                  <Badge variant={result.type === 'glossary' ? 'secondary' : 'default'}>
                    {result.type}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {availableTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Getting Started
                    <ExternalLink className="h-4 w-4" />
                  </CardTitle>
                  <CardDescription>
                    Learn the basics of the system
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Best Practices
                    <ExternalLink className="h-4 w-4" />
                  </CardTitle>
                  <CardDescription>
                    Tips for efficient case management
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

    </div>
  );
};