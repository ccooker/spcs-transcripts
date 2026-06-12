import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  CohortGroupHeader,
  countCohortStatus,
} from '@/components/students/CohortGroupHeader';
import type { StudentListItem } from '@/components/students/StudentColumns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentsDataTableProps {
  students: StudentListItem[];
  columns: ColumnDef<StudentListItem>[];
  loading: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  pageIndex: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  emptyVariant: 'none' | 'no-results';
  onAddStudent: () => void;
}

export function StudentsDataTable({
  students,
  columns,
  loading,
  sorting,
  onSortingChange,
  pageIndex,
  pageSize,
  total,
  totalPages,
  onPageChange,
  emptyVariant,
  onAddStudent,
}: StudentsDataTableProps) {
  const navigate = useNavigate();
  const sortByFormLevel = sorting[0]?.id === 'formLevel';

  const table = useReactTable({
    data: students,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPages,
    rowCount: total,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, pagination: { pageIndex, pageSize } },
  });

  const rows = table.getRowModel().rows;
  const colSpan = columns.length;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);

  if (!loading && students.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <h2 className="text-xl font-semibold">
          {emptyVariant === 'none' ? 'No students yet' : 'No students found'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {emptyVariant === 'none'
            ? 'Add your first student to get started.'
            : 'Try a different name or adjust your filters.'}
        </p>
        {emptyVariant === 'none' && (
          <Button className="mt-6" onClick={onAddStudent}>
            Add student
          </Button>
        )}
      </div>
    );
  }

  return (
    <div aria-busy={loading}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} scope="col">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row, idx) => {
                  const student = row.original;
                  const prev = rows[idx - 1]?.original;
                  const showHeader =
                    sortByFormLevel &&
                    (idx === 0 || prev?.formLevel !== student.formLevel);

                  return (
                    <Fragment key={row.id}>
                      {showHeader && (
                        <CohortGroupHeader
                          formLevel={student.formLevel}
                          counts={countCohortStatus(students, student.formLevel)}
                          colSpan={colSpan}
                        />
                      )}
                      <TableRow
                        className={`h-12 cursor-pointer ${
                          student.archivedAt ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </Fragment>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {start}–{end} of {total} students
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={loading || pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={loading || pageIndex >= totalPages - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
