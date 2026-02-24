"use client";

import { useState, useMemo } from "react";
import { Building2, UserPlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PremiumSelector } from "@/components/ui/PremiumSelector";
import { logClientAction } from "@/lib/audit-client";

interface Client {
  id: string;
  name: string;
}

interface ClientSelectorProps {
  projectId: string;
  initialClient: Client | null;
  availableClients: Client[];
}

export function ClientSelector({ projectId, initialClient, availableClients }: ClientSelectorProps) {
  const [selectedClient, setSelectedId] = useState<string>(initialClient?.id || "all");
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSelect = async (clientId: string) => {
    const finalId = clientId === "all" ? null : clientId;
    const clientName = availableClients.find(c => c.id === clientId)?.name || "Sin asignar";
    
    setUpdating(true);
    const { error } = await supabase
      .from("projects")
      .update({ client_id: finalId })
      .eq("id", projectId);

    if (!error) {
      await logClientAction(projectId, "Proyecto", `cambió el cliente asignado a "${clientName}"`);
      setSelectedId(clientId);
      router.refresh();
    }
    setUpdating(false);
  };

  const selectorOptions = useMemo(() => [
    { value: "all", label: "Sin asignar cliente" },
    ...availableClients.map(c => ({ value: c.id, label: c.name }))
  ], [availableClients]);

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignación de Cliente</p>
        {updating && <Loader2 size={12} className="animate-spin text-blue-600" />}
      </div>
      
      <PremiumSelector
        options={selectorOptions}
        value={selectedClient}
        onChange={handleSelect}
        placeholder="Asignar un cliente..."
        icon={Building2}
        className="h-[46px]"
      />
    </div>
  );
}
