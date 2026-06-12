import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiGet, apiPost } from '@/api/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import {
  createStudentColumns,
  type StudentListItem,
} from '@/components/students/StudentColumns';
import { StudentsDataTable } from '@/components/students/StudentsDataTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FORM_LEVELS } from '@/lib/formLevels';

interface StudentsListPageProps {
  userInfo: UserInfo | null;
}

type ListResponse = {
  data: StudentListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_SIZE = 50;

export function StudentsListPage({ userInfo }: StudentsListPageProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [formLevelFilter, setFormLevelFilter] = useState<string>('all');
  const [transcriptStatusFilter, setTranscriptStatusFilter] = useState<string>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'formLevel', desc: false }]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const isAdmin = userInfo?.role === 'ADMIN';

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedQuery) params.set('q', appliedQuery);
    if (formLevelFilter !== 'all') params.set('formLevel', formLevelFilter);
    if (transcriptStatusFilter !== 'all') params.set('transcriptStatus', transcriptStatusFilter);
    params.set('page', String(pageIndex + 1));
    params.set('pageSize', String(PAGE_SIZE));
    const sortCol = sorting[0]?.id ?? 'formLevel';
    params.set('sort', sortCol);
    params.set('order', sorting[0]?.desc ? 'desc' : 'asc');
    if (includeArchived && isAdmin) params.set('includeArchived', 'true');
    return params.toString();
  }, [
    appliedQuery,
    formLevelFilter,
    transcriptStatusFilter,
    pageIndex,
    sorting,
    includeArchived,
    isAdmin,
  ]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiGet<ListResponse>(`/students?${buildQueryString()}`);
      if (res.data.length === 0 && res.meta.total > 0 && pageIndex > 0) {
        setPageIndex(0);
        return;
      }
      setStudents(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [buildQueryString, pageIndex]);

  useEffect(() => {
    if (!userInfo) return;
    void fetchStudents();
  }, [userInfo, fetchStudents]);

  const handleSearch = () => {
    setAppliedQuery(searchInput.trim());
    setPageIndex(0);
  };

  const handleSort = (columnId: string) => {
    setSorting((prev) => {
      const current = prev[0];
      if (current?.id === columnId) {
        return [{ id: columnId, desc: !current.desc }];
      }
      return [{ id: columnId, desc: false }];
    });
    setPageIndex(0);
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await apiPost(`/students/${id}/restore`, {});
      toast.success('Student restored');
      await fetchStudents();
    } catch {
      toast.error('Could not restore student');
    } finally {
      setRestoringId(null);
    }
  };

  const columns = useMemo(
    () =>
      createStudentColumns({
        sorting,
        onSort: handleSort,
        isAdmin,
        onRestore: handleRestore,
        restoringId,
      }),
    [sorting, isAdmin, restoringId],
  );

  const hasActiveFilters =
    appliedQuery !== '' ||
    formLevelFilter !== 'all' ||
    transcriptStatusFilter !== 'all' ||
    includeArchived;

  const emptyVariant =
    total === 0 && !hasActiveFilters && !loading ? 'none' : 'no-results';

  if (userInfo === null) {
    return (
      <AppShell userInfo={userInfo} activeNav="students">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-6 w-full max-w-xl mb-6" />
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Button asChild>
          <Link to="/students/new">Add student</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col gap-2 min-w-[200px] flex-1 max-w-sm">
          <Label htmlFor="student-search" className="sr-only">
            Search by name
          </Label>
          <Input
            id="student-search"
            placeholder="Search by name"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            disabled={loading && initialLoad}
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={loading && initialLoad}>
          Search students
        </Button>

        <div className="flex flex-col gap-2 w-[160px]">
          <Label htmlFor="form-filter">Form</Label>
          <Select
            value={formLevelFilter}
            onValueChange={(value) => {
              setFormLevelFilter(value);
              setPageIndex(0);
            }}
            disabled={loading && initialLoad}
          >
            <SelectTrigger id="form-filter">
              <SelectValue placeholder="All forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forms</SelectItem>
              {FORM_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  Form {level.replace('FORM_', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 w-[160px]">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={transcriptStatusFilter}
            onValueChange={(value) => {
              setTranscriptStatusFilter(value);
              setPageIndex(0);
            }}
            disabled={loading && initialLoad}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="FINALISED">Finalised</SelectItem>
              <SelectItem value="NONE">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 pb-2">
            <input
              id="include-archived"
              type="checkbox"
              className="h-4 w-4 rounded border border-input"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setPageIndex(0);
              }}
              disabled={loading && initialLoad}
            />
            <Label htmlFor="include-archived" className="font-normal cursor-pointer">
              Show archived students
            </Label>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Couldn&apos;t load students</AlertTitle>
          <AlertDescription>
            Something went wrong. Please try again.
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void fetchStudents()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!error && (
        <StudentsDataTable
          students={students}
          columns={columns}
          loading={loading}
          sorting={sorting}
          onSortingChange={(next) => {
            setSorting(next);
            setPageIndex(0);
          }}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={totalPages}
          onPageChange={setPageIndex}
          emptyVariant={emptyVariant}
          onAddStudent={() => navigate('/students/new')}
        />
      )}
    </AppShell>
  );
}
