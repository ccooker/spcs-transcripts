import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance } from '../auth/msalConfig';

// Must match the scope registered under "Expose an API" in the Entra ID app
// registration — Pitfall 2 prevention: Graph tokens have a different audience
// and will be rejected with 401 by Express.
const API_SCOPE = `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`;

export class AuthRedirectInProgressError extends Error {
  constructor() {
    super('Authentication redirect in progress');
    this.name = 'AuthRedirectInProgressError';
  }
}

function getAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const account = getAccount();
  if (!account) {
    throw new Error('No active account — user must sign in first');
  }

  if (!msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(account);
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
      await msalInstance.acquireTokenRedirect({ scopes: [API_SCOPE], account });
      throw new AuthRedirectInProgressError();
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

function apiError(path: string, status: number): Error & { status: number } {
  const err = new Error(`API ${status}: ${path}`) as Error & { status: number };
  err.status = status;
  return err;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw apiError(path, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw apiError(path, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw apiError(path, res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    throw apiError(path, res.status);
  }
}
