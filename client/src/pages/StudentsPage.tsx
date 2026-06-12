import { Link } from 'react-router-dom';
import type { UserInfo } from '@/App';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';

interface StudentsPageProps {
  userInfo: UserInfo | null;
}

export function StudentsPage({ userInfo }: StudentsPageProps) {
  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Button asChild>
          <Link to="/students/new">Add student</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Student list and search will appear here in a later update. Use Add student to create a
        profile now.
      </p>
    </AppShell>
  );
}
