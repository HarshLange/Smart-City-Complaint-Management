export type UserRole = "CITIZEN" | "OFFICER" | "ADMIN";

export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type CivicCategory =
  | "damaged_road"
  | "garbage"
  | "pothole"
  | "streetlight_failure"
  | "water_leak"
  | "other";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  role: UserRole;
  department_id?: string | null;
  department_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  contact_email: string;
  is_active: boolean;
  officer_count?: number;
  created_at: string;
}

export interface ComplaintAttachment {
  id: string;
  storage_path: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  is_resolution_evidence: boolean;
  created_at: string;
  access_url?: string;
}

export interface AIPrediction {
  id: string;
  model_name: string;
  model_version: string;
  predicted_category: string;
  confidence_score: number;
  all_probabilities: Record<string, number>;
  suggested_department_code: string;
  processing_status: string;
  error_message?: string | null;
  is_overridden: boolean;
  override_reason?: string | null;
}

export interface StatusHistory {
  id: string;
  previous_status: ComplaintStatus;
  new_status: ComplaintStatus;
  actor_name: string;
  actor_role: string;
  notes?: string | null;
  created_at: string;
}

export interface OfficerNote {
  id: string;
  officer_name: string;
  note_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  category: CivicCategory;
  priority: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  landmark?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  citizen_name?: string | null;
  citizen_email?: string | null;
  user_id?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  attachments: ComplaintAttachment[];
  ai_prediction?: AIPrediction | null;
  status_history: StatusHistory[];
  officer_notes: OfficerNote[];
}

export interface ComplaintPublicTracking {
  reference_number: string;
  title: string;
  status: ComplaintStatus;
  category: CivicCategory;
  department_name?: string | null;
  priority: string;
  address_summary?: string | null;
  landmark?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
  status_timeline: StatusHistory[];
}

export interface DepartmentWorkloadStat {
  department_id: string;
  department_name: string;
  department_code: string;
  total_complaints: number;
  pending_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
}

export interface AdminAnalytics {
  total_complaints: number;
  submitted_count: number;
  under_review_count: number;
  assigned_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  total_users: number;
  total_citizens: number;
  total_officers: number;
  ai_overridden_count: number;
  department_workloads: DepartmentWorkloadStat[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  complaint_id?: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}
