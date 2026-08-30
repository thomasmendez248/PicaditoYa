import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { RolUsuario } from "@prisma/client";

// Mapeo de prefijos de ruta a roles permitidos
const ROLE_ROUTES: Record<string, RolUsuario[]> = {
  "/super-admin": ["super_admin"],
  "/admin": ["admin", "super_admin"],
  "/empleado": ["empleado", "admin", "super_admin"],
  "/cliente": ["cliente", "admin", "super_admin"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas del dashboard — verificar autenticación y autorización por rol
  if (isProtectedRoute(pathname)) {
    const session = await auth();

    if (!session?.user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar acceso por rol
    for (const [routePrefix, roles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(routePrefix)) {
        if (!roles.includes(session.user.rol)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = ["/super-admin", "/admin", "/empleado", "/cliente"];
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
