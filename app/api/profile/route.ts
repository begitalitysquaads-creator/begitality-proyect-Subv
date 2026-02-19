import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/profile — devuelve el perfil del usuario autenticado
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, plan, created_at, updated_at")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ profile });
}

// PATCH /api/profile — actualiza nombre y/o avatar_url del perfil
export async function PATCH(req: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let body: { full_name?: string; avatar_url?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.full_name === "string" && body.full_name.trim()) {
        updates.full_name = body.full_name.trim().slice(0, 200);
    }
    if (typeof body.avatar_url === "string") {
        updates.avatar_url = body.avatar_url.trim().slice(0, 1000) || null;
    }

    if (Object.keys(updates).length === 1) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id, email, full_name, avatar_url, plan, created_at, updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sincronizar también en auth.users metadata
    if (updates.full_name) {
        await supabase.auth.updateUser({
            data: { full_name: updates.full_name },
        });
    }

    return NextResponse.json({ ok: true, profile });
}
