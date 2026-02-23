import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Construimos la respuesta inicial para poder setear cookies
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options ?? {});
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
    }

    const user = data.user;

    // 1. VERIFICACIÓN DE MFA
    // Si el usuario tiene MFA activado, debemos enviarle a completar el desafío
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const isMfaEnabled = factors?.all.some(f => f.status === 'verified');
    
    // Obtenemos el nivel de autenticación actual
    const { data: { session } } = await supabase.auth.getSession();
    const isAal2 = session?.user.aud === 'authenticated' && session?.user.app_metadata?.aal === 'aal2';

    if (isMfaEnabled && !isAal2) {
      // Redirigir a login con el paso de MFA activo
      const mfaUrl = new URL("/login", requestUrl.origin);
      // Podemos pasar un flag para que el cliente sepa que debe mostrar MFA
      mfaUrl.searchParams.set("mfa", "true"); 
      return NextResponse.redirect(mfaUrl);
    }

    // 2. VERIFICACIÓN DE INVITACIÓN (PLATAFORMA CERRADA)
    // Usamos una consulta que ignore RLS si fuera posible, pero como no tenemos service role,
    // confiamos en que el usuario ya está autenticado y puede ver su propio perfil.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user?.id)
      .single();

    if (!profile || profileError) {
      // Si no hay perfil, significa que no fue invitado (el trigger no debería haber fallado si existía invitación)
      // O que es un usuario nuevo de Google que Supabase creó automáticamente pero no permitimos.
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "Acceso denegado. Tu cuenta de Google no tiene una invitación activa en Begitality.");
      return NextResponse.redirect(loginUrl);
    }

    // Todo correcto, redirigir a dashboard (o la página 'next')
    return response;
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
