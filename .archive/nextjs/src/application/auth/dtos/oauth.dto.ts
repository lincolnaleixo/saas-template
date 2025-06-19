import { z } from 'zod';

// OAuth User Info from providers
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
}

// OAuth callback input
export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;

// OAuth sign-in response
export interface OAuthSignInResponse {
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
  sessionId: string;
  isNewUser: boolean;
}