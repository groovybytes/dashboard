import type { AuthorizationUrlRequest } from '@azure/msal-node';
import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { 
  KV_CHALLENGE_KEY, KV_CHALLENGE_METHOD_KEY, KV_VERIFIER_KEY, 
  MSAL_CONFIG, MSAL_SCOPES, REDIRECT_URI, 
  RESET_PASSWORD_POLICY_AUTHORITY, SIGN_UP_SIGN_IN_POLICY_AUTHORITY, EDIT_PROFILE_POLICY_AUTHORITY, 
} from '@/lib/auth/config';
import { 
  ConfidentialClientApplication, 
  CryptoProvider, 
} from '@azure/msal-node';

import { generateRandomHex } from '@/lib/auth/utils';
import { createToken } from '@/lib/auth/token';
import { kv } from '@/lib/kv';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const referer = req?.headers?.get("referer")!;
  const { slug } = await params;
  console.log({
    referer,
    slug,
  })

  try {
    // Instantiate your ConfidentialClientApplication
    const clientApplication = new ConfidentialClientApplication(MSAL_CONFIG);
    const cryptoProvider = new CryptoProvider();

    let authority: string | undefined;
    switch (slug) {
      case "login":
        authority = SIGN_UP_SIGN_IN_POLICY_AUTHORITY;
        break;
      case "password":
        authority = RESET_PASSWORD_POLICY_AUTHORITY;
        break;
      case "profile":
        authority = EDIT_PROFILE_POLICY_AUTHORITY;
        break;
    }

    // Generate PKCE codes and a random state value
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    // Create a secure token that encapsulates both a random state (for CSRF) and the authority.
    const state = await createToken({
      state: generateRandomHex(32),
      authority: authority!,
      referer
    });

    // Save these values to your key–value store (you can replace kv with your own persistence mechanism)
    await kv.set([state, ...KV_VERIFIER_KEY], verifier);
    await kv.set([state, ...KV_CHALLENGE_KEY], challenge);
    await kv.set([state, ...KV_CHALLENGE_METHOD_KEY], 'S256');

    console.log({
      state,
      KV_VERIFIER_KEY,
      KV_CHALLENGE_KEY,
      KV_CHALLENGE_METHOD_KEY,
    })

    // Prepare the parameters for the auth code URL request
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      redirectUri: REDIRECT_URI,
      scopes: MSAL_SCOPES,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      authority,
      state,
    };

    // Get the auth URL from MSAL
    const authCodeUrl = await clientApplication.getAuthCodeUrl(authCodeUrlParameters);

    console.log({
      authCodeUrl
    })

    // In a web app you would send the URL to the client (which can then redirect the browser)
    return NextResponse.redirect(authCodeUrl);
  } catch (error) {
    console.error(`Error in auth/${slug}:`, error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
