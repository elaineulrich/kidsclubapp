import { DefaultSession } from "next-auth";

export type AppRole = "ADMIN" | "VOLUNTEER" | "DRIVER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      /// Only meaningful for DRIVER sessions - true when this driver's email also
      /// matches an active ADMIN account, so the driver UI can offer "Switch to Admin".
      canSwitchToAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: AppRole;
    canSwitchToAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    canSwitchToAdmin?: boolean;
  }
}
