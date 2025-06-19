import { db } from '@/lib/drizzle';
import { users } from '../drizzle/schema/auth.schema';
import { eq } from 'drizzle-orm';
import { UserRepository } from '@domain/auth/repositories/user.repository';
import { User } from '@domain/auth/entities/user.entity';
import { Email } from '@domain/auth/value-objects/email.vo';

export class UserRepositoryImpl implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result || result.length === 0) return null;
    
    const [user] = result;

    return new User(
      user.id,
      new Email(user.email),
      user.name,
      user.avatarUrl,
      user.createdAt,
      user.updatedAt
    );
  }

  async findByEmail(email: Email): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.getValue()))
      .limit(1);

    if (!result || result.length === 0) return null;
    
    const [user] = result;

    return new User(
      user.id,
      new Email(user.email),
      user.name,
      user.avatarUrl,
      user.createdAt,
      user.updatedAt
    );
  }

  async save(user: User): Promise<void> {
    await db.insert(users)
      .values({
        id: user.getId(),
        email: user.getEmail(),
        name: user.getName(),
        avatarUrl: user.getAvatarUrl(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.getEmail(),
          name: user.getName(),
          avatarUrl: user.getAvatarUrl(),
          updatedAt: user.getUpdatedAt()
        }
      });
  }
}