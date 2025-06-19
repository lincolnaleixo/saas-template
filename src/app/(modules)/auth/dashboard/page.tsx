import { Suspense } from 'react';
import { DashboardStats } from '@auth/components/DashboardStats';
import { RecentActivity } from '@auth/components/RecentActivity';
import { LoadingSpinner } from '@/components/common/loading-spinner';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSpinner />}>
          <DashboardStats />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}