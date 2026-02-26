import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const redirect = requestUrl.searchParams.get("redirect") ?? next;

  // Construimos la respuesta inicial para poder setear cookies
  const response = NextResponse.redirect(new URL(redirect, requestUrl.origin));

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
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }

    const user = data.user;

    // ── ADMIN CLIENT (service_role para bypass RLS) ─────────────────
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 1. VERIFICACIÓN DE INVITACIÓN (PLATAFORMA CERRADA) ──────────
    // 
    // Estrategia: Cuando un admin invita a un usuario vía `inviteUserByEmail`,
    // Supabase Auth crea un auth.users con identity provider = "email".
    // Cuando luego ese usuario inicia sesión con Google, Supabase le AGREGA
    // una segunda identity de tipo "google", resultando en providers: ["email", "google"].
    //
    // Si un usuario NUEVO (no invitado) inicia sesión con Google directamente,
    // Supabase crea el auth.users con UNA SOLA identity: providers: ["google"].
    //
    // Esta diferencia nos permite detectar usuarios no invitados de forma fiable.
    //
    const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const adminUser = adminUserData?.user;

    if (adminUser) {
      const identities = adminUser.identities ?? [];
      const providers = identities.map(i => i.provider);
      const hasEmailProvider = providers.includes("email");
      const hasGoogleProvider = providers.includes("google");
      const isGoogleOnlyUser = hasGoogleProvider && !hasEmailProvider && providers.length === 1;

      if (isGoogleOnlyUser) {
        // Este usuario SOLO tiene Google — NO fue invitado previamente.
        // Cerrar sesión y eliminar el usuario auto-creado.
        await supabase.auth.signOut();
        await supabaseAdmin.auth.admin.deleteUser(user.id);

        const loginUrl = new URL("/login", requestUrl.origin);
        loginUrl.searchParams.set(
          "error",
          "Acceso denegado. Tu cuenta de Google no tiene una invitación activa en Begitality."
        );
        return NextResponse.redirect(loginUrl);
      }
    }

    // Verificación adicional: perfil debe existir
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      await supabase.auth.signOut();
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set(
        "error",
        "Acceso denegado. No se encontró un perfil asociado a esta cuenta."
      );
      return NextResponse.redirect(loginUrl);
    }

    // ── 2. VERIFICACIÓN DE MFA ──────────────────────────────────────
    // Nota: la elevación a AAL2 solo ocurre DESPUÉS del reto/verificación TOTP.
    // Aquí solo detectamos si el usuario tiene factores MFA verificados y,
    // en ese caso, delegamos la verificación al flujo de login (pantalla MFA).
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const isMfaEnabled = factors?.all.some((f) => f.status === "verified");

    if (isMfaEnabled) {
      const mfaUrl = new URL("/login", requestUrl.origin);
      mfaUrl.searchParams.set("mfa", "true");
      return NextResponse.redirect(mfaUrl);
    }

    // ── 3. ACTUALIZAR ÚLTIMO LOGIN ──────────────────────────────────
    const { error: lastLoginError } = await supabaseAdmin
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    if (lastLoginError) {
      // No bloqueamos el acceso, pero nunca fallamos en silencio
      console.error("[AUTH CALLBACK] Error al registrar last_login:", lastLoginError);
    }

    // Todo correcto → redirigir al destino
    return response;
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
