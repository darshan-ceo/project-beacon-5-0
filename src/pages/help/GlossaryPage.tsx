import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { featureFlagService } from '@/services/featureFlagService';

interface GlossaryTerm {
  term: string;
  definition: string;
  technicalNote?: string;
  category: string;
  relatedTerms: string[];
}

export const GlossaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<GlossaryTerm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  console.log('[help-fix] Loading Glossary page');

  useEffect(() => {
    const loadGlossaryTerms = async () => {
      try {
        const response = await fetch('/help/glossary.json');
        if (response.ok) {
          const glossaryData = await response.json();
          setTerms(glossaryData);
          setFilteredTerms(glossaryData);
          console.log('[help-fix] Loaded glossary terms:', glossaryData.length);
        }
      } catch (error) {
        console.error('[help-fix] Failed to load glossary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGlossaryTerms();
  }, []);

  useEffect(() => {
    let filtered = terms;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(term => 
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected letter
    if (selectedLetter) {
      filtered = filtered.filter(term => 
        term.term.charAt(0).toUpperCase() === selectedLetter
      );
    }

    setFilteredTerms(filtered);
  }, [terms, searchQuery, selectedLetter]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const categories = [...new Set(terms.map(term => term.category))];

  const openArticle = (termSlug: string) => {
    console.log('[help-fix] Opening article for term:', termSlug);
    navigate(`/help/articles/${termSlug}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/help')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
        <p className="text-muted-foreground mt-2">
          Legal and technical terms used throughout the system
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search glossary terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Alphabet Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedLetter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedLetter('')}
        >
          All
        </Button>
        {alphabet.map(letter => (
          <Button
            key={letter}
            variant={selectedLetter === letter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedLetter(letter)}
            disabled={!terms.some(term => term.term.charAt(0).toUpperCase() === letter)}
          >
            {letter}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Terms List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTerms.map((term, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{term.term}</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {term.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3 leading-relaxed">
                {term.definition}
              </CardDescription>
              
              {term.technicalNote && (
                <div className="mb-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Technical Note:</strong> {term.technicalNote}
                  </p>
                </div>
              )}

              {term.relatedTerms.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Related Terms:</p>
                  <div className="flex flex-wrap gap-1">
                    {term.relatedTerms.slice(0, 3).map(relatedTerm => (
                      <Badge key={relatedTerm} variant="secondary" className="text-xs">
                        {relatedTerm}
                      </Badge>
                    ))}
                    {term.relatedTerms.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{term.relatedTerms.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No terms found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or browse all terms.
          </p>
        </div>
      )}
    </div>
  );
};