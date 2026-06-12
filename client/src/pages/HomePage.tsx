import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserInfo } from '@/App';
import { AppShell } from '@/components/layout/AppShell';

interface HomePageProps {
  userInfo: UserInfo | null;
}

export function HomePage({ userInfo }: HomePageProps) {
  return (
    <AppShell userInfo={userInfo} activeNav="home">
      {userInfo === null ? (
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Welcome, {userInfo.displayName}</h1>
          <Badge variant={userInfo.role === 'ADMIN' ? 'default' : 'secondary'}>
            {userInfo.role === 'ADMIN' ? 'Admin' : 'Staff'}
          </Badge>
        </div>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        Student records and transcript management will appear here in Phase 2.
      </p>
    </AppShell>
  );
}
