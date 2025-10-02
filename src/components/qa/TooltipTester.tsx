import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Target, 
  HelpCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { uiHelpService } from '@/services/uiHelpService';

export const TooltipTester: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedHelp, setSelectedHelp] = useState<any | null>(null);

  const handleSearch = () => {
    if (!searchId.trim()) {
      setSearchResults([]);
      setSelectedHelp(null);
      return;
    }

    // Try exact match first
    const exactMatch = uiHelpService.getHelp(searchId.trim());
    if (exactMatch) {
      setSelectedHelp(exactMatch);
      setSearchResults([exactMatch]);
      return;
    }

    // Fuzzy search
    const results = uiHelpService.search(searchId);
    setSearchResults(results);
    setSelectedHelp(results.length > 0 ? results[0] : null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Interactive Tooltip Tester
          </CardTitle>
          <CardDescription>
            Search for help IDs to preview tooltip content and behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter help ID (e.g., button-create-case)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="font-mono"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length === 0 && searchId && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                No help entries found for "{searchId}". Try searching by keyword or partial ID.
              </AlertDescription>
            </Alert>
          )}

          {searchResults.length > 1 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">
                Found {searchResults.length} matches:
              </div>
              <div className="space-y-2">
                {searchResults.map(result => (
                  <Button
                    key={result.id}
                    variant={selectedHelp?.id === result.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedHelp(result)}
                    className="w-full justify-start"
                  >
                    <Badge variant="secondary" className="mr-2">{result.module}</Badge>
                    <span className="font-mono text-xs">{result.id}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Panel */}
      {selectedHelp && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Preview: {selectedHelp.id}
              </CardTitle>
              <Badge>{selectedHelp.type}</Badge>
            </div>
            <CardDescription>Module: {selectedHelp.module}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Layer 1: Label */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Layer 1: Label (Always Visible)
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-base font-medium">{selectedHelp.label}</div>
              </div>
            </div>

            {/* Layer 2: Explanation */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Layer 2: Visible Explanation (Always Shown)
              </div>
              <div className="p-3 bg-muted rounded-md">
                {selectedHelp.explanation ? (
                  <div className="text-sm text-muted-foreground">{selectedHelp.explanation}</div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No explanation provided</div>
                )}
              </div>
            </div>

            {/* Layer 3: Tooltip */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Layer 3: Tooltip (Hover/Focus)
              </div>
              <div className="p-4 bg-popover border border-border rounded-lg shadow-lg">
                <div className="font-semibold text-sm text-foreground mb-2">
                  {selectedHelp.tooltip.title}
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground mb-3">
                  {selectedHelp.tooltip.content}
                </div>
                {selectedHelp.tooltip.learnMoreUrl && (
                  <div className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-2">
                    Learn more → {selectedHelp.tooltip.learnMoreUrl}
                  </div>
                )}
                {selectedHelp.accessibility.keyboardShortcut && (
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Shortcut: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                      {selectedHelp.accessibility.keyboardShortcut}
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* Accessibility Info */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Accessibility
              </div>
              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-medium min-w-[100px]">ARIA Label:</span>
                  <span className="font-mono text-xs">{selectedHelp.accessibility.ariaLabel}</span>
                </div>
                {selectedHelp.accessibility.keyboardShortcut && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-medium min-w-[100px]">Shortcut:</span>
                    <kbd className="px-2 py-1 bg-background rounded text-xs font-mono">
                      {selectedHelp.accessibility.keyboardShortcut}
                    </kbd>
                  </div>
                )}
              </div>
            </div>

            {/* JSON Preview */}
            <details className="cursor-pointer">
              <summary className="text-xs font-medium text-muted-foreground mb-2">
                View Raw JSON
              </summary>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(selectedHelp, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Quick Test Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Test IDs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'button-create-case',
              'button-create-client', 
              'button-create-task',
              'button-upload-document',
              'button-schedule-hearing'
            ].map(id => (
              <Button
                key={id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchId(id);
                  const help = uiHelpService.getHelp(id);
                  if (help) {
                    setSelectedHelp(help);
                    setSearchResults([help]);
                  }
                }}
                className="font-mono text-xs"
              >
                {id}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
