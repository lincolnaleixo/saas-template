import { User } from '../entities/user.entity';

/**
 * User Repository Interface
 * Defines the contract for user persistence
 */
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
}