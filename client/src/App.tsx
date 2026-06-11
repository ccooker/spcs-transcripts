import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiGet } from '@/api/apiClient';
import { loginRequest } from '@/auth/msalConfig';

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
        const status = (err as { status?: number }).status;
        if (status === 401 || !status) {
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
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
    </Routes>
  );
}

export default App;
