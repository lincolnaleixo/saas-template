import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Always log to ensure middleware is running
  console.log('[Middleware] Checking path:', path);
  
  // Check for auth session cookie
  const hasSession = request.cookies.has('auth_session');
  const sessionId = request.cookies.get('auth_session')?.value;
  
  // Special handling for admin routes - requires both authentication and authorization
  if (path === '/api-docs' || path.startsWith('/admin')) {
    if (!hasSession) {
      console.log('[Middleware] Admin access denied - no session');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if user is authorized for admin access
    try {
      // Call the auth.me endpoint to get user info
      const response = await fetch(`${request.nextUrl.origin}/api/trpc/auth.me`, {
        method: 'GET',
        headers: {
          'Cookie': `auth_session=${sessionId}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const userEmail = data.result?.data?.email;
        
        // Check if user email is in authorized admin list
        const authorizedEmails = process.env.ADMIN_ACCESS_EMAILS?.split(',').map(e => e.trim()) || [];
        
        if (userEmail && authorizedEmails.includes(userEmail)) {
          console.log('[Middleware] Admin access granted for:', userEmail);
          return NextResponse.next();
        }
      }
    } catch (error) {
      console.error('[Middleware] Error checking admin authorization:', error);
    }
    
    // If not authorized, redirect to dashboard with error message
    console.log('[Middleware] Admin access denied - not authorized');
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(dashboardUrl);
  }
  
  // Allow only specific public routes
  const isPublicPath = 
    path === '/login' || 
    path === '/register' ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/trpc/') || // Allow tRPC endpoints
    path.startsWith('/_next/') ||
    path.includes('.'); // static files
  
  if (isPublicPath) {
    console.log('[Middleware] Public path, allowing:', path);
    return NextResponse.next();
  }
  
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