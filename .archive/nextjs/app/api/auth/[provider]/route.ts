import { NextRequest, NextResponse } from 'next/server';
import { generateState, generateCodeVerifier } from 'arctic';
import { cookies } from 'next/headers';
import { GoogleOAuthProvider } from '@infrastructure/auth/providers/google.provider';

/**
 * GET /api/auth/[provider]
 * Initiates OAuth flow for the specified provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== 'google') {
    return NextResponse.json(
      { error: 'Unsupported provider' },
      { status: 400 }
    );
  }

  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const googleProvider = new GoogleOAuthProvider();
    const url = await googleProvider.createAuthorizationURL(state, codeVerifier);

    // Store state and code verifier in cookies for CSRF protection and PKCE
    const cookieStore = await cookies();
    
    cookieStore.set('oauth_state', state, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'lax',
    });
    
    cookieStore.set('oauth_code_verifier', codeVerifier, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'lax',
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}