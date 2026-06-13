import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface RecordsUpdatedBannerProps {
  onRegenerate: () => void;
  onDismiss: () => void;
  isRegenerating?: boolean;
}

export function RecordsUpdatedBanner({
  onRegenerate,
  onDismiss,
  isRegenerating = false,
}: RecordsUpdatedBannerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Alert role="status" aria-live="polite" className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Records have been updated since you last edited this transcript.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              onClick={() => setConfirmOpen(true)}
            >
              Regenerate draft
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate transcript draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite all edited sections with structured prose built from
              the current records. Your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current text</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRegenerating}
              onClick={() => {
                setConfirmOpen(false);
                onRegenerate();
              }}
            >
              Regenerate draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
