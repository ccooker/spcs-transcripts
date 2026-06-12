import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiPost } from '@/api/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  StudentForm,
  type CreateStudentFormValues,
} from '@/components/students/StudentForm';

interface StudentNewPageProps {
  userInfo: UserInfo | null;
}

type CreatedStudent = {
  id: string;
  fullName: string;
  formLevel: string;
  graduationYear: number;
  schoolStudentId: string;
  transcriptStatus: string;
};

export function StudentNewPage({ userInfo }: StudentNewPageProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolStudentIdError, setSchoolStudentIdError] = useState<string | null>(null);

  async function handleSubmit(values: CreateStudentFormValues) {
    setIsSubmitting(true);
    setSchoolStudentIdError(null);

    try {
      const student = await apiPost<CreatedStudent>('/students', values);
      toast.success('Student created');
      navigate(`/students/${student.id}`);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        const message = 'A student with this ID already exists.';
        toast.error(message);
        setSchoolStudentIdError(message);
        return;
      }
      toast.error('Could not create student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <h1 className="text-2xl font-semibold mb-6">Add student</h1>

      <StudentForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        schoolStudentIdError={schoolStudentIdError}
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link to="/students">Back without saving</Link>
        </Button>
        <Button type="submit" form="student-form" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create student'}
        </Button>
      </div>
    </AppShell>
  );
}
