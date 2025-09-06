import React, { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search help articles...',
  className,
  onSearch
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(() => {
    if (onSearch && value.trim()) {
      onSearch(value.trim());
    }
  }, [onSearch, value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'relative flex items-center',
        'border rounded-md transition-colors',
        isFocused ? 'border-primary ring-1 ring-primary' : 'border-input hover:border-primary/50'
      )}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 border-0 focus:ring-0 focus-visible:ring-0"
        />
        
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 h-7 w-7 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Search suggestions or quick filters could go here */}
      {isFocused && value && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-60 overflow-auto">
          {/* Future: Add search suggestions */}
          <div className="p-2 text-sm text-muted-foreground">
            Press Enter to search for "{value}"
          </div>
        </div>
      )}
    </div>
  );
};