import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    isAdmin: boolean;
    enrollmentNo: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      isAdmin: boolean;
      enrollmentNo: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin: boolean;
    enrollmentNo: string | null;
  }
}