export type LoginClaims = {
  preferred_username?: string
  upn?: string
  email?: string
  name?: string
}

/**
 * Placeholder for pre-login hook logic in future phases.
 * User resolution and upsert logic lives in resolveUser middleware (auth.ts).
 */
export async function upsertUserOnLogin(_claims: LoginClaims): Promise<void> {
  // reserved for Phase 2+ pre-login hooks
}
