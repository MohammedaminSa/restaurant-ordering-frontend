import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './api';
import { login as apiLogin, logout as apiLogout, refreshToken as apiRefreshToken } from './api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await apiLogin(email, password);
        const { user, accessToken, refreshToken } = response.data;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch {
          // Logout on client even if API call fails
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ user: null, accessToken: null, isAuthenticated: false });
          return;
        }
        try {
          const response = await apiRefreshToken(refreshToken);
          set({ accessToken: response.data.accessToken });
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      setUser: (user: User) => set({ user }),

      setTokens: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken }),
    }),
    {
      name: 'bistro-auth-v1',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
