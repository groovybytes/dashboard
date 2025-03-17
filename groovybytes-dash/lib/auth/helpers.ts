// lib/authHelpers.ts
import type { ConfidentialClientApplication, SilentFlowRequest, RefreshTokenRequest, AuthenticationResult } from '@azure/msal-node';
import { InteractionRequiredAuthError } from '@azure/msal-node';
import { MSAL_SCOPES } from './config';

/**
 * Refreshes the access token using the provided refresh token.
 */
export async function refreshAccessToken(
  clientApplication: ConfidentialClientApplication,
  refreshToken: string,
  scopes = MSAL_SCOPES
): Promise<AuthenticationResult | null> {
  try {
    const request: RefreshTokenRequest = { refreshToken, scopes };
    return await clientApplication.acquireTokenByRefreshToken(request);
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Attempts to get an access token by first checking the token cache silently,
 * then falling back to a refresh token, and if both fail, returns null.
 */
export async function getToken(
  clientApplication: ConfidentialClientApplication,
  scopes = MSAL_SCOPES
): Promise<AuthenticationResult | null> {
  const accounts = await clientApplication.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      const silentRequest: SilentFlowRequest = {
        account: accounts[0],
        scopes,
      };
      return await clientApplication.acquireTokenSilent(silentRequest);
    } catch (error) {
      console.error('Silent token acquisition failed:', error);
      if (error instanceof InteractionRequiredAuthError) {
        const refreshToken = await refreshAccessToken(
          clientApplication,
          accounts[0].idTokenClaims!.rtid as string,
          scopes
        );
        if (refreshToken) return refreshToken;
      }
    }
  }
  // If no account in cache or refresh fails, return null (or you can trigger a new auth flow)
  return null;
}
