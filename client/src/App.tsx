import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { StudentsListPage } from '@/pages/StudentsListPage';
import { StudentNewPage } from '@/pages/StudentNewPage';
import { StudentDetailPage } from '@/pages/StudentDetailPage';
import { TranscriptPage } from '@/pages/TranscriptPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiGet, AuthRedirectInProgressError } from '@/api/apiClient';
import { loginRequest } from '@/auth/msalConfig';

const queryClient = new QueryClient();

export type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF';
};

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiGet<UserInfo>('/auth/me')
      .then(setUserInfo)
      .catch((err: unknown) => {
        if (err instanceof AuthRedirectInProgressError) return;
        const status = (err as { status?: number }).status;
        if (status === 401) {
          setAuthError('session-expired');
        }
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (authError !== 'session-expired') return;
    const timer = setTimeout(() => {
      instance.loginRedirect(loginRequest);
    }, 3000);
    return () => clearTimeout(timer);
  }, [authError, instance]);

  if (authError === 'session-expired') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>
            Session expired. Redirecting to sign-in…
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
    <Routes>
      <Route
        path="/"
        element={
          <>
            <UnauthenticatedTemplate>
              <LoginPage />
            </UnauthenticatedTemplate>
            <AuthenticatedTemplate>
              <Navigate to="/home" replace />
            </AuthenticatedTemplate>
          </>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage userInfo={userInfo} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <StudentsListPage userInfo={userInfo} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/new"
        element={
          <ProtectedRoute>
            <StudentNewPage userInfo={userInfo} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute>
            <StudentDetailPage userInfo={userInfo} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id/transcript"
        element={
          <ProtectedRoute>
            <TranscriptPage userInfo={userInfo} />
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
    </Routes>
    </QueryClientProvider>
  );
}

export default App;
