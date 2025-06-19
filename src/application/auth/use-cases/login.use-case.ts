import { UserRepository } from '@domain/auth/repositories/user.repository';
import { LoginInput, AuthResponseDto } from '../dtos/auth.dto';
import { UserMapper } from '../mappers/user.mapper';

/**
 * Login Use Case
 * Handles user authentication
 */
export class LoginUseCase {
  constructor(
    private userRepository: UserRepository,
    private sessionService: { create: (userId: string) => Promise<string> }
  ) {}

  async execute(input: LoginInput): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(input.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const sessionId = await this.sessionService.create(user.getId());

    // Return auth response
    return {
      user: UserMapper.toDto(user),
      sessionId,
    };
  }
}