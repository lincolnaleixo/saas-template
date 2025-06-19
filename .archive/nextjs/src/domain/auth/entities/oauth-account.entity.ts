/**
 * OAuth Account Entity
 * Represents a linked OAuth account for a user
 */
export class OAuthAccount {
  constructor(
    private readonly providerId: string,
    private readonly providerUserId: string,
    private readonly userId: string
  ) {}

  static create(params: {
    userId: string;
    provider: string;
    providerAccountId: string;
  }): OAuthAccount {
    return new OAuthAccount(
      params.provider,
      params.providerAccountId,
      params.userId
    );
  }

  // Getters
  getProviderId(): string { return this.providerId; }
  getProviderUserId(): string { return this.providerUserId; }
  getUserId(): string { return this.userId; }
}