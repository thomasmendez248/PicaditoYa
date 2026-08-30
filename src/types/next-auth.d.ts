import { DefaultSession, DefaultJWT } from "next-auth";
import type { RolUsuario } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
      predioId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    rol: RolUsuario;
    predioId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    rol: RolUsuario;
    predioId: string | null;
  }
}
