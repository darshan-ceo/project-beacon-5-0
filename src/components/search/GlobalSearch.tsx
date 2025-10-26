/**
 * Global Search Component for Header
 * Enhanced search bar with type-ahead, scopes, and keyboard navigation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, Filter, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchService, SearchScope, SearchSuggestion } from '@/services/searchService';
import { featureFlagService } from '@/services/featureFlagService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchTypeIndicator } from './SearchTypeIndicator';

const scopeOptions: { value: SearchScope; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-primary text-primary-foreground' },
  { value: 'cases', label: 'Cases', color: 'bg-blue-500 text-white' },
  { value: 'clients', label: 'Clients', color: 'bg-green-500 text-white' },
  { value: 'tasks', label: 'Tasks', color: 'bg-orange-500 text-white' },
  { value: 'documents', label: 'Documents', color: 'bg-purple-500 text-white' },
  { value: 'hearings', label: 'Hearings', color: 'bg-red-500 text-white' },
  { value: 'clientGroups', label: 'Client Groups', color: 'bg-teal-500 text-white' },
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
        return;
      }

      // Handle escape key when focused
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur();
        setIsFocused(false);
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
        // Ensure we never throw to render
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
    <div className="relative max-w-md w-full">
      {/* Global Search Label */}
      <div className="flex items-center gap-2 mb-1.5">
        <SearchTypeIndicator 
          type="global" 
          tooltip="Search across all modules: Cases, Clients, Documents, Tasks, Hearings"
        />
        <span className="text-[10px] text-muted-foreground">Press / from anywhere</span>
      </div>

      {/* Search Input Container */}
      <div className="relative shadow-sm">
        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary z-10" />
        <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
        
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="🔍 Search across all modules..."
          className={`h-11 pl-14 ${query ? 'pr-32' : 'pr-20'} bg-background border border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200`}
        />

        {/* Clear button */}
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuery}
            className="absolute right-20 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted z-20"
          >
            <X className="h-3 w-3" />
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
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 px-2 hover:bg-muted/50 min-w-fit whitespace-nowrap"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    <span className="text-xs">{activeScopeOption?.label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2 z-[9999]">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Search Scope: Choose modules</div>
                    {scopeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setScope(option.value)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                          scope === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Badge variant="secondary" className={`mr-2 text-xs ${option.color}`}>
                          {option.label}
                        </Badge>
                        {option.value === 'all' ? 'All content' : `${option.label} only`}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter search by module type</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50"
          >
            <SearchSuggestions
              query={query}
              suggestions={suggestions}
              recentSearches={recentSearches}
              isLoading={isLoading}
              onSuggestionSelect={handleSuggestionSelect}
              onRecentSearchSelect={handleRecentSearch}
              scope={scope}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Hint */}
      {!isFocused && !query && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
            /
          </Badge>
        </div>
      )}
    </div>
  );
};