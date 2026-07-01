import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './types';
import { hasPermission } from './lib/permissionHelpers';
import { tokenStorage } from './services/tokenStorage';
import { resolvePlatformAccess } from '@/shared/auth/platformAccess';
import { usersApi } from '@/services/usersApi';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  /** Returns true when the current user holds the given permission key. Falls
   * back to `false` while loading or when there is no signed-in user. */
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const currentUser = tokenStorage.getToken() ? tokenStorage.getUser() : null;
      if (!currentUser) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const resolvedLocalUser = resolvePlatformAccess(currentUser);
      if (!cancelled) {
        setUser(resolvedLocalUser);
      }

      try {
        const backendUser = await usersApi.getCurrentUser();
        const resolvedBackendUser = resolvePlatformAccess(backendUser);
        tokenStorage.setUser(resolvedBackendUser);
        if (!cancelled) {
          setUser(resolvedBackendUser);
        }
      } catch {
        if (!cancelled) {
          setUser(resolvedLocalUser);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = resolvePlatformAccess({ ...user, ...updates });
      tokenStorage.setUser(updatedUser);
      setUser(updatedUser);
    }
  };

  const can = (permission: string): boolean => hasPermission(user, permission);

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateProfile, can }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Conditionally renders children only when the current user has the permission. */
export function Can({ permission, fallback = null, children }: { permission: string; fallback?: React.ReactNode; children: React.ReactNode }) {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
