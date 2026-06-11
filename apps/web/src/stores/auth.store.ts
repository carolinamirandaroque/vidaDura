import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@lifehub/types';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { wsClient } from '@/lib/websocket';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens) => {
        queryClient.clear();
        api.setTokens(tokens);
        wsClient.connect(tokens.accessToken);
        set({ user, tokens, isAuthenticated: true });
      },

      logout: () => {
        const { tokens } = get();
        if (tokens?.refreshToken) {
          api.logout().catch(() => {});
        }
        api.clearTokens();
        wsClient.disconnect();
        queryClient.clear();
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'lifehub-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          api.setTokens(state.tokens);
          api.setCallbacks({
            onTokenRefresh: (tokens) => {
              useAuthStore.setState({ tokens });
            },
            onUnauthorized: () => {
              useAuthStore.getState().logout();
            },
          });
          wsClient.connect(state.tokens.accessToken);
        }
      },
    },
  ),
);
