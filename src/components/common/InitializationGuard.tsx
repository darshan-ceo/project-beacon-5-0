/**
 * Initialization Guard - Ensures UnifiedStore is ready before rendering
 */

import React, { useEffect, useState } from 'react';
import { unifiedStore } from '@/persistence/unifiedStore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface InitializationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function InitializationGuard({ children, fallback }: InitializationGuardProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await unifiedStore.waitUntilReady();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize storage');
      }
    };

    initialize();
  }, []);

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <CardContent className="flex flex-col items-center space-y-4 p-6">
          <div className="text-destructive">
            ⚠️ Initialization Error
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Reload Page
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return fallback || <DefaultLoadingState />;
  }

  return <>{children}</>;
}

function DefaultLoadingState() {
  return (
    <Card className="mx-auto mt-8 max-w-md">
      <CardContent className="flex flex-col items-center space-y-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">
          Initializing storage system...
        </p>
        <div className="w-full space-y-2">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}