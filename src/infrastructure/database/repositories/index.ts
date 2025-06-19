import { DrizzleUserRepository } from './user.repository.impl';

// Export singleton instances
export const userRepository = new DrizzleUserRepository();

// Export for dependency injection if needed
export { DrizzleUserRepository };