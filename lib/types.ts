// Begitality - Tipos compartidos (alineados con esquema Supabase)

export type ProjectStatus = "draft" | "in_progress" | "ready_export" | "exported" | "archived";
export type PlanType = "starter" | "consultant" | "senior_consultant" | "enterprise";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanType;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  industry: string | null;
  notes: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  grant_name: string;
  grant_type: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Section {
  id: string;
  project_id: string;
  title: string;
  content: string;
  sort_order: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConvocatoriaBase {
  id: string;
  project_id: string;
  name: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  label: string;
  required: boolean;
  checked: boolean;
  sort_order: number;
  created_at: string;
}

export interface AIMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export type ProjectWithSections = Project & { sections?: Section[] };
