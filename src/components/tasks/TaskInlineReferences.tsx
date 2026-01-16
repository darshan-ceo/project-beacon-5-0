import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  Calendar,
  ListTodo,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileType
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskContextData } from '@/types/taskContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaskInlineReferencesProps {
  context: TaskContextData;
  className?: string;
}

export const TaskInlineReferences: React.FC<TaskInlineReferencesProps> = ({
  context,
  className
}) => {
  const navigate = useNavigate();
  const { linkedDocuments, relatedHearings, bundle } = context;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const hasDocuments = linkedDocuments.length > 0;
  const hasHearings = relatedHearings.length > 0;
  const hasSiblingTasks = bundle && bundle.siblingTasks.length > 0;

  // Don't render if no references
  if (!hasDocuments && !hasHearings && !hasSiblingTasks) {
    return null;
  }

  const getFileIcon = (fileType: string) => {
    const type = fileType?.toLowerCase();
    if (type?.includes('image') || type?.includes('png') || type?.includes('jpg') || type?.includes('jpeg')) {
      return <FileImage className="h-4 w-4 text-purple-500" />;
    }
    if (type?.includes('pdf')) {
      return <FileType className="h-4 w-4 text-red-500" />;
    }
    if (type?.includes('excel') || type?.includes('spreadsheet') || type?.includes('xlsx') || type?.includes('xls')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadDocument = async (doc: TaskContextData['linkedDocuments'][0]) => {
    setDownloadingId(doc.id);
    try {
      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('case-documents')
        .createSignedUrl(doc.fileName, 60);

      if (error) throw error;

      // Open in new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'in progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'scheduled':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Determine default tab
  const defaultTab = hasDocuments ? 'documents' : hasHearings ? 'hearings' : 'related';

  return (
    <Card className={cn('border-0 rounded-none border-b bg-card/50', className)}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          Quick References
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="documents" className="text-xs gap-1" disabled={!hasDocuments}>
                <FileText className="h-3 w-3" />
                Docs ({linkedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="hearings" className="text-xs gap-1" disabled={!hasHearings}>
                <Calendar className="h-3 w-3" />
                Hearings ({relatedHearings.length})
              </TabsTrigger>
              <TabsTrigger value="related" className="text-xs gap-1" disabled={!hasSiblingTasks}>
                <ListTodo className="h-3 w-3" />
                Related ({bundle?.siblingTasks.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-2">
            <ScrollArea className="h-[160px]">
              <div className="px-4 space-y-2">
                {linkedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getFileIcon(doc.fileType)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)} • {doc.category || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {linkedDocuments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents linked to this task
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Hearings Tab */}
          <TabsContent value="hearings" className="mt-2">
            <ScrollArea className="h-[160px]">
              <div className="px-4 space-y-2">
                {relatedHearings.map((hearing) => (
                  <div
                    key={hearing.id}
                    className="p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/hearings/${hearing.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(hearing.hearingDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', getStatusBadgeColor(hearing.status))}>
                        {hearing.status || 'Scheduled'}
                      </Badge>
                    </div>
                    {hearing.courtName && (
                      <p className="text-xs text-muted-foreground ml-6">{hearing.courtName}</p>
                    )}
                  </div>
                ))}
                {relatedHearings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hearings for this case
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Related Tasks Tab */}
          <TabsContent value="related" className="mt-2">
            <ScrollArea className="h-[160px]">
              <div className="px-4 space-y-2">
                {bundle?.siblingTasks.map((sibling) => (
                  <div
                    key={sibling.id}
                    className="p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks/${sibling.id}?edit=true`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{sibling.title}</span>
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0 ml-2', getStatusBadgeColor(sibling.status))}>
                        {sibling.status}
                      </Badge>
                    </div>
                    {sibling.dueDate && (
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        Due: {format(new Date(sibling.dueDate), 'MMM d')}
                      </p>
                    )}
                  </div>
                ))}
                {(!bundle || bundle.siblingTasks.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No related tasks in this bundle
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
