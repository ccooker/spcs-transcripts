import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/auth/msalConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function MicrosoftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 21 21"
      width="16"
      height="16"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginPage() {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      await instance.loginRedirect(loginRequest);
    } catch {
      setError('Sign-in failed. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center justify-center h-16 w-16 rounded-xl bg-primary text-primary-foreground text-2xl font-bold">
        SPCS
      </div>

      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            SPCS Student Transcript System
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sign in with your school Microsoft account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full min-h-[44px] bg-primary text-primary-foreground gap-2"
          >
            <MicrosoftIcon />
            {isLoading ? 'Signing in…' : 'Sign in with Microsoft'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 max-w-sm w-full">
          <Alert variant="destructive">
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
