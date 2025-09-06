import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Book, Users, Settings, Code, HelpCircle, ExternalLink } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { helpService } from '@/services/helpService';
import { HelpSearchBar } from '@/components/help/HelpSearchBar';
import { GlossaryTooltip } from '@/components/help/GlossaryTooltip';
import { CaseStudyViewer } from '@/components/help/CaseStudyViewer';
import { GuidedTour } from '@/components/help/GuidedTour';

interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: 'faq' | 'tutorial' | 'guide' | 'case-study' | 'best-practice';
  roles: string[];
  content: string;
  tags: string[];
  lastUpdated: string;
}

export const HelpCenter: React.FC = () => {
  const { currentUser, hasPermission } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('users');
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);
  const [showTours, setShowTours] = useState(false);

  // Load help content based on user role
  useEffect(() => {
    const loadHelpContent = async () => {
      try {
        setLoading(true);
        const content = await helpService.getHelpContent(currentUser?.role || 'Staff');
        setHelpContent(content);
      } catch (error) {
        console.error('Failed to load help content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHelpContent();
  }, [currentUser?.role]);

  // Filter content based on search and selected tab
  const filteredContent = useMemo(() => {
    let filtered = helpContent;

    // Filter by tab (role-based)
    if (selectedTab === 'admin' && !hasPermission('administration', 'read')) {
      filtered = [];
    } else if (selectedTab === 'developers' && !hasPermission('development', 'read')) {
      filtered = [];
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [helpContent, searchQuery, selectedTab, hasPermission]);

  // Get available tabs based on user permissions
  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'users', label: 'Users', icon: Users, available: true },
      { id: 'admin', label: 'Administration', icon: Settings, available: hasPermission('administration', 'read') },
      { id: 'developers', label: 'Developers', icon: Code, available: hasPermission('development', 'read') }
    ];

    return tabs.filter(tab => tab.available);
  }, [hasPermission]);

  const quickActions = [
    {
      title: 'Start Guided Tour',
      description: 'Walk through key features step-by-step',
      icon: HelpCircle,
      action: () => setShowTours(true),
      roles: ['all']
    },
    {
      title: 'View Glossary',
      description: 'Understand legal and technical terms',
      icon: Book,
      action: () => window.open('/help/glossary', '_blank'),
      roles: ['all']
    },
    {
      title: 'API Documentation',
      description: 'Integration guides and endpoints',
      icon: Code,
      action: () => setSelectedTab('developers'),
      roles: ['Admin', 'Partner/CA']
    },
    {
      title: 'Best Practices',
      description: 'Recommended workflows and tips',
      icon: Users,
      action: () => setSearchQuery('best practice'),
      roles: ['all']
    }
  ];

  const filteredQuickActions = quickActions.filter(action =>
    action.roles.includes('all') || action.roles.includes(currentUser?.role || 'Staff')
  );

  const renderContentCard = (content: HelpContent) => (
    <Card key={content.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{content.title}</CardTitle>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedContent(content)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
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
        <HelpSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search help articles, tutorials, and guides..."
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredQuickActions.map((action, index) => (
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
                {filteredContent
                  .filter(content => {
                    if (tab.id === 'admin') return content.roles.includes('Admin');
                    if (tab.id === 'developers') return content.roles.includes('Developer');
                    return !content.roles.includes('Admin') && !content.roles.includes('Developer');
                  })
                  .map(renderContentCard)}
              </div>

              {filteredContent.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No content found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms.' : 'Content is being prepared for this section.'}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Content Viewer Modal */}
        {selectedContent && (
          <CaseStudyViewer
            content={selectedContent}
            onClose={() => setSelectedContent(null)}
          />
        )}

        {/* Guided Tours */}
        {showTours && (
          <GuidedTour
            onClose={() => setShowTours(false)}
            userRole={currentUser?.role || 'Staff'}
          />
        )}
      </motion.div>
    </div>
  );
};