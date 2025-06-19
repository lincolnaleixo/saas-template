import { Suspense } from 'react';
import { UserList } from '@users/components/UserList';
import { LoadingSpinner } from '@/components/common/loading-spinner';

export default function UsersPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Users</h1>
      
      <Suspense fallback={<LoadingSpinner />}>
        <UserList />
      </Suspense>
    </div>
  );
}