import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Book, Users, Settings, Code, HelpCircle, ExternalLink, BookOpen } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { helpService } from '@/services/helpService';
import { enhancedHelpService } from '@/services/enhancedHelpService';
import { tourService } from '@/services/tourService';
import { HelpSearchBar } from '@/components/help/HelpSearchBar';
import { GlossaryTooltip } from '@/components/help/GlossaryTooltip';
import { CaseStudyViewer } from '@/components/help/CaseStudyViewer';
import { GuidedTour } from '@/components/help/GuidedTour';
import { ArticleViewer } from '@/components/help/ArticleViewer';
import { featureFlagService } from '@/services/featureFlagService';

interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: string;
  slug?: string;
  roles: string[];
  content: string;
  tags: string[];
  lastUpdated: string;
}

export const HelpCenter: React.FC = () => {
  const { currentUser, hasPermission } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('users');
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);
  const [showTours, setShowTours] = useState(false);

  // Load help content from content.json
  useEffect(() => {
    const loadHelpContent = async () => {
      try {
        setLoading(true);
        // Load content from public/help/content.json
        const response = await fetch('/help/content.json');
        if (response.ok) {
          const content = await response.json();
          setHelpContent(content);
        } else {
          // Fallback to helpService
          const content = await helpService.getHelpContent(currentUser?.role || 'all');
          setHelpContent(content);
        }
      } catch (error) {
        console.error('Failed to load help content:', error);
        // Use fallback content
        const content = await helpService.getHelpContent(currentUser?.role || 'all');
        setHelpContent(content);
      } finally {
        setLoading(false);
      }
    };

    loadHelpContent();
  }, [currentUser?.role]);

  // Handle search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await enhancedHelpService.search(query, currentUser?.role || 'all', {
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter content based on selected tab and role
  const filteredContent = useMemo(() => {
    let filtered = helpContent;

    // Filter by tab (role-based)
    if (selectedTab === 'admin') {
      filtered = filtered.filter(item => 
        item.roles.includes('Admin') || item.roles.includes('admin')
      );
    } else if (selectedTab === 'developers') {
      filtered = filtered.filter(item => 
        item.roles.includes('Developer') || item.roles.includes('developer')
      );
    } else {
      // Users tab - show content for general users (all, users, staff)
      filtered = filtered.filter(item => 
        item.roles.includes('all') || 
        item.roles.includes('users') || 
        item.roles.includes('Staff') ||
        (!item.roles.includes('Admin') && !item.roles.includes('admin') && 
         !item.roles.includes('Developer') && !item.roles.includes('developer'))
      );
    }

    return filtered;
  }, [helpContent, selectedTab]);

  // Get available tabs - all users can see all tabs for now
  const availableTabs = useMemo(() => {
    return [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'admin', label: 'Admin', icon: Settings },
      { id: 'developers', label: 'Developers', icon: Code }
    ];
  }, []);

  const quickActions = [
    {
      title: 'Start Guided Tour',
      description: 'Walk through key features step-by-step',
      icon: HelpCircle,
      action: () => setShowTours(true)
    },
    {
      title: 'Getting Started',
      description: 'Learn the basics of the system',
      icon: BookOpen,
      action: () => {
        const gettingStarted = helpContent.find(item => item.id === 'getting-started');
        if (gettingStarted) setSelectedContent(gettingStarted);
      }
    },
    {
      title: 'Case Management',
      description: 'Create and manage legal cases',
      icon: Users,
      action: () => {
        const caseGuide = helpContent.find(item => item.id === 'case-creation-tutorial');
        if (caseGuide) setSelectedContent(caseGuide);
      }
    },
    {
      title: 'Document Management',
      description: 'Upload and organize documents',
      icon: Book,
      action: () => {
        const docGuide = helpContent.find(item => item.id === 'document-management-guide');
        if (docGuide) setSelectedContent(docGuide);
      }
    }
  ];

  const renderContentCard = (content: HelpContent) => (
    <Card 
      key={content.id} 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedContent(content)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg hover:text-primary">{content.title}</CardTitle>
            <CardDescription className="mt-1">{content.description}</CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {content.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {content.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {content.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{content.tags.length - 3}
              </Badge>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Updated {new Date(content.lastUpdated).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Help & Knowledge Center</h1>
          <p className="text-muted-foreground">
            Find answers, learn best practices, and get step-by-step guidance for your workflow.
          </p>
        </div>

        {/* Search Bar */}
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
              {searchResults.slice(0, 8).map((result, index) => (
                <div 
                  key={index} 
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    if (result.type === 'article') {
                      setSelectedContent(result.item);
                    }
                  }}
                >
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.action}>
              <CardHeader className="text-center pb-4">
                <action.icon className="h-8 w-8 mx-auto text-primary" />
                <CardTitle className="text-base">{action.title}</CardTitle>
                <CardDescription className="text-sm">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            {availableTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {availableTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.map(renderContentCard)}
              </div>

              {filteredContent.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No content found</h3>
                  <p className="text-muted-foreground">
                    Content is being prepared for this section.
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Article Viewer Modal */}
        {selectedContent && (
          <ArticleViewer
            article={selectedContent as any}
            onClose={() => setSelectedContent(null)}
          />
        )}

        {/* Guided Tours */}
        {showTours && featureFlagService.isEnabled('help_tours_v1') && (
          <GuidedTour
            onClose={() => setShowTours(false)}
            userRole={currentUser?.role || 'Staff'}
          />
        )}
      </motion.div>
    </div>
  );
};