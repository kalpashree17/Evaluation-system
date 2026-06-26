import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthState } from '../types/index';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "interviewer" | "candidate";

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
  isInterviewer: () => boolean;
  isCandidate: () => boolean;
}

// ── Mock data ────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt?: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@interviewiq.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'John Candidate',
    email: 'candidate@interviewiq.com',
    password: 'candidate123',
    role: 'candidate',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Jane Interviewer',
    email: 'interviewer@interviewiq.com',
    password: 'interviewer123',
    role: 'interviewer',
    createdAt: new Date().toISOString(),
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

  const login = (email: string, password: string): Promise<LoginResponse> => {
    return new Promise<LoginResponse>((resolve, reject) => {
      // Simulate API call
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

        const userData = userWithoutPassword as User;
        
        setState({
          user: userData,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        resolve({
          user: userData,
          token,
        });
      }, 500);
    });
  };

  // ── register ───────────────────────────────────────────────────────────────

  const register = (data: RegisterData): Promise<LoginResponse> => {
    return new Promise<LoginResponse>((resolve, reject) => {
      setTimeout(() => {
        const exists = MOCK_USERS.some((u) => u.email === data.email);

        if (exists) {
          reject(new Error('An account with that email already exists'));
          return;
        }

        // In a real app, the role would be assigned by the server
        // For demo, we'll use the provided role or default to 'candidate'
        const role = data.role || 'candidate';
        
        const newUser: User = {
          id: String(MOCK_USERS.length + 1),
          name: data.name,
          email: data.email,
          role: role,
          createdAt: new Date().toISOString(),
        };

        // Add to mock users (in real app, this would be stored in DB)
        MOCK_USERS.push({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: data.password,
          role: newUser.role,
          createdAt: newUser.createdAt,
        });

        const token = generateToken();

        setState({
          user: newUser,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        resolve({
          user: newUser,
          token,
        });
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

  // ── Role checking functions ──────────────────────────────────────────────

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role);
  };

  const isAdmin = (): boolean => {
    return state.user?.role === 'admin';
  };

  const isInterviewer = (): boolean => {
    return state.user?.role === 'interviewer';
  };

  const isCandidate = (): boolean => {
    return state.user?.role === 'candidate';
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
        isInterviewer,
        isCandidate
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