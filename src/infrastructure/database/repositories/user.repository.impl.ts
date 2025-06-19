import { eq } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { users } from '@/server/db/schema';
import { User } from '@domain/auth/entities/user.entity';
import { UserRepository } from '@domain/auth/repositories/user.repository';
import { UserMapper } from '@application/auth/mappers/user.mapper';

/**
 * Drizzle User Repository Implementation
 * Concrete implementation of UserRepository using Drizzle ORM
 */
export class DrizzleUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    
    await db.insert(users)
      .values({
        id: data.id,
        email: data.email,
        password: data.passwordHash,
        name: data.name,
        emailVerified: data.isEmailVerified ? new Date() : null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email,
          password: data.passwordHash,
          name: data.name,
          emailVerified: data.isEmailVerified ? new Date() : null,
          updatedAt: data.updatedAt,
        },
      });
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!result) return null;

    return User.fromPersistence({
      id: result.id,
      email: result.email,
      passwordHash: result.password,
      name: result.name,
      isEmailVerified: !!result.emailVerified,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!result) return null;

    return User.fromPersistence({
      id: result.id,
      email: result.email,
      passwordHash: result.password,
      name: result.name,
      isEmailVerified: !!result.emailVerified,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async exists(email: string): Promise<boolean> {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    return !!result;
  }
}