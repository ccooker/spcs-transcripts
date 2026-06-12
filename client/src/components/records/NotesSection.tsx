import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RecordSectionCard } from './RecordSectionCard';

type StaffNote = {
  id: string;
  content: string;
  author: { displayName: string };
  createdAt: string;
};

function formatNoteDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('en-HK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface NotesSectionProps {
  studentId: string;
}

export function NotesSection({ studentId }: NotesSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'notes'] as const;

  const [noteContent, setNoteContent] = useState('');

  const { data: notes = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<StaffNote[]>(`/students/${studentId}/notes`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { content: string }) =>
      apiPost<StaffNote>(`/students/${studentId}/notes`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Note added');
      setNoteContent('');
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  function handleAddNote() {
    if (!noteContent.trim()) return;
    createMutation.mutate({ content: noteContent.trim() });
  }

  return (
    <RecordSectionCard
      title="Notes"
      count={notes.length}
      addLabel="Add note"
      onAdd={handleAddNote}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={false}
      hideAddButton={true}
    >
      <div className="space-y-4">
        {/* Input area */}
        <div>
          <Label htmlFor="new-note">Add a note</Label>
          <Textarea
            id="new-note"
            placeholder="Add a note about this student…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            maxLength={500}
            className="min-h-[80px] mt-1.5"
            aria-describedby="note-char-count"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span id="note-char-count" className="text-xs text-muted-foreground">
              {noteContent.length}/500
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!noteContent}
                onClick={() => setNoteContent('')}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!noteContent.trim() || createMutation.isPending}
                onClick={handleAddNote}
              >
                {createMutation.isPending ? 'Adding…' : 'Add note'}
              </Button>
            </div>
          </div>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add the first note above.
          </p>
        ) : (
          <ul className="space-y-0">
            {notes.map((note, idx) => (
              <li key={note.id}>
                <div className="py-3">
                  <p className="text-xs text-muted-foreground">
                    {note.author.displayName} · {formatNoteDate(note.createdAt)}
                  </p>
                  <p className="text-sm leading-relaxed mt-1">{note.content}</p>
                </div>
                {idx < notes.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </RecordSectionCard>
  );
}
