/**
 * Search Results Component
 * Displays comprehensive search results with filtering and pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ExternalLink, Filter, X, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchService, SearchResult, SearchScope } from '@/services/searchService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const scopeOptions: { value: SearchScope; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All', icon: '🔍', color: 'bg-primary text-primary-foreground' },
  { value: 'cases', label: 'Cases', icon: '📋', color: 'bg-blue-500 text-white' },
  { value: 'clients', label: 'Clients', icon: '👤', color: 'bg-green-500 text-white' },
  { value: 'tasks', label: 'Tasks', icon: '✓', color: 'bg-orange-500 text-white' },
  { value: 'documents', label: 'Documents', icon: '📄', color: 'bg-purple-500 text-white' },
  { value: 'hearings', label: 'Hearings', icon: '⚖️', color: 'bg-red-500 text-white' },
];

const getResultIcon = (type: string): string => {
  switch (type) {
    case 'case': return '📋';
    case 'client': return '👤';
    case 'task': return '✓';
    case 'document': return '📄';
    case 'hearing': return '⚖️';
    default: return '🔍';
  }
};

const getResultTypeColor = (type: string): string => {
  switch (type) {
    case 'case': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'client': return 'bg-green-100 text-green-800 border-green-200';
    case 'task': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'document': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'hearing': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

interface SearchResultsProps {
  embedded?: boolean;
  onClose?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  embedded = false, 
  onClose 
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  
  // Search parameters
  const query = searchParams.get('q') || '';
  const scope = (searchParams.get('scope') as SearchScope) || 'all';
  
  // Local search state
  const [localQuery, setLocalQuery] = useState(query);
  const [localScope, setLocalScope] = useState<SearchScope>(scope);

  // Perform search
  const performSearch = useCallback(async (
    searchQuery: string, 
    searchScope: SearchScope, 
    cursor?: string,
    append = false
  ) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await searchService.search(searchQuery, searchScope, 20, cursor);
      
      if (append) {
        setResults(prev => [...prev, ...response.results]);
      } else {
        setResults(response.results);
      }
      
      setNextCursor(response.next_cursor);
      setHasMore(Boolean(response.next_cursor));
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      if (!append) {
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load more results
  const loadMore = useCallback(() => {
    if (nextCursor && !isLoading) {
      performSearch(query, scope, nextCursor, true);
    }
  }, [query, scope, nextCursor, isLoading, performSearch]);

  // Initial search and URL param changes
  useEffect(() => {
    if (query) {
      performSearch(query, scope);
    }
  }, [query, scope, performSearch]);

  // Update local state when URL params change
  useEffect(() => {
    setLocalQuery(query);
    setLocalScope(scope);
  }, [query, scope]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (!localQuery.trim()) return;

    const newParams = new URLSearchParams();
    newParams.set('q', localQuery.trim());
    newParams.set('scope', localScope);
    
    setSearchParams(newParams);
  }, [localQuery, localScope, setSearchParams]);

  // Handle scope change
  const handleScopeChange = useCallback((newScope: SearchScope) => {
    setLocalScope(newScope);
    
    if (query) {
      const newParams = new URLSearchParams();
      newParams.set('q', query);
      newParams.set('scope', newScope);
      setSearchParams(newParams);
    }
  }, [query, setSearchParams]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    window.open(result.url, '_blank');
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setLocalQuery('');
    setResults([]);
    setSearchParams({});
  }, [setSearchParams]);

  // Back navigation
  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  }, [navigate, onClose]);

  const activeScopeOption = scopeOptions.find(option => option.value === localScope);
  const resultCount = results.length;
  const hasResults = resultCount > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {/* Search Input */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search cases, clients, tasks, documents, hearings..."
                  className="pl-10 pr-10"
                />
                {localQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Search Button */}
            <Button onClick={handleSearch} disabled={!localQuery.trim()}>
              Search
            </Button>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center gap-2 mt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Filter by:</span>
            <div className="flex gap-2 flex-wrap">
              {scopeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={localScope === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScopeChange(option.value)}
                  className={localScope === option.value ? option.color : ''}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Status */}
        {query && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Search results for</span>
              <Badge variant="outline" className="font-medium">
                "{query}"
              </Badge>
              {localScope !== 'all' && (
                <>
                  <span>in</span>
                  <Badge className={activeScopeOption?.color}>
                    {activeScopeOption?.icon} {activeScopeOption?.label}
                  </Badge>
                </>
              )}
            </div>
            {hasResults && (
              <div className="text-sm text-muted-foreground">
                {resultCount} result{resultCount !== 1 ? 's' : ''} found
                {hasMore && ' (showing first results)'}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && results.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <div className="text-lg font-medium mb-2">Searching...</div>
              <div className="text-sm text-muted-foreground">
                Looking for "{query}" in {localScope === 'all' ? 'all content' : localScope}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <div className="text-destructive mb-2">Search Error</div>
              <div className="text-sm text-muted-foreground">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => performSearch(query, scope)}
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-4">
            <AnimatePresence>
              {results.map((result, index) => (
                <motion.div
                  key={`${result.type}-${result.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent 
                      className="p-4"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="text-2xl shrink-0 mt-1">
                          {getResultIcon(result.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {result.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {result.subtitle}
                              </p>
                            </div>

                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>

                          {/* Highlights */}
                          {result.highlights.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {result.highlights.join(' • ')}
                              </div>
                            </div>
                          )}

                          {/* Badges and Type */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getResultTypeColor(result.type)}`}
                            >
                              {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                            </Badge>
                            {result.badges.map((badge, badgeIndex) => (
                              <Badge 
                                key={badgeIndex} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {badge}
                              </Badge>
                            ))}
                            {result.score && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                {Math.round(result.score * 100)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-6">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load more results'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {query && !isLoading && !hasResults && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                We couldn't find any {localScope === 'all' ? 'content' : localScope} matching "{query}"
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Try:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Checking your spelling</li>
                  <li>Using different keywords</li>
                  <li>Searching in all content instead of specific categories</li>
                  <li>Using shorter or more general terms</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!query && (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Start your search</h3>
              <p className="text-muted-foreground">
                Search across cases, clients, tasks, documents, and hearings to find what you need.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};