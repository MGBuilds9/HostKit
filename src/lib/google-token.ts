// Shared Google OAuth token refresh helper.
// Used by src/lib/ical-sync.ts (sync path) and the /api/me/calendars route
// (calendar onboarding) so both refresh through the same code path.

export interface RefreshableGoogleAccount {
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
}

export interface GoogleRefreshResult {
  access_token: string;
  expires_in: number;
}

/**
 * Thrown when Google rejects a refresh-token exchange with `invalid_grant`
 * (the user revoked access / the refresh token is dead). Callers must treat
 * this as "credentials are gone — do NOT call the Calendar API with the stored
 * access token" and surface a reconnect prompt.
 */
export class GoogleCredentialsRevokedError extends Error {
  constructor(message = "google_credentials_revoked") {
    super(message);
    this.name = "GoogleCredentialsRevokedError";
  }
}

/**
 * Thrown for transient refresh failures (5xx from Google, network timeout,
 * aborted request). The stored access token may still be valid for a little
 * while — callers should NOT mark the credentials revoked for this. The sync
 * engine logs this as a normal sync error (not an auth/reconnect error).
 */
export class GoogleRefreshTransientError extends Error {
  constructor(message = "google_refresh_transient") {
    super(message);
    this.name = "GoogleRefreshTransientError";
  }
}

async function oauthErrorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/**
 * Exchange an account's refresh_token for a fresh access token.
 * - missing refresh_token                         → GoogleCredentialsRevokedError
 * - error body `invalid_grant`                    → GoogleCredentialsRevokedError
 * - 429 / 5xx / other 4xx / network / timeout     → GoogleRefreshTransientError
 *
 * Only `invalid_grant` means the refresh token is dead. A 401 invalid_client
 * or a 429/5xx is not a reason to tell the user to reconnect.
 */
export async function refreshGoogleAccessToken(
  account: RefreshableGoogleAccount
): Promise<GoogleRefreshResult> {
  if (!account.refresh_token?.trim()) {
    throw new GoogleCredentialsRevokedError();
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new GoogleRefreshTransientError(
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!response.ok) {
    const code = await oauthErrorCode(response);
    if (code === "invalid_grant") {
      throw new GoogleCredentialsRevokedError();
    }
    throw new GoogleRefreshTransientError(
      code ? `google refresh ${code}` : `google refresh http ${response.status}`
    );
  }

  return (await response.json()) as GoogleRefreshResult;
}
