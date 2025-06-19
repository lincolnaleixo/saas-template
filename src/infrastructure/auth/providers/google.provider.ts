import { Google, generateCodeVerifier } from 'arctic';
import { OAuthUserInfo } from '@application/auth/dtos/oauth.dto';

/**
 * Google OAuth Provider
 * Handles Google OAuth authentication flow
 */
export class GoogleOAuthProvider {
  private google: Google;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth configuration');
    }

    this.google = new Google(clientId, clientSecret, redirectUri);
  }

  /**
   * Create authorization URL for Google sign-in
   */
  async createAuthorizationURL(state: string, codeVerifier: string): Promise<URL> {
    const url = await this.google.createAuthorizationURL(
      state,
      codeVerifier,
      ['profile', 'email']
    );
    
    // Request refresh token
    url.searchParams.set('access_type', 'offline');
    
    return url;
  }

  /**
   * Exchange authorization code for tokens
   */
  async validateAuthorizationCode(code: string, codeVerifier: string) {
    const tokens = await this.google.validateAuthorizationCode(code, codeVerifier);
    return tokens;
  }

  /**
   * Fetch user info from Google
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.verified_email,
    };
  }
}