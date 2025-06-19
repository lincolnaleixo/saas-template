import { redirect } from 'next/navigation';
import { validateRequest } from '@auth/server/auth.service';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();
  
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}