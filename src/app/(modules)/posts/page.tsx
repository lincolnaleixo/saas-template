import { Suspense } from 'react';
import { PostList } from '@posts/components/PostList';
import { PostEditor } from '@posts/components/PostEditor.client';
import { LoadingSpinner } from '@/components/common/loading-spinner';

export default function PostsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Posts</h1>
      
      <div className="mb-8">
        <PostEditor />
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <PostList />
      </Suspense>
    </div>
  );
}