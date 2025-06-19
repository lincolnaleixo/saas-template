import { hash, verify } from '@node-rs/argon2';

/**
 * Password Value Object
 * Handles password hashing and verification
 */
export class Password {
  private constructor(private readonly hashedValue: string) {}

  static async create(plainPassword: string): Promise<Password> {
    if (plainPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const hashedPassword = await hash(plainPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    return new Password(hashedPassword);
  }

  static fromHash(hashedPassword: string): Password {
    return new Password(hashedPassword);
  }

  async verify(plainPassword: string): Promise<boolean> {
    return verify(this.hashedValue, plainPassword);
  }

  getHashedValue(): string {
    return this.hashedValue;
  }
}