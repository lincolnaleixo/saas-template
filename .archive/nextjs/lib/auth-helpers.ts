import { validateRequest } from '@/lib/auth';
import { userRepository } from '@infrastructure/database/repositories';
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  const { session } = await validateRequest();
  
  if (!session || !session.userId) {
    return null;
  }

  const user = await userRepository.findById(session.userId);
  
  if (!user) {
    return null;
  }

  return {
    id: user.getId(),
    email: user.getEmail(),
    name: user.getName(),
    isEmailVerified: user.getIsEmailVerified(),
  };
});