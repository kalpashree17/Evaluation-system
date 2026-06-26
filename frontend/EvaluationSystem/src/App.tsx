import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/header';
import { Navbar, getNavItemsForRole, getDefaultModule } from './components/navbar';
import { useAuth } from './context/authContext';
import Login from './auth/login';
import Register from './auth/register';
// import Unauthorized from './components/Unauthorized';
// import EvaluationPage from './pages/EvaluationPage';

// ── Dashboard Layout (unified for all roles) ────────────────────────────────

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [module, setModule] = useState('overview');
  const { user } = useAuth();

  // Set default module based on role
  useEffect(() => {
    const defaultModule = getDefaultModule(user?.role);
    setModule(defaultModule);
  }, [user?.role]);

  // Get nav items based on user role
  const navItems = getNavItemsForRole(user?.role);
  const activeNav = navItems.find((item) => item.id === module);
  const ActiveModule = activeNav?.component ?? (() => null);

  // Check if user has access to this module
  const hasAccess = activeNav?.roles?.includes(user?.role as any) ?? true;

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
        role={user?.role}
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
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: ('admin' | 'interviewer' | 'candidate')[] 
}) => {
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

      {/* Protected dashboard - unified for all roles */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
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

      {/* Interviewer routes */}
      <Route
        path="/interviewer/*"
        element={
          <RoleRoute allowedRoles={['interviewer']}>
            <DashboardLayout />
          </RoleRoute>
        }
      />

      {/* Candidate routes */}
      <Route
        path="/candidate/*"
        element={
          <RoleRoute allowedRoles={['candidate']}>
            <DashboardLayout />
          </RoleRoute>
        }
      />

      {/* Evaluation routes - accessible by admin and interviewer */}
      {/* <Route
        path="/evaluation"
        element={
          <RoleRoute allowedRoles={['admin', 'interviewer']}>
            <EvaluationPage />
          </RoleRoute>
        }
      /> */}

      {/* Root path - redirect based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' && <Navigate to="/admin/dashboard" replace />}
            {user?.role === 'interviewer' && <Navigate to="/interviewer/dashboard" replace />}
            {user?.role === 'candidate' && <Navigate to="/candidate/dashboard" replace />}
            <Navigate to="/login" replace />
          </ProtectedRoute>
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