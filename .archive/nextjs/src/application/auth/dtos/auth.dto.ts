import { z } from 'zod';

// Input DTOs
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;

// Output DTOs
export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  user: UserDto;
  sessionId: string;
}