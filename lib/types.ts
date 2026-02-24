// Begitality - Tipos compartidos (alineados con esquema Supabase)

export type ProjectStatus = "draft" | "in_progress" | "ready_export" | "exported" | "archived";
export type UserRole = "admin" | "senior_consultant" | "junior_consultant" | "auditor" | "viewer";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone_number: string | null;
  bio: string | null;
  last_login: string | null;
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
  contact_name: string | null;
  contact_position: string | null;
  industry: string | null;
  cnae: string | null;
  constitution_date: string | null;
  fiscal_region: string | null;
  annual_turnover: number;
  employee_count: number;
  de_minimis_received: number;
  notes: string | null;
  status: "active" | "archived";

  // Metadatos corporativos (Extensión 2026)
  address: string | null;
  company_size: string | null;
  founded_year: number | null;
  website: string | null;
  revenue_range: string | null;
  sector: string | null;

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

  // Datos Operativos
  project_deadline?: string | null; // Fecha para calendario

  grant_summary: {
    max_amount: string;
    intensity: string;
    deadline: string;
    beneficiaries: string;
    eligible_costs: string;
  } | null;
  writing_instructions: string | null;
  roi_estimated?: number;
  quality_score?: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  collaborators?: {
    role: string;
    profiles: {
      avatar_url: string | null;
      full_name: string | null;
    };
  }[];
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

export interface Budget {
  id: string;
  project_id: string;
  concept: string;
  amount: number;
  category: 'personal' | 'equipment' | 'external' | 'other';
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  required: boolean;
  is_ai_generated: boolean;
  sort_order: number;
  file_path: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  metadata: any;
  due_date: string | null;
  created_at: string;
}

// --- Diagnósticos IA ---

export type RiskLevel = "high" | "medium" | "low";

export interface DiagnosticRisk {
  level: RiskLevel;
  message: string;
  section_id?: string;
}

export interface DiagnosticSuggestion {
  priority: 1 | 2 | 3;
  action: string;
  section_title?: string;
}

export interface DiagnosticSectionScore {
  score: number;
  feedback: string;
}

export interface ProjectDiagnostic {
  id: string;
  project_id: string;
  generated_at: string;
  overall_score: number;
  summary: string;
  risks: DiagnosticRisk[];
  suggestions: DiagnosticSuggestion[];
  section_scores: Record<string, DiagnosticSectionScore>;
  requirements_found: string[];
  model_used: string;
}
