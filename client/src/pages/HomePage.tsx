import { useMsal } from '@azure/msal-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserInfo {
  displayName: string;
  role: string;
}

interface HomePageProps {
  userInfo?: UserInfo;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function HomePage({ userInfo }: HomePageProps) {
  const { instance } = useMsal();
  const displayName = userInfo?.displayName ?? 'Loading…';
  const role = userInfo?.role ?? null;

  function handleSignOut() {
    instance.logoutRedirect();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold">SPCS Transcripts</span>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/students"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-disabled="true"
                tabIndex={-1}
                onClick={(e) => e.preventDefault()}
              >
                Students
              </Link>
              {role === 'ADMIN' && (
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
                    {displayName === 'Loading…' ? '…' : getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{displayName}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                {role === 'ADMIN' ? (
                  <Badge variant="default">Admin</Badge>
                ) : role === 'STAFF' ? (
                  <Badge variant="secondary">Staff</Badge>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Welcome, {displayName}</h1>
          {role === 'ADMIN' && <Badge variant="default">Admin</Badge>}
          {role === 'STAFF' && <Badge variant="secondary">Staff</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Student records and transcript management will appear here in Phase 2.
        </p>
      </main>
    </div>
  );
}
