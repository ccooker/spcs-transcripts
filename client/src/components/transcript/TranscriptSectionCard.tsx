import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface TranscriptSectionCardProps {
  sectionId: string;
  title: string;
  visible: boolean;
  onToggleVisible: (visible: boolean) => void;
  isLoading?: boolean;
  children?: ReactNode;
}

export function TranscriptSectionCard({
  sectionId,
  title,
  visible,
  onToggleVisible,
  isLoading = false,
  children,
}: TranscriptSectionCardProps) {
  const switchId = `section-${sectionId}-visibility`;

  return (
    <Card
      aria-busy={isLoading}
      className={cn(!visible && 'border-dashed')}
    >
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0 pb-4 min-h-[44px]',
          !visible && 'bg-muted/50',
        )}
      >
        <h2
          className={cn(
            'text-xl font-semibold leading-tight',
            !visible && 'text-muted-foreground',
          )}
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={visible}
            disabled={isLoading}
            onCheckedChange={onToggleVisible}
          />
          <Label htmlFor={switchId} className="text-sm font-normal cursor-pointer">
            Include in transcript
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="min-h-[160px] w-full" />
          </div>
        ) : (
          <div className={cn(!visible && 'opacity-60')}>{children}</div>
        )}
        {!isLoading && !visible && (
          <p className="text-sm text-muted-foreground italic px-4 pb-2 mt-2">
            This section will not appear in the exported PDF.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
