import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dmsService } from '@/services/dmsService';

interface TagInputProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = "Add tags...",
  disabled = false,
  className,
  maxTags = 10
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    try {
      setIsLoading(true);
      const tags = await dmsService.tags.list();
      const tagNames = tags.map(tag => tag.name).sort();
      setAvailableTags(tagNames);
    } catch (error) {
      console.error('Failed to load tags:', error);
      setAvailableTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = async (tagName: string) => {
    const trimmedTag = tagName.trim().toLowerCase();
    
    if (!trimmedTag || value.includes(trimmedTag) || value.length >= maxTags) {
      return;
    }

    // Create tag if it doesn't exist
    if (!availableTags.includes(trimmedTag)) {
      try {
        await dmsService.tags.create(trimmedTag);
        setAvailableTags(prev => [...prev, trimmedTag].sort());
      } catch (error) {
        console.error('Failed to create tag:', error);
        return;
      }
    }

    const newTags = [...value, trimmedTag];
    onChange?.(newTags);
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange?.(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filteredTags = availableTags.filter(tag => 
    !value.includes(tag) && 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn("w-full", className)}>
      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs px-2 py-1 flex items-center gap-1"
            >
              <Tag className="h-3 w-3" />
              {tag}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input with Autocomplete */}
      {!disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : "Add another tag..."}
                className="pr-8"
                onFocus={() => setIsOpen(true)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  if (inputValue.trim()) {
                    addTag(inputValue);
                  } else {
                    setIsOpen(!isOpen);
                    inputRef.current?.focus();
                  }
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search or create tags..." 
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {isLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading tags...</div>
                ) : (
                  <>
                    {inputValue && !filteredTags.includes(inputValue.toLowerCase()) && (
                      <CommandGroup heading="Create New">
                        <CommandItem onSelect={() => addTag(inputValue)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create "{inputValue.toLowerCase()}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                    
                    {filteredTags.length > 0 ? (
                      <CommandGroup heading="Existing Tags">
                        {filteredTags.slice(0, 8).map((tag) => (
                          <CommandItem 
                            key={tag} 
                            onSelect={() => addTag(tag)}
                            className="cursor-pointer"
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            {tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : inputValue && (
                      <CommandEmpty>
                        {inputValue ? `Create "${inputValue.toLowerCase()}"` : "No tags found"}
                      </CommandEmpty>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Tag limit indicator */}
      {value.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {value.length} of {maxTags} tags
        </div>
      )}
    </div>
  );
};