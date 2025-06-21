/**
 * Global type declarations
 * Extends built-in types and declares modules
 */

// Declare Bun types if not available
declare namespace Bun {
  interface Env {
    [key: string]: string | undefined;
  }
}

// Declare module for CSS imports (if using a bundler)
declare module '*.css' {
  const content: string;
  export default content;
}

// Declare module for static assets
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

// Lucia auth types
declare module 'lucia' {
  interface Register {
    Lucia: import('../lib/auth').lucia;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      name: string;
      role: string;
      verified: boolean;
    };
  }
}

// Environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      API_PORT: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_SECRET: string;
      SESSION_SECRET: string;
      // Add other env vars as needed
    }
  }
}

export {};