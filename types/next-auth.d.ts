import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      superRole?: "super_admin" | null;
    } & DefaultSession["user"];
  }

  interface User {
    superRole?: "super_admin" | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    superRole?: "super_admin" | null;
  }
}
