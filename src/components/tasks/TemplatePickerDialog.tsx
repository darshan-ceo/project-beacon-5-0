import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Clock, User, Zap, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskTemplate } from '@/types/taskTemplate';
import { taskTemplatesService } from '@/services/taskTemplatesService';

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TaskTemplate) => void;
}

export const TemplatePickerDialog: React.FC<TemplatePickerDialogProps> = ({
  open,
  onOpenChange,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await taskTemplatesService.getAll();
      setTemplates(data.filter((t) => t.isActive));
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    const searchLower = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower)
    );
  }, [templates, search]);

  // Group by most used first
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => b.usageCount - a.usageCount);
  }, [filteredTemplates]);

  const handleSelect = async (template: TaskTemplate) => {
    // Increment usage count
    await taskTemplatesService.incrementUsage(template.id);
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create from Template
          </DialogTitle>
          <DialogDescription>
            Choose a template to pre-fill task details
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Templates List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : sortedTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No templates found</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">
                          {template.title}
                        </h4>
                        <Badge variant="secondary" className={`text-xs shrink-0 ${getPriorityColor(template.priority)}`}>
                          {template.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.estimatedHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {template.assignedRole}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.usageCount > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Zap className="h-3 w-3" />
                            Used {template.usageCount}x
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
