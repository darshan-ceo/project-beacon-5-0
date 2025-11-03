import { Cloud, Database, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStorageInfo } from "@/utils/storageInfo";

/**
 * Component to display current storage mode status
 * Shows whether the app is using Supabase cloud storage or local IndexedDB
 */
export const StorageStatusIndicator = () => {
  const storageInfo = getStorageInfo();
  
  const getIcon = () => {
    switch (storageInfo.mode) {
      case 'supabase':
        return <Cloud className="h-3 w-3" />;
      case 'indexeddb':
        return <Database className="h-3 w-3" />;
      default:
        return <RefreshCw className="h-3 w-3" />;
    }
  };
  
  const getVariant = () => {
    return storageInfo.mode === 'supabase' ? 'default' : 'secondary';
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={getVariant()} className="gap-1.5 cursor-help">
          {getIcon()}
          <span className="text-xs">{storageInfo.displayName}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <p className="font-medium">{storageInfo.displayName}</p>
          <p className="text-xs text-muted-foreground">{storageInfo.description}</p>
          <div className="flex gap-2 text-xs">
            {storageInfo.supportsRealtime && (
              <Badge variant="outline" className="text-xs">Real-time Sync</Badge>
            )}
            {storageInfo.supportsMultiDevice && (
              <Badge variant="outline" className="text-xs">Multi-Device</Badge>
            )}
          </div>
          {storageInfo.migrated && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Migration completed
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
