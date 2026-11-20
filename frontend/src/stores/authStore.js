import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      role: null,

      setAuth: ({ user, accessToken, refreshToken }) => {
        set({
          user,
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : get().refreshToken,
          isAuthenticated: Boolean(accessToken),
          role: user?.role || null,
        });
      },

      setTokens: ({ accessToken, refreshToken }) => {
        set({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : get().refreshToken,
          isAuthenticated: Boolean(accessToken),
        });
      },

      setAccessToken: (accessToken) => {
        set({
          accessToken,
          isAuthenticated: Boolean(accessToken),
        });
      },

      setUser: (user) => {
        set({
          user,
          role: user?.role || null,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          role: null,
        });
      },
    }),
    {
      name: 'galla_auth_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
