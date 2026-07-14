// 

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/header';
import { Navbar, getNavItemsForRole, getDefaultModule } from './components/navbar';
import { useAuth } from './context/authContext';
import Login from './auth/login';
import Register from './auth/register';
// import Unauthorized from './components/Unauthorized';
// import EvaluationPage from './pages/EvaluationPage';

type Role = 'admin' | 'user';

// ── Dev bypass ────────────────────────────────────────────────────────────────
// Set VITE_BYPASS_AUTH=true in .env to skip login entirely during development.
// This must be removed (or set to false) before shipping to production.
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';
const BYPASS_ROLE: Role = 'user';

if (BYPASS_AUTH) {
  // Seed localStorage so downstream components (Navbar, etc.) behave as if
  // a real user is logged in, without ever hitting /auth/login.
  if (!localStorage.getItem('token')) {
    localStorage.setItem('token', 'dev-bypass-token');
    localStorage.setItem('role', BYPASS_ROLE);
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 0, name: 'Dev User', email: 'dev@local', role: BYPASS_ROLE })
    );
  }
}

// ── Dashboard Layout (unified for all roles) ────────────────────────────────

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [module, setModule] = useState('overview');

  // Read the role directly from localStorage (set at login/register time,
  // or seeded above when BYPASS_AUTH is on)
  const [role, setRole] = useState<Role | null>(
    () => localStorage.getItem('role') as Role | null
  );

  useEffect(() => {
    const handleStorage = () => {
      setRole(localStorage.getItem('role') as Role | null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const defaultModule = getDefaultModule(role ?? undefined);
    setModule(defaultModule);
  }, [role]);

  const navItems = getNavItemsForRole(role ?? undefined);
  const activeNav = navItems.find((item) => item.id === module);
  const ActiveModule = activeNav?.component ?? (() => null);

  const hasAccess = activeNav?.roles?.includes(role as any) ?? true;

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="fixed inset-0 bg-[#0a0f1c] flex font-sans overflow-hidden">
      {/* Sidebar */}
      <Navbar
        module={module}
        setModule={setModule}
        sidebarOpen={sidebarOpen}
        role={role}
      />

      {/* Right column: topbar + page content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeNavLabel={activeNav?.label ?? 'Dashboard'}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto m-3 p-2">
          <ActiveModule />
        </main>
      </div>
    </div>
  );
};

// ── Route Guards ──────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (BYPASS_AUTH) return <>{children}</>;

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const RoleRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: Role[];
}) => {
  if (BYPASS_AUTH) return <>{children}</>;

  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}

      {/* Protected dashboard - redirects to role-specific dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {(() => {
              const role = localStorage.getItem('role');
              if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
              if (role === 'user') return <Navigate to="/user/dashboard" replace />;
              return <Navigate to="/login" replace />;
            })()}
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <RoleRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </RoleRoute>
        }
      />

      {/* User routes */}
      <Route
        path="/user/*"
        element={
          <RoleRoute allowedRoles={['user']}>
            <DashboardLayout />
          </RoleRoute>
        }
      />

      {/* Evaluation routes - accessible by admin only */}
      {/* <Route
        path="/evaluation"
        element={
          <RoleRoute allowedRoles={['admin']}>
            <EvaluationPage />
          </RoleRoute>
        }
      /> */}

      {/* Root path */}
      <Route
        path="/"
        element={
          BYPASS_AUTH ? (
            <Navigate to="/user/dashboard" replace />
          ) : (
            <ProtectedRoute>
              {user?.role === 'admin' && <Navigate to="/admin/dashboard" replace />}
              {user?.role === 'user' && <Navigate to="/user/dashboard" replace />}
              <Navigate to="/login" replace />
            </ProtectedRoute>
          )
        }
      />

      {/* Catch-all - redirect to dashboard */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;