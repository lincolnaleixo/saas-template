import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Always log to ensure middleware is running
  console.log('[Middleware] Checking path:', path);
  
  // Allow only specific public routes
  const isPublicPath = 
    path === '/login' || 
    path === '/register' ||
    path.startsWith('/api/auth/') ||
    path === '/api-docs' || // Allow API documentation page
    path.startsWith('/_next/') ||
    path.includes('.'); // static files
  
  if (isPublicPath) {
    console.log('[Middleware] Public path, allowing:', path);
    return NextResponse.next();
  }
  
  // Check for auth session cookie
  const hasSession = request.cookies.has('auth_session');
  console.log('[Middleware] Has session:', hasSession);
  
  if (!hasSession) {
    console.log('[Middleware] No session, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }
  
  console.log('[Middleware] Session found, allowing access');
  return NextResponse.next();
}

// Match all routes
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};