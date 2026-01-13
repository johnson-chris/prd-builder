import { create } from 'zustand';
import type { User } from '@/types';
import { authApi, setAccessToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, isAuthenticated: false, isInitialized: false, isLoading: false, error: null,

  initialize: async () => {
    try {
      const response = await authApi.refresh();
      set({ user: response.user, isAuthenticated: true, isInitialized: true });
    } catch { set({ user: null, isAuthenticated: false, isInitialized: true }); }
  },

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password, rememberMe });
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register({ email, password, name });
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registration failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch { }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

useAuthStore.getState().initialize();
