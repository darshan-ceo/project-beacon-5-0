import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, LayoutDashboard, Briefcase, Users, BarChart3, Database, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  relatedModule: string;
}

interface ModuleFAQData {
  moduleId: string;
  moduleLabel: string;
  icon: string;
  description: string;
  faqs: FAQ[];
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  Briefcase,
  Users,
  BarChart3,
  Database,
  Settings,
};

const MODULE_FILES = ['overview', 'practice', 'crm', 'insights', 'masters', 'settings'];

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

export const ModuleFAQSection: React.FC = () => {
  const [modules, setModules] = useState<ModuleFAQData[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const results = await Promise.all(
          MODULE_FILES.map(async (file) => {
            const res = await fetch(`/help/faqs/modules/${file}.json`);
            if (!res.ok) return null;
            return res.json() as Promise<ModuleFAQData>;
          })
        );
        setModules(results.filter(Boolean) as ModuleFAQData[]);
      } catch (error) {
        console.error('[FAQ] Failed to load FAQ data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFAQs();
  }, []);

  const activeModule = useMemo(
    () => modules.find((m) => m.moduleId === selectedModule),
    [modules, selectedModule]
  );

  const filteredFAQs = useMemo(() => {
    if (!activeModule) return [];
    if (!searchQuery.trim()) return activeModule.faqs;
    const q = searchQuery.toLowerCase();
    return activeModule.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [activeModule, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-10 bg-muted rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Selector */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.icon] || HelpCircle;
          const isActive = mod.moduleId === selectedModule;
          return (
            <button
              key={mod.moduleId}
              onClick={() => {
                setSelectedModule(mod.moduleId);
                setSearchQuery('');
              }}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center',
                isActive
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-xs font-medium leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
                {mod.moduleLabel}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {mod.faqs.length}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Active module description */}
      {activeModule && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{activeModule.moduleLabel}</span> — {activeModule.description}
        </div>
      )}

      {/* Search within module */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search FAQs in ${activeModule?.moduleLabel || 'module'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'}
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
        <div className="flex gap-2">
          {['beginner', 'intermediate', 'advanced'].map((level) => (
            <Badge key={level} variant="outline" className={cn('text-[10px] cursor-pointer', LEVEL_COLORS[level])}
              onClick={() => setSearchQuery(level)}
            >
              {level}
            </Badge>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      {filteredFAQs.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-2">
          {filteredFAQs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <span className="flex-1">{faq.question}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0 mt-0.5', LEVEL_COLORS[faq.level])}>
                    {faq.level}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                <p className="mb-3">{faq.answer}</p>
                <div className="flex flex-wrap gap-1.5">
                  {faq.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] cursor-pointer"
                      onClick={() => setSearchQuery(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <HelpCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No FAQs match your search. Try different keywords or browse another module.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
