// app/api/auth/redirect/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ConfidentialClientApplication, AuthorizationCodeRequest, AuthenticationResult } from '@azure/msal-node';
import { kv } from '@/lib/kv';
import { MSAL_CONFIG, MSAL_SCOPES, REDIRECT_URI } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const clientInfo = searchParams.get('client_info') ?? undefined;

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state in query parameters.' }, { status: 400 });
    }

    // Retrieve stored state and PKCE verifier from KV storage
    const storedStateRes = await kv.get<string>(['csrf', 'state']);
    const storedState = storedStateRes.value!;

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
    if (state !== storedState) {
      return NextResponse.json({ error: 'State mismatch error.' }, { status: 403 });
    }

    const codeVerifierRes = await kv.get<string>(['tokens', 'credentials', 'verifier']);
    const codeVerifier = codeVerifierRes.value;
    if (!codeVerifier) {
      return NextResponse.json({ error: 'Missing code verifier.' }, { status: 400 });
    }

    // Prepare token request
    const tokenRequest: AuthorizationCodeRequest = {
      redirectUri: REDIRECT_URI,
      scopes: MSAL_SCOPES,
      code,
      codeVerifier,
      clientInfo,
    };

    const clientApplication = new ConfidentialClientApplication(MSAL_CONFIG);
    const response: AuthenticationResult = await clientApplication.acquireTokenByCode(tokenRequest);

    // You might set cookies or do additional processing here.
    return NextResponse.json({ message: 'Token acquired successfully.', accessToken: response.accessToken });
  } catch (error) {
    console.error('Error in auth/redirect:', error);
    return NextResponse.json({ error: 'Failed to acquire token.' }, { status: 500 });
  }
}
