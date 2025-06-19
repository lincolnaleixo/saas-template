import { User } from '@domain/auth/entities/user.entity';
import { UserDto } from '../dtos/auth.dto';

/**
 * User Mapper
 * Maps between domain entities and DTOs
 */
export class UserMapper {
  static toDto(user: User): UserDto {
    return {
      id: user.getId(),
      email: user.getEmail(),
      name: user.getName(),
      isEmailVerified: user.getIsEmailVerified(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  static toPersistence(user: User) {
    return {
      id: user.getId(),
      email: user.getEmail(),
      passwordHash: user.getPasswordHash(),
      name: user.getName(),
      isEmailVerified: user.getIsEmailVerified(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }
}