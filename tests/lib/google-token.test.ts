import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleCredentialsRevokedError,
  GoogleRefreshTransientError,
  refreshGoogleAccessToken,
} from "@/lib/google-token";

const account = {
  provider: "google",
  providerAccountId: "g-1",
  refresh_token: "refresh-1",
};

function http(status: number, body: unknown, jsonThrows = false) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jsonThrows
      ? () => Promise.reject(new Error("not json"))
      : () => Promise.resolve(body),
  };
}

describe("refreshGoogleAccessToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a blank refresh token without calling Google", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      refreshGoogleAccessToken({ ...account, refresh_token: "  " })
    ).rejects.toBeInstanceOf(GoogleCredentialsRevokedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats invalid_grant as revoked credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(http(400, { error: "invalid_grant" })));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleCredentialsRevokedError
    );
  });

  it("treats other 401 bodies as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(http(401, { error: "invalid_client" })));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleRefreshTransientError
    );
  });

  it("treats a non-JSON error body as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(http(401, null, true)));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleRefreshTransientError
    );
  });

  it("treats 429 and 500 as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(http(429, { error: "rate_limit" })));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleRefreshTransientError
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(http(503, { error: { code: 503 } })));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleRefreshTransientError
    );
  });

  it("treats a network failure as transient", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(refreshGoogleAccessToken(account)).rejects.toBeInstanceOf(
      GoogleRefreshTransientError
    );
  });

  it("returns the new access token on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(http(200, { access_token: "tok-new", expires_in: 3600 }))
    );
    await expect(refreshGoogleAccessToken(account)).resolves.toEqual({
      access_token: "tok-new",
      expires_in: 3600,
    });
  });
});
