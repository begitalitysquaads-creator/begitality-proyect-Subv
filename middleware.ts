import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options ?? {})
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── ACTUALIZACIÓN DE ACTIVIDAD (last_login) ─────────────────────────
  // Si el usuario está autenticado y no es una ruta de API/estática,
  // actualizamos su último acceso de forma asíncrona (background).
  if (user && !request.nextUrl.pathname.startsWith("/api/")) {
    // Usamos el cliente de supabase para disparar el update
    // No esperamos (await) para no bloquear la carga de la página
    supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id)
      .then();
  }

  const userRole = user?.app_metadata?.role;

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password");
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    request.nextUrl.pathname.startsWith("/api/auth/") ||
    request.nextUrl.pathname.startsWith("/update-password") ||
    isAuthRoute;

  if (!user && !isPublicRoute) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── PROTECCIÓN DE RUTAS POR ROL ─────────────────────────────────────
  if (request.nextUrl.pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
