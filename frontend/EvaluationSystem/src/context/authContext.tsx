import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState } from '../types/index';
import api from '../utils/axiosInstance';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<LoginResponse>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: () => boolean;
  isUser: () => boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON from localStorage.
 * Returns null instead of throwing on corrupted data.
 */
function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const user = safeParse<User>(localStorage.getItem('user'));

    if (token && user) {
      return { user, token, isAuthenticated: true, isLoading: false };
    }
    return { user: null, token: null, isAuthenticated: false, isLoading: false };
  });

  useEffect(() => {
    if (state.isAuthenticated && state.user && state.token) {
      localStorage.setItem('token', state.token);
      localStorage.setItem('role', state.user.role);
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  }, [state.isAuthenticated, state.user, state.token]);

  // ── login ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/login', { email, password });
    const { data } = response.data as { success: boolean; data: { token: string; user: User } };

    setState({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
      isLoading: false,
    });

    return { user: data.user, token: data.token };
  };

  // ── register ───────────────────────────────────────────────────────────────

  const register = async (data: RegisterData): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    const result = response.data as { success: boolean; data: User };

    return { user: result.data, token: '' };
  };

  // ── logout ─────────────────────────────────────────────────────────────────

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // ── Role checking functions ──────────────────────────────────────────────

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role);
  };

  const isAdmin = (): boolean => {
    return state.user?.role === 'admin';
  };

  const isUser = (): boolean => {
    return state.user?.role === 'user';
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        hasRole,
        isAdmin,
        isUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};