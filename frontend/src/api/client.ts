import {
  AdminAnalytics,
  CivicCategory,
  Complaint,
  ComplaintAttachment,
  ComplaintCreateResult,
  ComplaintPublicTracking,
  ComplaintStatus,
  Department,
  NotificationItem,
  OfficerNote,
  User,
  UserRole,
} from "../types";

// Dynamic API base URL: Reads VITE_API_BASE_URL for deployed environments (e.g. Cloud Run),
// with fallback to '/api/v1' for local Vite dev proxy and single-origin deployments.
const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "/api/v1";

class ApiClient {
  public getToken(): string | null {
    return localStorage.getItem("smart_city_auth_token");
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem("smart_city_auth_token", token);
    } else {
      localStorage.removeItem("smart_city_auth_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      if (networkErr instanceof TypeError && networkErr.message.toLowerCase().includes("failed to fetch")) {
        throw new Error(
          "Unable to connect to the municipal backend server. Please verify network connectivity or service status."
        );
      }
      throw networkErr;
    }

    if (!response.ok) {
      let errDetail = "Request failed";
      try {
        const errorData = await response.json();
        errDetail = errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch {
        errDetail = response.statusText || `Request failed with status ${response.status}`;
      }
      throw new Error(errDetail);
    }

    // Handle 204 or empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth Endpoints
  async register(data: { email: string; password: string; full_name: string; phone_number?: string }) {
    return this.request<{ access_token: string; token_type: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ access_token: string; token_type: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout() {
    this.setToken(null);
    return this.request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Complaint Endpoints
  async submitComplaint(formData: FormData): Promise<ComplaintCreateResult> {
    return this.request<ComplaintCreateResult>("/complaints/", {
      method: "POST",
      body: formData,
    });
  }

  async trackComplaint(reference_number: string, tracking_pin: string): Promise<ComplaintPublicTracking> {
    return this.request<ComplaintPublicTracking>("/complaints/track", {
      method: "POST",
      body: JSON.stringify({ reference_number, tracking_pin }),
    });
  }

  async getMyComplaints(): Promise<Complaint[]> {
    return this.request<Complaint[]>("/complaints/mine");
  }

  async getComplaintDetail(id: string): Promise<Complaint> {
    return this.request<Complaint>(`/complaints/${id}`);
  }

  async reopenComplaint(id: string, reason: string): Promise<Complaint> {
    return this.request<Complaint>(`/complaints/${id}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // Department Officer Endpoints
  async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>("/department/departments");
  }

  async getDepartmentQueue(status?: ComplaintStatus, search?: string): Promise<Complaint[]> {
    const params = new URLSearchParams();
    if (status) params.append("status_filter", status);
    if (search) params.append("search", search);
    return this.request<Complaint[]>(`/department/queue?${params.toString()}`);
  }

  async getDepartmentSummary(): Promise<{
    department_id: string;
    counts_by_status: Record<string, number>;
    total_active: number;
    total_resolved: number;
  }> {
    return this.request("/department/summary");
  }

  async updateComplaintStatus(
    complaintId: string,
    new_status: ComplaintStatus,
    notes?: string
  ): Promise<Complaint> {
    return this.request<Complaint>(`/department/complaints/${complaintId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ new_status, notes }),
    });
  }

  async addOfficerNote(complaintId: string, note_text: string, is_internal: boolean = true): Promise<OfficerNote> {
    return this.request<OfficerNote>(`/department/complaints/${complaintId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note_text, is_internal }),
    });
  }

  async uploadResolutionEvidence(complaintId: string, file: File): Promise<ComplaintAttachment> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<ComplaintAttachment>(`/department/complaints/${complaintId}/evidence`, {
      method: "POST",
      body: formData,
    });
  }

  // Admin Endpoints
  async getAdminAnalytics(): Promise<AdminAnalytics> {
    return this.request<AdminAnalytics>("/admin/analytics");
  }

  async getAllComplaints(status?: ComplaintStatus, departmentId?: string, search?: string): Promise<Complaint[]> {
    const params = new URLSearchParams();
    if (status) params.append("status_filter", status);
    if (departmentId) params.append("department_id", departmentId);
    if (search) params.append("search", search);
    return this.request<Complaint[]>(`/admin/complaints?${params.toString()}`);
  }

  async getAiReviewQueue(): Promise<Complaint[]> {
    return this.request<Complaint[]>("/admin/ai-review-queue");
  }

  async overrideComplaint(
    complaintId: string,
    category: CivicCategory,
    department_id: string,
    override_reason: string
  ): Promise<Complaint> {
    return this.request<Complaint>(`/admin/complaints/${complaintId}/override`, {
      method: "POST",
      body: JSON.stringify({ category, department_id, override_reason }),
    });
  }

  async assignOfficer(complaintId: string, officer_id: string, notes?: string): Promise<{ message: string }> {
    const params = new URLSearchParams({ officer_id });
    if (notes) params.append("notes", notes);
    return this.request(`/admin/complaints/${complaintId}/assign?${params.toString()}`, {
      method: "POST",
    });
  }

  async listUsers(role?: UserRole, departmentId?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (departmentId) params.append("department_id", departmentId);
    return this.request<User[]>(`/admin/users?${params.toString()}`);
  }

  async provisionOfficer(data: {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string;
    department_id: string;
  }): Promise<User> {
    return this.request<User>("/admin/provision-officer", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAuditLogs(limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/admin/audit-logs?limit=${limit}`);
  }

  async adminGetDepartments(): Promise<Department[]> {
    return this.request<Department[]>("/admin/departments");
  }

  async adminCreateDepartment(data: {
    code: string;
    name: string;
    description: string;
    contact_email: string;
  }): Promise<Department> {
    return this.request<Department>("/admin/departments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adminUpdateDepartment(
    departmentId: string,
    data: { name?: string; description?: string; contact_email?: string; is_active?: boolean }
  ): Promise<Department> {
    return this.request<Department>(`/admin/departments/${departmentId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async adminUpdateUser(
    userId: string,
    data: { full_name?: string; role?: UserRole; department_id?: string; is_active?: boolean }
  ): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Secure File Storage Endpoints
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<{ signed_url: string }> {
    return this.request<{ signed_url: string; storage_path: string; expires_in: number }>(
      `/files/signed-url?path=${encodeURIComponent(path)}&expires_in=${expiresIn}`
    );
  }

  async getFileBlobUrl(path: string): Promise<string> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/files/download?path=${encodeURIComponent(path)}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>("/notifications/");
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.request<void>(`/notifications/${id}/read`, { method: "PATCH" });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request<void>("/notifications/read-all", { method: "POST" });
  }
}

export const api = new ApiClient();
