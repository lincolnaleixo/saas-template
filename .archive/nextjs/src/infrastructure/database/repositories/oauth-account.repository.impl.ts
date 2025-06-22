import { db } from '@/lib/drizzle';
import { oauthAccounts } from '../drizzle/schema/auth.schema';
import { and, eq } from 'drizzle-orm';
import { OAuthAccountRepository } from '@domain/auth/repositories/oauth-account.repository';
import { OAuthAccount } from '@domain/auth/entities/oauth-account.entity';

export class OAuthAccountRepositoryImpl implements OAuthAccountRepository {
  async findByProviderAndAccountId(
    providerId: string,
    providerUserId: string
  ): Promise<OAuthAccount | null> {
    const result = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.providerId, providerId),
          eq(oauthAccounts.providerUserId, providerUserId)
        )
      )
      .limit(1);

    if (!result || result.length === 0) return null;
    
    const [row] = result;

    return new OAuthAccount(
      row.providerId,
      row.providerUserId,
      row.userId
    );
  }

  async save(account: OAuthAccount): Promise<void> {
    await db.insert(oauthAccounts)
      .values({
        providerId: account.getProviderId(),
        providerUserId: account.getProviderUserId(),
        userId: account.getUserId()
      })
      .onConflictDoNothing();
  }
}