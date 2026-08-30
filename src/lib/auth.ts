import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import type { RolUsuario } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
        });

        if (!usuario || !usuario.passwordHash) return null;

        const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
        if (!passwordOk) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          predioId: usuario.predioId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Al hacer login, inyectamos rol y predioId en el JWT
        token.rol = (user as { rol: RolUsuario }).rol;
        token.predioId = (user as { predioId: string | null }).predioId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Exponemos rol y predioId en la sesión del cliente
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as RolUsuario;
        session.user.predioId = token.predioId as string | null;
      }
      return session;
    },
  },
});
