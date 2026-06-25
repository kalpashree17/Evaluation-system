import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState } from '../types/index';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "interviewer" | "candidate";
interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?:"admin" | "interviewer" | "candidate" ;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
}

// ── Mock data ────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@interviewiq.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: '2',
    name: 'John Candidate',
    email: 'candidate@interviewiq.com',
    password: 'candidate123',
    role: 'candidate',
  },
  {
    id: '3',
    name: 'Jane Interviewer',
    email: 'interviewer@interviewiq.com',
    password: 'interviewer123',
    role: 'interviewer',
  },
];

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

function generateToken(): string {
  return `mock-jwt-token-${Date.now()}`;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => {
    // Initialise synchronously from localStorage to avoid isLoading flicker
    const token = localStorage.getItem('token');
    const user = safeParse<User>(localStorage.getItem('user'));

    if (token && user) {
      return { user, token, isAuthenticated: true, isLoading: false };
    }
    return { user: null, token: null, isAuthenticated: false, isLoading: false };
  });

  // Keep localStorage in sync whenever auth state changes
  useEffect(() => {
    if (state.isAuthenticated && state.user && state.token) {
      localStorage.setItem('token', state.token);
      localStorage.setItem('user', JSON.stringify(state.user));
    }
  }, [state.isAuthenticated, state.user, state.token]);

  // ── login ──────────────────────────────────────────────────────────────────

  const login = (email: string, password: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const match = MOCK_USERS.find(
          (u) => u.email === email && u.password === password
        );

        if (!match) {
          reject(new Error('Invalid email or password'));
          return;
        }

        // Exclude password from stored user object
        const { password: _pw, ...userWithoutPassword } = match;
        const token = generateToken();

        setState({
          user: userWithoutPassword as User,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        resolve();
      }, 500);
    });
  };

  // ── register ───────────────────────────────────────────────────────────────

  const register = (data: RegisterData): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const exists = MOCK_USERS.some((u) => u.email === data.email);

        if (exists) {
          reject(new Error('An account with that email already exists'));
          return;
        }

        const newUser: User = {
          id: String(MOCK_USERS.length + 1),
          name: data.name,
          email: data.email,
          role: data.role ?? 'candidate',
          createdAt: new Date().toISOString(),
        };

        // NOTE: In a real app this would hit an API. Here the new user is only
        // persisted in localStorage for the current session; refreshing will
        // clear MOCK_USERS so the user must be stored server-side instead.
        const token = generateToken();

        setState({
          user: newUser,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        resolve();
      }, 500);
    });
  };

  // ── logout ─────────────────────────────────────────────────────────────────

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // ── hasRole ────────────────────────────────────────────────────────────────

  const hasRole = (roles: string | string[]): boolean => {
    if (!state.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole }} >
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