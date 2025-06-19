import { OAuthAccount } from '../entities/oauth-account.entity';

/**
 * OAuth Account Repository Interface
 * Defines the contract for OAuth account persistence
 */
export interface OAuthAccountRepository {
  save(account: OAuthAccount): Promise<void>;
  findByProviderAndAccountId(provider: string, providerAccountId: string): Promise<OAuthAccount | null>;
  findByUserId(userId: string): Promise<OAuthAccount[]>;
  delete(id: string): Promise<void>;
}