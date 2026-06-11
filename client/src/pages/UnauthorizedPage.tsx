import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <h1 className="text-xl font-semibold text-center">
        You don't have permission to access this page.
      </h1>
      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link to="/">← Go to home</Link>
        </Button>
      </div>
    </div>
  );
}
