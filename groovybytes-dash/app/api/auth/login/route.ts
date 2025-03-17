import { NextResponse } from 'next/server';
import { ConfidentialClientApplication, CryptoProvider, AuthorizationUrlRequest } from '@azure/msal-node';
import { KV_AUTHORIY, KV_CHALLENGE_KEY, KV_CHALLENGE_METHOD_KEY, KV_STATE_KEY, KV_VERIFIER_KEY, MSAL_CONFIG, MSAL_SCOPES, REDIRECT_URI, SIGN_UP_SIGN_IN_POLICY_AUTHORITY } from '@/lib/auth/config'; // Your MSAL/graph settings
import { generateRandomHex } from '@/lib/auth/utils';
import { kv } from '@/lib/kv';

export async function GET() {
  try {
    // Instantiate your ConfidentialClientApplication
    const clientApplication = new ConfidentialClientApplication(MSAL_CONFIG);
    const cryptoProvider = new CryptoProvider();

    // Generate PKCE codes and a random state value
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();
    const state = generateRandomHex(32);

    // Save these values to your key–value store (you can replace kv with your own persistence mechanism)
    await kv.set(KV_VERIFIER_KEY, verifier);
    await kv.set(KV_CHALLENGE_KEY, challenge);
    await kv.set(KV_CHALLENGE_METHOD_KEY, 'S256');
    await kv.set(KV_STATE_KEY, state);
    await kv.set(KV_AUTHORIY, SIGN_UP_SIGN_IN_POLICY_AUTHORITY);

    // Prepare the parameters for the auth code URL request
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      redirectUri: REDIRECT_URI,
      scopes: MSAL_SCOPES,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      authority: SIGN_UP_SIGN_IN_POLICY_AUTHORITY,
      state,
    };

    // Get the auth URL from MSAL
    const authCodeUrl = await clientApplication.getAuthCodeUrl(authCodeUrlParameters);

    // In a web app you would send the URL to the client (which can then redirect the browser)
    return NextResponse.redirect(authCodeUrl);
  } catch (error) {
    console.error('Error in auth/init:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
