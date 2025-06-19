import { User } from '@domain/auth/entities/user.entity';
import { OAuthAccount } from '@domain/auth/entities/oauth-account.entity';
import { Email } from '@domain/auth/value-objects/email.vo';
import { UserRepository } from '@domain/auth/repositories/user.repository';
import { OAuthAccountRepository } from '@domain/auth/repositories/oauth-account.repository';
import { OAuthUserInfo, OAuthSignInResponse } from '../dtos/oauth.dto';
import { UserMapper } from '../mappers/user.mapper';

/**
 * OAuth Sign-In Use Case
 * Handles user authentication via OAuth providers
 */
export class OAuthSignInUseCase {
  constructor(
    private userRepository: UserRepository,
    private oauthAccountRepository: OAuthAccountRepository,
    private sessionService: { create: (userId: string) => Promise<string> }
  ) {}

  async execute(provider: string, userInfo: OAuthUserInfo): Promise<OAuthSignInResponse> {
    let isNewUser = false;

    // Check if OAuth account exists
    const existingAccount = await this.oauthAccountRepository.findByProviderAndAccountId(
      provider,
      userInfo.id
    );

    let user: User;

    if (existingAccount) {
      // Existing OAuth account - find the user
      const existingUser = await this.userRepository.findById(existingAccount.getUserId());
      if (!existingUser) {
        throw new Error('User not found for OAuth account');
      }
      user = existingUser;
    } else {
      // New OAuth account - check if user exists with this email
      const emailVO = new Email(userInfo.email);
      const existingUser = await this.userRepository.findByEmail(emailVO);

      if (existingUser) {
        // User exists - link OAuth account
        user = existingUser;
      } else {
        // Create new user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        user = User.create({
          id: userId,
          email: userInfo.email,
          name: userInfo.name,
          avatarUrl: userInfo.picture || null,
        });
        await this.userRepository.save(user);
        isNewUser = true;
      }

      // Create OAuth account link
      const oauthAccount = OAuthAccount.create({
        userId: user.getId(),
        provider,
        providerAccountId: userInfo.id,
      });
      await this.oauthAccountRepository.save(oauthAccount);
    }

    // Create session
    const sessionId = await this.sessionService.create(user.getId());

    return {
      user: UserMapper.toDto(user),
      sessionId,
      isNewUser,
    };
  }
}