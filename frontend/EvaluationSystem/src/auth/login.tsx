import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../context/authContext';

function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } } | null)?.response?.data;
  return data?.message || fallback;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // ── POST /auth/login ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await login(email, password);

      // Show login success notification
      message.success('Login successful!');

      // Role-based redirect after successful login
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'user':
          navigate('/user/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
      <div className="w-full max-w-120">
        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">PW</span>
            </div>
            <h1 className="text-white text-2xl font-bold">Welcome Back</h1>
            <p className="text-slate-400 mt-1">Sign in to continue to PrepWise</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm font-medium block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f1623] border border-[#1e2943] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm font-medium block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f1623] border border-[#1e2943] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;