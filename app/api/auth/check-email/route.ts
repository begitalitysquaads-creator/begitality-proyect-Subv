import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Usamos service_role para poder consultar profiles sin RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/auth/check-email?email=xxx
 * Verifica si un email ya está dado de alta en la tabla profiles.
 * Se usa antes del flujo OAuth de Google para prevenir accesos no autorizados.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email")?.trim().toLowerCase();

        if (!email) {
            return NextResponse.json(
                { error: "Email requerido", allowed: false },
                { status: 400 }
            );
        }

        // Buscar en profiles (tabla que solo contiene usuarios invitados)
        const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("id, email, is_active")
            .ilike("email", email)
            .single();

        if (error || !profile) {
            return NextResponse.json({
                allowed: false,
                reason: "Este correo no tiene una invitación activa en Begitality."
            });
        }

        // Verificar que esté activo (o que al menos exista - puede estar pending)
        return NextResponse.json({
            allowed: true,
            profile_id: profile.id
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message, allowed: false },
            { status: 500 }
        );
    }
}
