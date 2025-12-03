/**
 * Global Search Component for Header
 * Enhanced search bar with type-ahead, scopes, and keyboard navigation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Filter, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchService, SearchScope, SearchSuggestion } from '@/services/searchService';
import { featureFlagService } from '@/services/featureFlagService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchSuggestions } from './SearchSuggestions';
import { cn } from '@/lib/utils';

const scopeOptions: { value: SearchScope; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-primary text-primary-foreground' },
  { value: 'cases', label: 'Cases', color: 'bg-blue-500 text-white' },
  { value: 'clientGroups', label: 'Client Groups', color: 'bg-teal-500 text-white' },
  { value: 'clients', label: 'Clients', color: 'bg-green-500 text-white' },
  { value: 'tasks', label: 'Tasks', color: 'bg-orange-500 text-white' },
  { value: 'documents', label: 'Documents', color: 'bg-purple-500 text-white' },
  { value: 'hearings', label: 'Hearings', color: 'bg-red-500 text-white' },
];

interface GlobalSearchProps {
  onResultsOpen?: (query: string, scope: SearchScope) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onResultsOpen }) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Check if global search is enabled
  const isEnabled = featureFlagService.isEnabled('global_search_v1');

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(searchService.getRecentSearches());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Focus search on '/' key
      if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
        setMobileExpanded(true);
        return;
      }

      // Handle escape key when focused
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur();
        setIsFocused(false);
        setMobileExpanded(false);
        return;
      }

      // Handle enter key
      if (e.key === 'Enter' && isFocused && query.trim()) {
        e.preventDefault();
        handleSearch();
        return;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isFocused, query, scope]);

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!query.trim() || !isFocused) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        const results = await searchService.suggest(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Suggestions error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query, isFocused]);

  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setIsFocused(false);
    setMobileExpanded(false);
    inputRef.current?.blur();

    // Open search results
    if (onResultsOpen) {
      onResultsOpen(trimmedQuery, scope);
    } else {
      // Navigate to search results page
      const searchParams = new URLSearchParams({
        q: trimmedQuery,
        scope: scope === 'all' ? 'all' : scope
      });
      navigate(`/search?${searchParams.toString()}`);
    }
  }, [query, scope, navigate, onResultsOpen]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsFocused(false);
    
    // Trigger search with the selected suggestion
    setTimeout(() => {
      const searchParams = new URLSearchParams({
        q: suggestion.text,
        scope: scope === 'all' ? 'all' : scope
      });
      
      if (onResultsOpen) {
        onResultsOpen(suggestion.text, scope);
      } else {
        navigate(`/search?${searchParams.toString()}`);
      }
    }, 100);
  }, [scope, navigate, onResultsOpen]);

  const handleRecentSearch = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setIsFocused(false);
    
    setTimeout(() => {
      const searchParams = new URLSearchParams({
        q: recentQuery,
        scope: scope === 'all' ? 'all' : scope
      });
      
      if (onResultsOpen) {
        onResultsOpen(recentQuery, scope);
      } else {
        navigate(`/search?${searchParams.toString()}`);
      }
    }, 100);
  }, [scope, navigate, onResultsOpen]);

  const clearQuery = useCallback(() => {
    setQuery('');
    setIsFocused(false);
    inputRef.current?.focus();
  }, []);

  // Don't render if feature is disabled
  if (!isEnabled) {
    return (
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cases, clients, tasks..."
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          disabled
        />
      </div>
    );
  }

  const showSuggestions = isFocused && (suggestions.length > 0 || recentSearches.length > 0);
  const activeScopeOption = scopeOptions.find(option => option.value === scope);

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block relative w-full max-w-lg">
        {/* Gradient Background Glow */}
        <div 
          className={cn(
            "absolute -inset-1 rounded-2xl opacity-40 blur-lg transition-all duration-300",
            "bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30",
            isFocused && "opacity-70 blur-xl"
          )} 
        />
        
        {/* Main Search Container */}
        <div 
          className={cn(
            "relative rounded-xl overflow-hidden transition-all duration-300",
            "bg-gradient-to-r from-background/95 via-background to-background/95",
            "border-2 backdrop-blur-sm",
            isFocused 
              ? "border-primary/50 shadow-lg shadow-primary/20" 
              : "border-primary/20 hover:border-primary/30 shadow-md"
          )}
        >
          {/* Header Row with Badge and Hint */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-2 py-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Global Search
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono border">/</kbd> anywhere
            </span>
          </div>

          {/* Search Input Row */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-muted-foreground z-10" />
            
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Search cases, clients, tasks, documents..."
              className={cn(
                "h-11 pl-11 bg-transparent border-0 rounded-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground/50",
                query ? "pr-28" : "pr-20"
              )}
            />

            {/* Clear button */}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearQuery}
                className="absolute right-20 h-7 w-7 p-0 hover:bg-muted/50 z-20"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Scope Filter */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 h-8 px-2.5 hover:bg-primary/10 rounded-lg"
                      >
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        <span className="text-xs font-medium">{activeScopeOption?.label}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-52 p-2 z-[9999]">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          Search Scope
                        </div>
                        {scopeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setScope(option.value)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                              scope === option.value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <Badge variant="secondary" className={cn("text-[10px]", option.color)}>
                              {option.label}
                            </Badge>
                            <span className="text-xs">
                              {option.value === 'all' ? 'All content' : `${option.label} only`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter search by module</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-50"
            >
              <div className="rounded-xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm shadow-xl overflow-hidden">
                <SearchSuggestions
                  query={query}
                  suggestions={suggestions}
                  recentSearches={recentSearches}
                  isLoading={isLoading}
                  onSuggestionSelect={handleSuggestionSelect}
                  onRecentSearchSelect={handleRecentSearch}
                  scope={scope}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile View */}
      <div className="md:hidden relative">
        {/* Collapsed Mobile Search Button */}
        {!mobileExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMobileExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
          >
            <Search className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
              <span className="text-[8px] text-primary-foreground font-bold">/</span>
            </span>
          </Button>
        )}

        {/* Expanded Mobile Search */}
        <AnimatePresence>
          {mobileExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 40 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 40 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-0 z-50 p-3 bg-background/95 backdrop-blur-md border-b shadow-lg"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder="Search everything..."
                    className="pl-10 pr-10 h-11 bg-muted/50 border-primary/20 focus-visible:ring-primary/50"
                  />
                  {query && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQuery}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMobileExpanded(false);
                    setIsFocused(false);
                  }}
                  className="shrink-0"
                >
                  Cancel
                </Button>
              </div>

              {/* Mobile Suggestions */}
              {showSuggestions && (
                <div className="mt-2 rounded-lg border bg-background shadow-lg max-h-[60vh] overflow-y-auto">
                  <SearchSuggestions
                    query={query}
                    suggestions={suggestions}
                    recentSearches={recentSearches}
                    isLoading={isLoading}
                    onSuggestionSelect={handleSuggestionSelect}
                    onRecentSearchSelect={handleRecentSearch}
                    scope={scope}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
