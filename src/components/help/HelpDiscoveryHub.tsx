/**
 * Help Discovery Hub
 * Unified search and discovery interface for all help content
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import { HelpEntryCard } from './HelpEntryCard';
import { helpDiscoveryService, type HelpEntry, type FilterOptions } from '@/services/helpDiscoveryService';
import { cn } from '@/lib/utils';

interface HelpDiscoveryHubProps {
  userRole?: string;
  className?: string;
}

type SourceType = HelpEntry['source'];

const sourceFilters: { id: SourceType; label: string; icon: React.ElementType }[] = [
  { id: 'tour', label: 'Guided Tours', icon: Sparkles },
  { id: 'article', label: 'Articles', icon: BookOpen },
  { id: 'operations', label: 'Workflows', icon: Layers },
  { id: 'tooltip', label: 'UI Help', icon: HelpCircle },
  { id: 'faq', label: 'FAQs', icon: MessageSquare },
  { id: 'masters', label: 'Master Data', icon: Lightbulb }
];

const quickFilters = [
  { id: 'new', label: 'New this month', icon: Sparkles },
  { id: 'tours', label: 'Interactive', icon: Sparkles },
  { id: 'operations', label: 'Workflows', icon: Layers }
];

export const HelpDiscoveryHub: React.FC<HelpDiscoveryHubProps> = ({
  userRole = 'all',
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<HelpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
  const [modules, setModules] = useState<{ id: string; name: string; count: number }[]>([]);

  // Filter state
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'module'>('relevance');

  // Initialize and load initial data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await helpDiscoveryService.initialize();
        const [count, counts, mods] = await Promise.all([
          helpDiscoveryService.getTotalCount(),
          helpDiscoveryService.getSourceCounts(),
          helpDiscoveryService.getModules()
        ]);
        setTotalCount(count);
        setSourceCounts(counts);
        setModules(mods);

        // Load initial results
        const initialResults = await helpDiscoveryService.search('', {
          roles: userRole !== 'all' ? [userRole, 'all'] : undefined
        });
        setResults(initialResults);
      } catch (error) {
        console.error('[DiscoveryHub] Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [userRole]);

  // Search with filters
  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const filters: FilterOptions = {
        roles: userRole !== 'all' ? [userRole, 'all'] : undefined
      };

      if (selectedSources.length > 0) {
        filters.source = selectedSources;
      }
      if (selectedModules.length > 0) {
        filters.module = selectedModules;
      }
      if (showNewOnly) {
        filters.isNew = true;
      }

      const searchResults = await helpDiscoveryService.search(searchQuery, filters);

      // Sort results
      let sorted = [...searchResults];
      if (sortBy === 'date') {
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } else if (sortBy === 'module') {
        sorted.sort((a, b) => a.module.localeCompare(b.module));
      }

      setResults(sorted);
    } catch (error) {
      console.error('[DiscoveryHub] Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSources, selectedModules, showNewOnly, sortBy, userRole]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  const handleSourceToggle = (source: SourceType) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleModuleToggle = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const handleQuickFilter = (filterId: string) => {
    if (filterId === 'new') {
      setShowNewOnly(!showNewOnly);
    } else if (filterId === 'tours') {
      if (selectedSources.includes('tour')) {
        setSelectedSources(prev => prev.filter(s => s !== 'tour'));
      } else {
        setSelectedSources(prev => [...prev.filter(s => s !== 'tour'), 'tour']);
      }
    } else if (filterId === 'operations') {
      if (selectedSources.includes('operations')) {
        setSelectedSources(prev => prev.filter(s => s !== 'operations'));
      } else {
        setSelectedSources(prev => [...prev.filter(s => s !== 'operations'), 'operations']);
      }
    }
  };

  const clearAllFilters = () => {
    setSelectedSources([]);
    setSelectedModules([]);
    setShowNewOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSources.length > 0 || selectedModules.length > 0 || showNewOnly || searchQuery.trim();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Quick Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${totalCount} help entries...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearAllFilters}>
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", showFilters && "bg-muted")}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3 mr-1" />
              Filters
              {(selectedSources.length + selectedModules.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {selectedSources.length + selectedModules.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickFilters.map(filter => (
            <Button
              key={filter.id}
              variant={
                (filter.id === 'new' && showNewOnly) ||
                (filter.id === 'tours' && selectedSources.includes('tour')) ||
                (filter.id === 'operations' && selectedSources.includes('operations'))
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => handleQuickFilter(filter.id)}
            >
              <filter.icon className="h-3 w-3" />
              {filter.label}
            </Button>
          ))}
          
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Most Recent</SelectItem>
                <SelectItem value="module">Module</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source Type Filters */}
              <div>
                <h4 className="text-sm font-medium mb-3">Content Type</h4>
                <div className="space-y-2">
                  {sourceFilters.map(source => (
                    <div key={source.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`source-${source.id}`}
                        checked={selectedSources.includes(source.id)}
                        onCheckedChange={() => handleSourceToggle(source.id)}
                      />
                      <label
                        htmlFor={`source-${source.id}`}
                        className="text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <source.icon className="h-3 w-3 text-muted-foreground" />
                        {source.label}
                        <span className="text-xs text-muted-foreground">
                          ({sourceCounts[source.id] || 0})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Filters */}
              <div>
                <h4 className="text-sm font-medium mb-3">Module</h4>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2 pr-4">
                    {modules.slice(0, 15).map(module => (
                      <div key={module.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`module-${module.id}`}
                          checked={selectedModules.includes(module.id)}
                          onCheckedChange={() => handleModuleToggle(module.id)}
                        />
                        <label
                          htmlFor={`module-${module.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {module.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({module.count})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Searching...' : `${results.length} results`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(entry => (
              <HelpEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
