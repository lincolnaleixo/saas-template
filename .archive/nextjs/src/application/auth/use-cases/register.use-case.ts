import { User } from '@domain/auth/entities/user.entity';
import { UserRepository } from '@domain/auth/repositories/user.repository';
import { RegisterInput, UserDto } from '../dtos/auth.dto';
import { UserMapper } from '../mappers/user.mapper';

/**
 * Register Use Case
 * Handles user registration business logic
 */
export class RegisterUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: RegisterInput): Promise<UserDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.exists(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = await User.create({
      email: input.email,
      password: input.password,
      name: input.name,
    });

    // Save to repository
    await this.userRepository.save(user);

    // Return DTO
    return UserMapper.toDto(user);
  }
}