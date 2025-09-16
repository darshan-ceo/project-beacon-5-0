/**
 * Search Suggestions Component
 * Type-ahead suggestions and recent searches for global search
 */

import React from 'react';
import { Search, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SearchSuggestion, SearchScope } from '@/services/searchService';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SearchSuggestionsProps {
  query: string;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  isLoading: boolean;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  onRecentSearchSelect: (query: string) => void;
  scope: SearchScope;
}

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'case':
      return '📋';
    case 'client':
      return '👤';
    case 'task':
      return '✓';
    case 'document':
      return '📄';
    case 'hearing':
      return '⚖️';
    case 'recent':
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    default:
      return <Search className="h-3 w-3 text-muted-foreground" />;
  }
};

const getTypeColor = (type?: string): string => {
  switch (type) {
    case 'case':
      return 'bg-blue-500 text-white';
    case 'client':
      return 'bg-green-500 text-white';
    case 'task':
      return 'bg-orange-500 text-white';
    case 'document':
      return 'bg-purple-500 text-white';
    case 'hearing':
      return 'bg-red-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  suggestions,
  recentSearches,
  isLoading,
  onSuggestionSelect,
  onRecentSearchSelect,
  scope
}) => {
  const hasQuery = query.trim().length > 0;
  const hasActiveSuggestions = suggestions.length > 0;
  const hasRecentSearches = recentSearches.length > 0;

  return (
    <Card className="shadow-lg border-0 bg-card/95 backdrop-blur-sm">
      <div className="p-2 max-h-80 overflow-y-auto">
        {/* Loading State */}
        {isLoading && hasQuery && (
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching...</span>
          </div>
        )}

        {/* Type-ahead Suggestions */}
        {hasActiveSuggestions && !isLoading && (
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSuggestionSelect(suggestion)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground rounded-md transition-colors group"
              >
                <div className="flex items-center justify-center w-5 h-5 text-xs">
                  {getTypeIcon(suggestion.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {suggestion.text}
                    </span>
                    {suggestion.type && suggestion.type !== 'recent' && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getTypeColor(suggestion.type)}`}
                      >
                        {suggestion.type}
                      </Badge>
                    )}
                  </div>
                  {suggestion.count && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.count} result{suggestion.count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}

        {/* Recent Searches */}
        {hasRecentSearches && (!hasQuery || (!hasActiveSuggestions && !isLoading)) && (
          <div className="space-y-1">
            {hasActiveSuggestions && (
              <div className="border-t border-border my-2" />
            )}
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Recent Searches
            </div>
            {recentSearches.slice(0, 5).map((recentQuery, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onRecentSearchSelect(recentQuery)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground rounded-md transition-colors group"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{recentQuery}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}

        {/* No Results */}
        {hasQuery && !isLoading && !hasActiveSuggestions && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>No suggestions found</div>
            <div className="text-xs mt-1">
              Press Enter to search for "{query}"
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasQuery && !hasRecentSearches && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>Start typing to search</div>
            <div className="text-xs mt-1">
              Search across cases, clients, tasks, documents, and hearings
            </div>
          </div>
        )}

        {/* Search Scope Indicator */}
        {scope !== 'all' && (
          <div className="border-t border-border mt-2 pt-2">
            <div className="px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Searching in:</span>
              <Badge variant="secondary" className={`text-xs ${getTypeColor(scope)}`}>
                {scope.charAt(0).toUpperCase() + scope.slice(1)}
              </Badge>
            </div>
          </div>
        )}

        {/* Keyboard Hints */}
        <div className="border-t border-border mt-2 pt-2">
          <div className="px-3 py-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to search</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};