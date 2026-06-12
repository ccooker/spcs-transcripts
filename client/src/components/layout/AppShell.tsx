import { useMsal } from '@azure/msal-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserInfo } from '@/App';
import { cn } from '@/lib/utils';

interface AppShellProps {
  userInfo: UserInfo | null;
  activeNav?: 'home' | 'students';
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function navLinkClass(isActive: boolean): string {
  return cn(
    'text-sm transition-colors',
    isActive
      ? 'font-semibold text-foreground border-b-2 border-primary pb-0.5'
      : 'text-muted-foreground hover:text-foreground',
  );
}

export function AppShell({ userInfo, activeNav = 'home', children }: AppShellProps) {
  const { instance } = useMsal();

  function handleSignOut() {
    instance.logoutRedirect();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/home" className="text-base font-semibold">SPCS Transcripts</Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/students" className={navLinkClass(activeNav === 'students')}>
                Students
              </Link>
              {userInfo?.role === 'ADMIN' && (
                <Link
                  to="/settings"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-disabled="true"
                  tabIndex={-1}
                  onClick={(e) => e.preventDefault()}
                >
                  Settings
                </Link>
              )}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar>
                  <AvatarFallback>
                    {userInfo ? getInitials(userInfo.displayName) : '…'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                {userInfo ? (
                  <p className="text-sm font-medium">{userInfo.displayName}</p>
                ) : (
                  <Skeleton className="h-4 w-24" />
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                {userInfo?.role === 'ADMIN' && <Badge variant="default">Admin</Badge>}
                {userInfo?.role === 'STAFF' && <Badge variant="secondary">Staff</Badge>}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
