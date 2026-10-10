import { create } from "zustand";
import { api } from "../api/client";
import { User } from "../types";

export interface AuthCheckResult {
  success: boolean;
  user: User | null;
  error: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; phone_number?: string }) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<AuthCheckResult>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async (): Promise<AuthCheckResult> => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, user, error: null };
    } catch (err: any) {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
      const errorMsg = err?.message || "Failed to verify authenticated session.";
      return { success: false, user: null, error: errorMsg };
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await api.login(credentials);
      api.setToken(res.access_token);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.register(data);
      api.setToken(res.access_token);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
