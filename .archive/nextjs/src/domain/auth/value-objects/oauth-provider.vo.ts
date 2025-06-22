/**
 * OAuth Provider Value Object
 * Represents supported OAuth providers
 */
export class OAuthProvider {
  private static readonly VALID_PROVIDERS = ['google', 'github'];
  
  static readonly GOOGLE = new OAuthProvider('google');
  static readonly GITHUB = new OAuthProvider('github');
  // Add more providers as needed

  private constructor(private readonly value: string) {
    if (!OAuthProvider.VALID_PROVIDERS.includes(value)) {
      throw new Error(`Invalid OAuth provider: ${value}`);
    }
  }

  static fromString(provider: string): OAuthProvider {
    const normalized = provider.toLowerCase();
    
    switch (normalized) {
      case 'google':
        return OAuthProvider.GOOGLE;
      case 'github':
        return OAuthProvider.GITHUB;
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OAuthProvider): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}