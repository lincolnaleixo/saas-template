// Temporary stub for auth functionality
export const getCurrentUser = async () => {
  return {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    isEmailVerified: true,
  };
};

export const validateRequest = async () => {
  return {
    user: null,
    session: null,
  };
};