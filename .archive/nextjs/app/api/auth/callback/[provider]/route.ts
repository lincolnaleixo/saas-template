import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleOAuthProvider } from '@infrastructure/auth/providers/google.provider';
import { OAuthSignInUseCase } from '@application/auth/use-cases/oauth-sign-in.use-case';
import { userRepository, oauthAccountRepository } from '@infrastructure/database/repositories';
import { lucia } from '@infrastructure/auth/lucia';

/**
 * GET /api/auth/callback/[provider]
 * Handles OAuth callback from provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/login?error=missing_params', request.url)
    );
  }

  // Verify state for CSRF protection
  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
  
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_state', request.url)
    );
  }
  
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code_verifier', request.url)
    );
  }

  // Clear OAuth cookies
  cookieStore.delete('oauth_state');
  cookieStore.delete('oauth_code_verifier');

  try {
    if (provider !== 'google') {
      throw new Error('Unsupported provider');
    }

    // Exchange code for tokens
    const googleProvider = new GoogleOAuthProvider();
    const tokens = await googleProvider.validateAuthorizationCode(code, codeVerifier);
    
    // Get user info from Google
    const accessToken = tokens.accessToken();
    const userInfo = await googleProvider.getUserInfo(accessToken);

    // Sign in or sign up the user
    const sessionService = {
      create: async (userId: string) => {
        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
        return session.id;
      },
    };

    const signInUseCase = new OAuthSignInUseCase(
      userRepository,
      oauthAccountRepository,
      sessionService
    );

    const result = await signInUseCase.execute(provider, userInfo);

    // Redirect to dashboard or onboarding
    const redirectUrl = result.isNewUser 
      ? '/onboarding' 
      : '/dashboard';

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', request.url)
    );
  }
}