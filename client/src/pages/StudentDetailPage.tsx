import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { UserInfo } from '@/App';
import { AppShell } from '@/components/layout/AppShell';

interface StudentDetailPageProps {
  userInfo: UserInfo | null;
}

export function StudentDetailPage({ userInfo }: StudentDetailPageProps) {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <h1 className="text-2xl font-semibold">Student profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Full student detail view is coming in a later update. Record ID: {id}
      </p>
    </AppShell>
  );
}
