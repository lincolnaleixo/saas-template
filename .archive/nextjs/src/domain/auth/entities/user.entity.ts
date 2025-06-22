import { Email } from '../value-objects/email.vo';

/**
 * User Entity
 * Core user domain entity with business rules
 */
export class User {
  constructor(
    private readonly id: string,
    private email: Email,
    private name: string,
    private avatarUrl: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static create(params: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }): User {
    const email = new Email(params.email);
    const now = new Date();

    return new User(
      params.id,
      email,
      params.name,
      params.avatarUrl || null,
      now,
      now
    );
  }

  static fromPersistence(params: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      params.id,
      new Email(params.email),
      params.name,
      params.avatarUrl,
      params.createdAt,
      params.updatedAt
    );
  }

  // Business methods
  changeEmail(newEmail: Email): void {
    this.email = newEmail;
    this.updatedAt = new Date();
  }

  changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }
    this.name = newName;
    this.updatedAt = new Date();
  }

  changeAvatarUrl(newAvatarUrl: string | null): void {
    this.avatarUrl = newAvatarUrl;
    this.updatedAt = new Date();
  }

  // Getters
  getId(): string { return this.id; }
  getEmail(): string { return this.email.getValue(); }
  getName(): string { return this.name; }
  getAvatarUrl(): string | null { return this.avatarUrl; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }
}