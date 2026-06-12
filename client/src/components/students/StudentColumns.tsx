import { Link } from 'react-router-dom';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formLevelLabel, type FormLevel } from '@/lib/formLevels';

export type TranscriptStatus = 'NONE' | 'DRAFT' | 'FINALISED';

export type StudentListItem = {
  id: string;
  fullName: string;
  formLevel: FormLevel;
  graduationYear: number;
  schoolStudentId: string;
  transcriptStatus: TranscriptStatus;
  archivedAt: string | null;
};

function transcriptBadge(status: TranscriptStatus) {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="outline">Draft</Badge>;
    case 'FINALISED':
      return <Badge variant="default">Finalised</Badge>;
    default:
      return <Badge variant="secondary">None</Badge>;
  }
}

function sortAria(sorting: SortingState, columnId: string): 'ascending' | 'descending' | 'none' {
  const entry = sorting.find((s) => s.id === columnId);
  if (!entry) return 'none';
  return entry.desc ? 'descending' : 'ascending';
}

export function createStudentColumns(options: {
  sorting: SortingState;
  onSort: (columnId: string) => void;
  isAdmin: boolean;
  onRestore: (id: string) => void;
  restoringId: string | null;
}): ColumnDef<StudentListItem>[] {
  const { sorting, onSort, isAdmin, onRestore, restoringId } = options;

  const sortableHeader = (label: string, columnId: string) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-sm font-semibold hover:text-foreground"
      aria-sort={sortAria(sorting, columnId)}
      onClick={() => onSort(columnId)}
    >
      {label}
    </button>
  );

  return [
    {
      id: 'fullName',
      accessorKey: 'fullName',
      header: () => sortableHeader('Full name', 'fullName'),
      cell: ({ row }) => {
        const student = row.original;
        const archived = student.archivedAt !== null;
        return (
          <span className={archived ? 'text-muted-foreground' : undefined}>
            {student.fullName}
            {archived && (
              <span className="ml-2 text-sm text-muted-foreground">(Archived)</span>
            )}
          </span>
        );
      },
    },
    {
      id: 'formLevel',
      accessorKey: 'formLevel',
      header: () => sortableHeader('Form', 'formLevel'),
      cell: ({ row }) => formLevelLabel(row.original.formLevel),
    },
    {
      id: 'graduationYear',
      accessorKey: 'graduationYear',
      header: () => sortableHeader('Graduation year', 'graduationYear'),
      cell: ({ row }) => `Class of ${row.original.graduationYear}`,
    },
    {
      id: 'schoolStudentId',
      accessorKey: 'schoolStudentId',
      header: () => sortableHeader('Student ID', 'schoolStudentId'),
    },
    {
      id: 'transcriptStatus',
      accessorKey: 'transcriptStatus',
      header: () => sortableHeader('Transcript status', 'transcriptStatus'),
      cell: ({ row }) => transcriptBadge(row.original.transcriptStatus),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const student = row.original;
        if (student.archivedAt && isAdmin) {
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoringId === student.id}
              onClick={(e) => {
                e.stopPropagation();
                onRestore(student.id);
              }}
            >
              {restoringId === student.id ? 'Restoring…' : 'Restore'}
            </Button>
          );
        }
        return (
          <Link
            to={`/students/${student.id}`}
            className="inline-flex text-muted-foreground hover:text-foreground"
            aria-label={`View ${student.fullName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        );
      },
    },
  ];
}
