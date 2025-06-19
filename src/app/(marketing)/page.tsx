import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Welcome to <span className="text-primary">My App</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl text-center">
          A modern web application built with Next.js 15, tRPC, and Drizzle ORM.
          Start building your next project with a solid foundation.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/auth/dashboard">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}