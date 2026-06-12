import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AcademicResultsSection } from '@/components/records/AcademicResultsSection';
import { ActivitiesSection } from '@/components/records/ActivitiesSection';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiGet, apiPatch, apiPost } from '@/api/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import { ArchiveStudentDialog } from '@/components/students/ArchiveStudentDialog';
import {
  StudentForm,
  type CreateStudentFormValues,
} from '@/components/students/StudentForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formLevelLabel, type FormLevel } from '@/lib/formLevels';

interface StudentDetailPageProps {
  userInfo: UserInfo | null;
}

type TranscriptStatus = 'NONE' | 'DRAFT' | 'FINALISED';

type Student = {
  id: string;
  fullName: string;
  formLevel: FormLevel;
  graduationYear: number;
  schoolStudentId: string;
  studentEmail: string | null;
  studentPhone: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
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

function studentToFormValues(student: Student): CreateStudentFormValues {
  return {
    fullName: student.fullName,
    formLevel: student.formLevel,
    graduationYear: student.graduationYear,
    schoolStudentId: student.schoolStudentId,
    studentEmail: student.studentEmail ?? '',
    studentPhone: student.studentPhone ?? '',
    parentEmail: student.parentEmail ?? '',
    parentPhone: student.parentPhone ?? '',
  };
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base">{value || '—'}</p>
    </div>
  );
}

export function StudentDetailPage({ userInfo }: StudentDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editValues, setEditValues] = useState<CreateStudentFormValues | null>(null);

  const loadStudent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await apiGet<Student>(`/students/${id}`);
      setStudent(data);
      setEditValues(studentToFormValues(data));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        setNotFound(true);
        setStudent(null);
      } else {
        toast.error('Could not load student. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  function handleStartEdit() {
    if (!student) return;
    setEditValues(studentToFormValues(student));
    setIsEditing(true);
  }

  function handleDiscard() {
    if (!student) return;
    setEditValues(studentToFormValues(student));
    setIsEditing(false);
  }

  async function handleSave(values: CreateStudentFormValues) {
    if (!student) return;
    setIsSaving(true);
    try {
      const { schoolStudentId: _id, ...patchBody } = values;
      const updated = await apiPatch<Student>(`/students/${student.id}`, patchBody);
      setStudent(updated);
      setEditValues(studentToFormValues(updated));
      setIsEditing(false);
      toast.success('Changes saved');
    } catch {
      toast.error('Could not save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore() {
    if (!student) return;
    setIsRestoring(true);
    try {
      const restored = await apiPost<Student>(`/students/${student.id}/restore`, {});
      setStudent(restored);
      setEditValues(studentToFormValues(restored));
      toast.success('Student restored');
    } catch {
      toast.error('Could not restore student. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }

  const isArchived = Boolean(student?.archivedAt);
  const isAdmin = userInfo?.role === 'ADMIN';

  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      {loading && (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!loading && notFound && (
        <Alert variant="destructive">
          <AlertTitle>Student not found</AlertTitle>
          <AlertDescription>
            This student may have been removed or the link is incorrect.{' '}
            <Link to="/students" className="underline">
              Back to students
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!loading && student && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold leading-tight">{student.fullName}</h1>
                {transcriptBadge(student.transcriptStatus)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formLevelLabel(student.formLevel)} · Class of {student.graduationYear} ·{' '}
                {student.schoolStudentId}
                {isArchived && ' (Archived)'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {isAdmin && isArchived && (
                <Button variant="outline" onClick={handleRestore} disabled={isRestoring}>
                  {isRestoring ? 'Restoring…' : 'Restore student'}
                </Button>
              )}
              {!isArchived && (
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  Archive
                </Button>
              )}
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl font-semibold leading-tight">Profile</CardTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
                      Discard changes
                    </Button>
                    <Button
                      type="submit"
                      form="student-form"
                      disabled={isSaving || isArchived}
                    >
                      {isSaving ? 'Saving…' : 'Save changes'}
                    </Button>
                  </>
                ) : (
                  !isArchived && (
                    <Button variant="outline" onClick={handleStartEdit}>
                      Edit
                    </Button>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing && editValues ? (
                <StudentForm
                  mode="edit"
                  defaultValues={editValues}
                  onSubmit={handleSave}
                  isSubmitting={isSaving}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField label="Full name" value={student.fullName} />
                  <ProfileField label="Form level" value={formLevelLabel(student.formLevel)} />
                  <ProfileField
                    label="Graduation year"
                    value={`Class of ${student.graduationYear}`}
                  />
                  <ProfileField label="School student ID" value={student.schoolStudentId} />
                  <ProfileField label="Student email" value={student.studentEmail ?? ''} />
                  <ProfileField label="Student phone" value={student.studentPhone ?? ''} />
                  <ProfileField label="Parent/guardian email" value={student.parentEmail ?? ''} />
                  <ProfileField label="Parent/guardian phone" value={student.parentPhone ?? ''} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-8">
            <AcademicResultsSection studentId={student.id} />
            <ActivitiesSection studentId={student.id} />
            {/* Awards and WorkExperience sections added in Plan 03-02 */}
            {/* CareerGoals and Notes sections added in Plan 03-03 */}
          </div>

          <ArchiveStudentDialog
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            studentId={student.id}
            fullName={student.fullName}
          />
        </>
      )}
    </AppShell>
  );
}
