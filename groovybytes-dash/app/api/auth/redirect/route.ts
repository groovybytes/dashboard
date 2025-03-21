// app/api/auth/redirect/route.ts
import type { AuthorizationCodeRequest, AuthenticationResult } from '@azure/msal-node';
import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { 
  KV_VERIFIER_KEY, 
  MSAL_CONFIG, MSAL_SCOPES, REDIRECT_URI, 
  RESET_PASSWORD_POLICY_AUTHORITY, SIGN_UP_SIGN_IN_POLICY_AUTHORITY, EDIT_PROFILE_POLICY_AUTHORITY, 
} from '@/lib/auth/config';
import { ConfidentialClientApplication } from '@azure/msal-node';

import { verifyToken } from '@/lib/auth/token';
import { DEFAULT_MAX_AGE, generateJWE } from '@/lib/auth/jwt';
import { kv } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const clientInfo = searchParams.get('client_info') ?? undefined;

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state in query parameters.' }, { status: 400 });
    }

    /**
     * With this new approach, the state token encapsulates both the random CSRF value and the user's intended authority.
     * This binding strengthens security because the token cannot be tampered with without detection.
     * The external KV store is used solely for the per-token secret (used in the encryption/signing process),
     * and not for holding a separate plain state value.
     */
    /**
     * The `state` parameter helps prevent CSRF (Cross-Site Request Forgery) attacks by ensuring that the 
     * authorization response matches the initial request. Here’s a visual example of how it works:
     * 
     * 1. Client Sends a Request to the Authorization Server:
     *    - The client application generates a unique `state` value.
     *    - The client includes this `state` value in the authorization request.
     *    ```ts
     *    const state = 'unique-random-state-value';
     *    const authCodeUrlParameters = generateAuthCodeUrlParameters(config, _challenge, _challengeMethod, state);
     *    ```
     *    - The client redirects the user to the authorization server with the following URL:
     *    ```
     *    https://auth.server.com/authorize?
     *      response_type=code&
     *      client_id=your-client-id&
     *      redirect_uri=your-redirect-uri&
     *      state=unique-random-state-value&
     *      code_challenge=generated-code-challenge&
     *      code_challenge_method=S256&
     *      access_type=offline&
     *      include_granted_scopes=true
     *    ```
     *
     * 2. User Authorizes the Application:
     *    - The user logs in and authorizes the application on the authorization server.
     *
     * 3. Authorization Server Sends a Response:
     *    - The authorization server redirects the user back to the client application with an authorization code and the same `state` value:
     *    ```
     *    https://your-redirect-uri?
     *      code=authorization-code&
     *      state=unique-random-state-value
     *    ```
     *
     * 4. Client Validates the Response:
     *    - The client application receives the response and checks if the `state` value matches the one it initially sent:
     *    ```ts
     *    const receivedState = 'unique-random-state-value'; // This would come from the query parameters of the redirect URI
     *
     *    if (receivedState === state) {
     *      // State matches, process the authorization code
     *      console.log('State matches, proceed with authorization code');
     *    } else {
     *      // State does not match, possible CSRF attack
     *      console.log('State does not match, possible CSRF attack');
     *    }
     *    ```
     *
     * This mechanism ensures that the response received by the client is tied to its original request, 
     * making it difficult for attackers to perform unauthorized actions on behalf of the user.
     */
    // Verify the state token (JWT) and catch any verification errors.
    // Instead of retrieving a stored random hex state, verify the state token directly.
    // The token's integrity and authenticity are ensured via cryptographic signing and encryption.
    let verifiedStatePayload: { state?: string, authority?: string, referer?: string } = {};
    try {
      verifiedStatePayload = await verifyToken(state);
      console.log("Verified state payload:", verifiedStatePayload);
    } catch (error) {
      console.error("State token verification failed:", error);
      return NextResponse.json(
        { error: 'State token verification failed.' },
        { status: 403 }
      );
    }

    // Verify authority
    const authority = verifiedStatePayload.authority;
    if (!authority) {
      return NextResponse.json(
        { error: 'Authority not found in state token.' },
        { status: 400 }
      );
    }

    // Retrieve the PKCE code verifier from KV storage using the token as part of the key.
    const codeVerifierRes = await kv.get<string>([state, ...KV_VERIFIER_KEY]);
    const codeVerifier = codeVerifierRes.value;
    if (!codeVerifier) {
      return NextResponse.json({ error: 'Couldn\'t find code verifier.' }, { status: 400 });
    }

    // Prepare token request
    const tokenRequest: AuthorizationCodeRequest = {
      redirectUri: REDIRECT_URI,
      scopes: MSAL_SCOPES,
      code,
      codeVerifier,
      clientInfo,
    };

    // You might set cookies or do additional processing here.
    const expiresAt = new Date(Date.now() + (DEFAULT_MAX_AGE * 1000));
    const clientApplication = new ConfidentialClientApplication(MSAL_CONFIG);
    const referer = verifiedStatePayload.referer ?? "/";

    let sessionPayload: { user: AuthenticationResult['account'], idToken: AuthenticationResult['idToken'] };
    let authResult: AuthenticationResult;
    let response: NextResponse;

    // Process the request based on the authority value.
    switch (authority) {
      case SIGN_UP_SIGN_IN_POLICY_AUTHORITY: {
        console.log('Processing SIGN_UP_SIGN_IN authority');

        // Use the authority value (from the state token) to decide how to process the request.
        authResult = await clientApplication.acquireTokenByCode(tokenRequest);

        // Create a session object to store in a cookie.
        sessionPayload = {
          user: authResult.account,
          idToken: authResult.idToken
        };

        // Encrypt the session payload using your JWE utility.
        const encryptedSession = await generateJWE(sessionPayload);
        response = NextResponse.redirect(referer);
        response.cookies.set('session', encryptedSession, {
          httpOnly: true,
          secure: true,
          expires: expiresAt,
          sameSite: 'lax',
          path: '/'
        });

        return response;
      }

      case RESET_PASSWORD_POLICY_AUTHORITY: {
        console.log('Processing PASSWORD_RESET authority');

        // If there's an error query param, check if it indicates the user cancelled the password reset.
        if (searchParams.has('error')) {
          const errorDescription = searchParams.get('error_description') || '';
          if (errorDescription.includes('AADB2C90091')) {
            console.log('User cancelled password reset');

            // Optionally, set a cookie or flash message indicating the cancellation.
            const url = new URL(referer, request.nextUrl);
            url.searchParams.set("message", 'User has cancelled the operation')
            response = NextResponse.redirect(url);
            return response;
          }
        }

        // Otherwise, continue with password reset token acquisition.
        authResult = await clientApplication.acquireTokenByCode(tokenRequest);
        sessionPayload = {
          user: authResult.account,
          idToken: authResult.idToken
        };

        const encryptedSession = await generateJWE(sessionPayload);
        response = NextResponse.redirect(referer);
        response.cookies.set('session', encryptedSession, {
          httpOnly: true,
          secure: true,
          expires: expiresAt,
          sameSite: 'lax',
          path: '/'
        });
        return response;
      }

      case EDIT_PROFILE_POLICY_AUTHORITY: {
        console.log('Processing EDIT_PROFILE authority');

        // For editing profile, clear scopes (as in the example) before token acquisition.
        tokenRequest.scopes = [];

        authResult = await clientApplication.acquireTokenByCode(tokenRequest);
        sessionPayload = {
          user: authResult.account,
          idToken: authResult.idToken
        };

        const encryptedSession = await generateJWE(sessionPayload);
        const response = NextResponse.redirect(referer);
        response.cookies.set('session', encryptedSession, {
          httpOnly: true,
          secure: true,
          expires: expiresAt,
          sameSite: 'lax',
          path: '/'
        });

        return response;
      }

      default: {
        console.error('Unrecognized authority:', authority);
        return NextResponse.json(
          { error: 'Unrecognized authority in state token.' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in auth/redirect:', error);
    return NextResponse.json(
      { error: 'Failed to acquire token.' }, 
      { status: 500 }
    );
  }
}
