import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId"); // Opcional para vista específica
    const supabase = await createClient();
    
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
        .from("projects")
        .select(`
            *,
            clients (id, name),
            project_milestones (*),
            project_collaborators (
                user_id,
                profiles (id, full_name)
            )
        `);

    if (projectId) query = query.eq("id", projectId);

    const { data: projects, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mapeo eficiente: Convertimos proyectos e hitos en un array plano de eventos
    const timeline = (projects || []).flatMap((p: any) => {
        const events = [];
        
        const clientName = Array.isArray(p.clients) 
            ? p.clients[0]?.name 
            : p.clients?.name;

        const collaborators = p.project_collaborators?.map((c: any) => ({
            id: c.profiles?.id,
            name: c.profiles?.full_name
        })) || [];

        // Normalizador de fechas (YYYY-MM-DD)
        const norm = (d: string) => d ? d.split('T')[0] : null;
        
        // 1. Evento: Inicio (Sincronizado con start_date)
        const startDate = norm(p.start_date);
        if (startDate) {
            events.push({
                id: `start-${p.id}`,
                projectId: p.id,
                title: `Inicio: ${p.name}`,
                date: startDate,
                type: 'project_start',
                status: p.status,
                client: clientName,
                collaborators
            });
        }

        // 2. Eventos: Hitos específicos (La fuente de verdad más detallada)
        const milestoneDates = new Set();
        if (p.project_milestones) {
            p.project_milestones.forEach((m: any) => {
                const mDate = norm(m.due_date);
                if (mDate) {
                    milestoneDates.add(mDate);
                    events.push({
                        id: m.id,
                        projectId: p.id,
                        title: m.title,
                        date: mDate,
                        type: m.type || 'deliverable',
                        status: m.status || 'pending',
                        client: clientName,
                        collaborators
                    });
                }
            });
        }

        // 3. Evento: Entrega Final (Solo añadir si no hay ya un hito específico en esa fecha)
        const projectDeadline = norm(p.project_deadline);
        if (projectDeadline && !milestoneDates.has(projectDeadline)) {
            events.push({
                id: `deadline-${p.id}`,
                projectId: p.id,
                title: `CIERRE: ${p.name}`,
                date: projectDeadline,
                type: 'project_deadline',
                status: p.status,
                client: clientName,
                collaborators
            });
        }

        return events;
    });

    // Ordenar por fecha
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ events: timeline });
}
