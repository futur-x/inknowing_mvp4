import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AdminStore {
  user: AdminUser | null;
  isAuthenticated: boolean;
  token: string | null;

  // Actions
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  logout: () => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      setToken: (token) => set({ token }),

      checkPermission: (permission) => {
        const { user } = get();
        if (!user) return false;

        // Super admin has all permissions
        if (user.role === 'super_admin') return true;

        // Check specific permission
        return user.permissions?.includes(permission) || false;
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        return user.role === role;
      },

      logout: () => set({
        user: null,
        isAuthenticated: false,
        token: null
      })
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);