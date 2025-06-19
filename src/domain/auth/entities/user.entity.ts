import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';

/**
 * User Entity
 * Core user domain entity with business rules
 */
export class User {
  private constructor(
    private readonly id: string,
    private email: Email,
    private password: Password,
    private name: string,
    private isEmailVerified: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static async create(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    const id = crypto.randomUUID();
    const email = new Email(params.email);
    const password = await Password.create(params.password);
    const now = new Date();

    return new User(
      id,
      email,
      password,
      params.name,
      false, // Email not verified by default
      now,
      now
    );
  }

  static fromPersistence(params: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      params.id,
      new Email(params.email),
      Password.fromHash(params.passwordHash),
      params.name,
      params.isEmailVerified,
      params.createdAt,
      params.updatedAt
    );
  }

  // Business methods
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return this.password.verify(plainPassword);
  }

  changeEmail(newEmail: Email): void {
    this.email = newEmail;
    this.isEmailVerified = false; // Reset verification on email change
    this.updatedAt = new Date();
  }

  async changePassword(newPassword: string): Promise<void> {
    this.password = await Password.create(newPassword);
    this.updatedAt = new Date();
  }

  verifyEmail(): void {
    this.isEmailVerified = true;
    this.updatedAt = new Date();
  }

  // Getters
  getId(): string { return this.id; }
  getEmail(): string { return this.email.getValue(); }
  getName(): string { return this.name; }
  getPasswordHash(): string { return this.password.getHashedValue(); }
  getIsEmailVerified(): boolean { return this.isEmailVerified; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }
}