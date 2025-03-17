import { NextResponse } from 'next/server';
import { LOGOUT_ENDPOINT } from '@/lib/auth/config'; // Your MSAL/graph settings

export async function GET() {
  try {
    // In a web app you would send the URL to the client (which can then redirect the browser)
    return NextResponse.redirect(LOGOUT_ENDPOINT);
  } catch (error) {
    console.error('Error in auth/init:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
