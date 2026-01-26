/**
 * What's New Panel
 * Displays recent features, improvements, and updates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Sparkles, 
  ArrowUp, 
  Bug, 
  ExternalLink, 
  Play, 
  Check,
  Bell,
  BellOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { helpDiscoveryService, type ChangelogEntry } from '@/services/helpDiscoveryService';
import { cn } from '@/lib/utils';

interface WhatsNewPanelProps {
  userRole?: string;
  className?: string;
}

const categoryIcons = {
  feature: Sparkles,
  improvement: ArrowUp,
  fix: Bug
};

const categoryColors = {
  feature: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  improvement: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  fix: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
};

export const WhatsNewPanel: React.FC<WhatsNewPanelProps> = ({ 
  userRole = 'all',
  className 
}) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const { isChangelogRead, markChangelogRead, markAllChangelogRead, getUnreadChangelogCount } = useLearningProgress();

  useEffect(() => {
    const loadChangelog = async () => {
      setLoading(true);
      try {
        await helpDiscoveryService.initialize();
        const changelog = await helpDiscoveryService.getWhatsNew({
          days: parseInt(dateRange),
          roles: userRole !== 'all' ? [userRole] : undefined
        });
        setEntries(changelog);
      } catch (error) {
        console.error('[WhatsNew] Failed to load changelog:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChangelog();
  }, [dateRange, userRole]);

  const unreadCount = getUnreadChangelogCount(entries.map(e => e.id));

  const handleMarkAllRead = () => {
    markAllChangelogRead(entries.map(e => e.id));
  };

  const handleEntryClick = (entry: ChangelogEntry) => {
    markChangelogRead(entry.id);
    if (entry.learnMoreUrl) {
      navigate(entry.learnMoreUrl);
    }
  };

  const handleStartTour = (tourId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Could integrate with tour system here
    console.log('[WhatsNew] Start tour:', tourId);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>What's New</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7' | '30' | '90')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Recent updates, features, and improvements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No updates in this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const Icon = categoryIcons[entry.category];
                const isRead = isChangelogRead(entry.id);
                
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm",
                      !isRead && "bg-primary/5 border-primary/20",
                      isRead && "opacity-80"
                    )}
                    onClick={() => handleEntryClick(entry)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-md", categoryColors[entry.category])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              {entry.title}
                              {!isRead && (
                                <span className="h-2 w-2 bg-primary rounded-full" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(entry.releaseDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px]", categoryColors[entry.category])}>
                            {entry.category}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          {entry.description}
                        </p>
                        
                        {entry.highlights && entry.highlights.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {entry.highlights.slice(0, 3).map((highlight, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        <div className="flex items-center gap-2 mt-3">
                          {entry.learnMoreUrl && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Learn more
                            </Button>
                          )}
                          {entry.tourId && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs gap-1"
                              onClick={(e) => handleStartTour(entry.tourId!, e)}
                            >
                              <Play className="h-3 w-3" />
                              Take a tour
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
