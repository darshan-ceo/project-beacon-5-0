import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Book, Users, Settings, Code, HelpCircle, ExternalLink, BookOpen, Layers, Sparkles, GraduationCap, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { helpService } from '@/services/helpService';
import { enhancedHelpService } from '@/services/enhancedHelpService';
import { HelpSearchBar } from '@/components/help/HelpSearchBar';
import { GlossaryTooltip } from '@/components/help/GlossaryTooltip';
import { CaseStudyViewer } from '@/components/help/CaseStudyViewer';
import { featureFlagService } from '@/services/featureFlagService';
import { HelpDiscoveryHub } from '@/components/help/HelpDiscoveryHub';
import { WhatsNewPanel } from '@/components/help/WhatsNewPanel';
import { OnboardingWizard } from '@/components/help/OnboardingWizard';
import { ModuleFAQSection } from '@/components/help/ModuleFAQSection';
import { useLearningProgress } from '@/hooks/useLearningProgress';

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('discover');
  const [showTours, setShowTours] = useState(false);
  const [moduleHelpContent, setModuleHelpContent] = useState<any>({});
  const [changelogIds, setChangelogIds] = useState<string[]>([]);
  const { getUnreadChangelogCount } = useLearningProgress();

  const userRole = currentUser?.role || 'Staff';
  const unreadCount = getUnreadChangelogCount(changelogIds);

  console.log('[help-fix] Help Center initialized with feature flags');

  // Load changelog IDs for unread count
  useEffect(() => {
    const loadChangelogIds = async () => {
      try {
        const response = await fetch('/help/changelog.json');
        if (response.ok) {
          const data = await response.json();
          const ids = (data.entries || []).map((e: any) => e.id);
          setChangelogIds(ids);
        }
      } catch (error) {
        console.error('Failed to load changelog:', error);
      }
    };
    loadChangelogIds();
  }, []);

  // Handle deep-link query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openParam = urlParams.get('open');
    const slugParam = urlParams.get('slug');
    const tabParam = urlParams.get('tab');
    
    if (openParam === 'article' && slugParam) {
      console.log('[help-fix] Deep-link navigation to:', slugParam);
      navigate(`/help/articles/${slugParam}`, { replace: true });
    }
    
    if (tabParam && ['discover', 'whats-new', 'onboarding', 'faqs', 'modules', 'glossary'].includes(tabParam)) {
      setSelectedTab(tabParam);
    }
  }, [navigate]);

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

  // Load module help content
  useEffect(() => {
    const loadModuleHelp = async () => {
      try {
        const moduleHelp = await enhancedHelpService.getAllModuleHelp();
        setModuleHelpContent(moduleHelp);
      } catch (error) {
        console.error('Failed to load module help:', error);
      }
    };

    loadModuleHelp();
  }, []);

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

  // Get available tabs with enhanced discovery tabs
  const availableTabs = useMemo(() => {
    return [
      { id: 'discover', label: 'Discover', icon: Compass, badge: null },
      { id: 'whats-new', label: "What's New", icon: Sparkles, badge: unreadCount > 0 ? unreadCount : null },
      { id: 'onboarding', label: 'Get Started', icon: GraduationCap, badge: null },
      { id: 'faqs', label: 'FAQs', icon: HelpCircle, badge: null },
      { id: 'modules', label: 'Modules', icon: Layers, badge: null },
      { id: 'glossary', label: 'Glossary', icon: BookOpen, badge: null }
    ];
  }, [unreadCount]);

  const quickActions = [
    {
      title: 'Discover Help',
      description: 'Search all help content in one place',
      icon: Compass,
      action: () => setSelectedTab('discover')
    },
    {
      title: "What's New",
      description: 'Recent updates and features',
      icon: Sparkles,
      action: () => setSelectedTab('whats-new')
    },
    {
      title: 'Get Started',
      description: 'Personalized onboarding for your role',
      icon: GraduationCap,
      action: () => setSelectedTab('onboarding')
    },
    {
      title: 'View Glossary',
      description: 'Browse legal and technical terms',
      icon: BookOpen,
      action: () => {
        console.log('[help-fix] Navigating to glossary');
        navigate('/help/glossary');
      }
    }
  ];

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
            Discover help, learn best practices, and get step-by-step guidance for your workflow.
          </p>
        </div>

        {/* Tabs below provide the same navigation - removed duplicate quick action cards */}

        {/* Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full max-w-4xl grid-cols-6 gap-1 p-1 h-auto">
            {availableTabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <Badge variant="default" className="h-4 px-1 text-[10px]">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Discover Tab - Unified Search */}
          <TabsContent value="discover" className="space-y-4">
            <HelpDiscoveryHub userRole={userRole} />
          </TabsContent>

          {/* What's New Tab */}
          <TabsContent value="whats-new" className="space-y-4">
            <WhatsNewPanel userRole={userRole} />
          </TabsContent>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <OnboardingWizard userRole={userRole} />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      Need Help?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Complete your onboarding to get the most out of the system.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => setSelectedTab('discover')}>
                      Search All Help
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/help/glossary')}>
                      View Glossary
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Latest Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm"
                      onClick={() => setSelectedTab('whats-new')}
                    >
                      See what's new →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-4">
            <ModuleFAQSection />
          </TabsContent>

          {/* Module Help Tab */}
          <TabsContent value="modules" className="space-y-4">
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Browse contextual help content for each module and tab in the system.
              </div>
              
              {Object.entries(moduleHelpContent).map(([moduleId, tabs]) => (
                <Card key={moduleId}>
                  <CardHeader>
                    <CardTitle className="text-xl capitalize flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {moduleId.replace('-', ' ')}
                    </CardTitle>
                    <CardDescription>
                      Tab-specific help content for the {moduleId.replace('-', ' ')} module
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(tabs as any).map(([tabId, content]: [string, any]) => (
                        <Card key={tabId} className="cursor-pointer hover:shadow-md transition-shadow border-muted">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-sm font-medium">
                                  {content?.title || `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} Tab`}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {content?.description || `Help for ${tabId} functionality`}
                                </CardDescription>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {tabId}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="text-xs text-muted-foreground">
                              {content?.buttons?.length || 0} interactive elements • 
                              {content?.examples?.length || 0} examples
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 h-7 text-xs"
                              onClick={() => {
                                console.log(`[help] Navigate to ${moduleId}/${tabId} contextual help`);
                                // Navigate to the actual page with help context
                                if (moduleId === 'task-automation') {
                                  navigate('/tasks?help=true&tab=' + tabId);
                                } else if (moduleId === 'case-management') {
                                  navigate('/cases?help=true&tab=' + tabId);
                                } else if (moduleId === 'document-management') {
                                  navigate('/documents?help=true&tab=' + tabId);
                                } else if (moduleId === 'dashboard') {
                                  navigate('/?help=true&tab=' + tabId);
                                }
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View in Context
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {Object.keys(tabs as any).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No tab-specific help available for this module</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {Object.keys(moduleHelpContent).length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Loading module help content...</h3>
                  <p className="text-muted-foreground">
                    Gathering contextual help from all modules.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Glossary Tab */}
          <TabsContent value="glossary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Legal & Technical Glossary
                </CardTitle>
                <CardDescription>
                  Browse definitions of legal and technical terms used throughout the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/help/glossary')} className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Open Full Glossary
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </motion.div>
    </div>
  );
};
