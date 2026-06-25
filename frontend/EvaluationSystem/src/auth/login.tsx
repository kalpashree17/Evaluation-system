import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Role-based redirect will be handled in App.tsx
      navigate('/'); // Will redirect based on role
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#141928] border border-[#1e2943] rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">IQ</span>
            </div>
            <h1 className="text-white text-2xl font-bold">Welcome Back</h1>
            <p className="text-slate-400 mt-1">Sign in to continue to InterviewIQ</p>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
              Create one
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-[#0f1623] border border-[#1e2943] rounded-xl">
            <p className="text-slate-400 text-xs mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-slate-300">
              <p>Admin: admin@interviewiq.com / admin123</p>
              <p>Candidate: candidate@interviewiq.com / candidate123</p>
              <p>Interviewer: interviewer@interviewiq.com / interviewer123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;