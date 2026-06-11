import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance } from '../auth/msalConfig';

// Must match the scope registered under "Expose an API" in the Entra ID app
// registration — Pitfall 2 prevention: Graph tokens have a different audience
// and will be rejected with 401 by Express.
const API_SCOPE = `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const account = msalInstance.getActiveAccount();
  if (!account) {
    throw new Error('No active account — user must sign in first');
  }

  let tokenResponse;
  try {
    tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: [API_SCOPE],
      account,
    });
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Consent expired or MFA challenge — redirect triggers a full re-auth
      await msalInstance.acquireTokenRedirect({ scopes: [API_SCOPE] });
      return new Response(null, { status: 0 }); // unreachable; page redirects
    }
    throw err;
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${tokenResponse.accessToken}`);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`/api${path}`, { ...options, headers });
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = new Error(`API ${res.status}: ${path}`) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}
