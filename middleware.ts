import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow all _next internal routes (static files, images, etc.)
  if (pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Allow static files
  if (
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|otf|eot|map)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Allow login, invite, and waitlist pages
  if (pathname.startsWith('/login') || pathname.startsWith('/invite') || pathname.startsWith('/waitlist')) {
    return NextResponse.next()
  }

  // Check authentication for all other routes
  if (!req.auth?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
