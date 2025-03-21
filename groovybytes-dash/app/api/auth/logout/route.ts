import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { cookies } from 'next/headers';
import { LOGOUT_ENDPOINT } from '@/lib/auth/config';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');

    // In a web app you would send the URL to the client (which can then redirect the browser)
    return NextResponse.redirect(LOGOUT_ENDPOINT);
  } catch (error) {
    console.error('Error in auth/init:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
