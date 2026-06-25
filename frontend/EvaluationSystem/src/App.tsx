import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/header';
import { Navbar, navItems } from './components/navbar';
import { useAuth } from './context/authContext'; // adjust path if needed
import Login from './auth/login';               // adjust path if needed

// ── Protected dashboard layout ────────────────────────────────────────────────

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [module, setModule] = useState('overview');

  const activeNav = navItems.find((item) => item.id === module);
  const ActiveModule = activeNav?.component ?? (() => null);

  return (
    <div className="fixed inset-0 bg-[#0a0f1c] flex font-sans overflow-hidden">

      {/* Sidebar */}
      <Navbar
        module={module}
        setModule={setModule}
        sidebarOpen={sidebarOpen}
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
        <main className="flex-1 overflow-y-auto p-8">
          <ActiveModule />
        </main>

      </div>
    </div>
  );
};

// ── Route guard ───────────────────────────────────────────────────────────────
// Redirects to /login if the user is not authenticated.

const ProtectedRoute = ({ children }: { children: any }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0f1c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => {
  return (
    <Routes>
    
      <Route path="/login" element={<Login />} />

      {/* Protected routes — redirect to /login if not authenticated */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;