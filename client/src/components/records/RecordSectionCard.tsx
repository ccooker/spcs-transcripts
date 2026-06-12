import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RecordSectionCardProps {
  title: string;
  count?: number;
  addLabel: string;
  onAdd: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyHeading?: string;
  emptyBody?: string;
  children?: ReactNode;
  hideAddButton?: boolean;
}

export function RecordSectionCard({
  title,
  count,
  addLabel,
  onAdd,
  isLoading = false,
  isError = false,
  onRetry,
  isEmpty = false,
  emptyHeading,
  emptyBody,
  children,
  hideAddButton = false,
}: RecordSectionCardProps) {
  return (
    <Card aria-busy={isLoading}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <h2 className="text-xl font-semibold leading-tight">
          {title}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({count ?? 0})
          </span>
        </h2>
        {!hideAddButton && (
          <Button variant="default" size="sm" onClick={onAdd} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        )}
        {!isLoading && isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Couldn't load {title.toLowerCase()}. Try again.
              {onRetry && (
                <button onClick={onRetry} className="underline ml-1">
                  Retry
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && isEmpty && (
          <div className="py-8 text-center">
            {emptyHeading && (
              <p className="text-sm font-medium">{emptyHeading}</p>
            )}
            {emptyBody && (
              <p className="text-sm text-muted-foreground mt-1">{emptyBody}</p>
            )}
          </div>
        )}
        {!isLoading && !isError && !isEmpty && children}
      </CardContent>
    </Card>
  );
}
