import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiDelete } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArchiveStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  fullName: string;
}

export function ArchiveStudentDialog({
  open,
  onOpenChange,
  studentId,
  fullName,
}: ArchiveStudentDialogProps) {
  const navigate = useNavigate();
  const [confirmName, setConfirmName] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  const nameMatches =
    confirmName.trim().toLowerCase() === fullName.trim().toLowerCase();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmName('');
    }
    onOpenChange(nextOpen);
  }

  async function handleArchive() {
    if (!nameMatches) return;

    setIsArchiving(true);
    try {
      await apiDelete(`/students/${studentId}`);
      toast.success('Student archived');
      navigate('/students');
    } catch {
      toast.error('Could not archive student. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive student</AlertDialogTitle>
          <AlertDialogDescription>
            This student will be hidden from the student list. Their data is retained and can be
            restored by an administrator. Type <strong>{fullName}</strong> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="archive-confirm-name">Type the student&apos;s full name to confirm</Label>
          <Input
            id="archive-confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={fullName}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>Keep student</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!nameMatches || isArchiving}
            onClick={handleArchive}
          >
            {isArchiving ? 'Archiving…' : 'Archive student'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
