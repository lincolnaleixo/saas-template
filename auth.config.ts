import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth configuration for middleware
export const authConfig = {
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Allow API routes
      if (pathname.startsWith('/api')) {
        return true;
      }

      // Allow static files
      if (
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/robots.txt') ||
        pathname.startsWith('/sitemap.xml') ||
        /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|otf|eot|map)$/.test(pathname)
      ) {
        return true;
      }

      // Allow login, invite, and waitlist pages
      if (pathname.startsWith('/login') || pathname.startsWith('/invite') || pathname.startsWith('/waitlist')) {
        return true;
      }

      // Check authentication for all other routes
      if (!auth?.user) {
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
