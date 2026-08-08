import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/axiosInstance';

function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } } | null)?.response?.data;
  return data?.message || fallback;
}

type Role = 'admin' | 'user';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  // phone?: string;
}

const roleDescriptions: Record<Role, string> = {
  user: 'Apply for positions, take interviews, and track your progress.',
  admin: 'Full system access — manage users, roles, and analytics.',
};

const roles: { value: Role; label: string; icon: string }[] = [
  { value: 'user', label: 'User', icon: '👤' },
  { value: 'admin', label: 'Admin', icon: '🛡️' },
];

const features = [
  {
    icon: '🎥',
    title: 'Live interview rooms',
    desc: 'Built-in code editor and screen share.',
  },
  {
    icon: '📊',
    title: 'User analytics',
    desc: 'Score, compare and shortlist at a glance.',
  },
  {
    icon: '🤝',
    title: 'Team collaboration',
    desc: 'Share feedback and notes in real time.',
  },
];

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'user', 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'password') checkStrength(value);
  };

  const checkStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    setPwStrength(score);
  };

  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const strengthLabels = ['Too short', 'Fair', 'Good', 'Strong'];

  // ── POST /auth/register ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
       
      });

   
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  /* ─── shared class strings ─── */
  const inputClass =
    'w-full bg-[#0b1120] border border-[#1e2d4a] text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all placeholder:text-[#3a4d6a]';

  const labelClass = 'block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide uppercase';

  const sectionHeadingClass =
    'text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500 mt-6 mb-3 pb-2 border-b border-[#1e2d4a]';

  return (
    <div className="min-h-screen bg-[#070d1a] flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] min-h-screen bg-[#0a1020] border-r border-[#13213a] p-10">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <span className="text-white text-xs font-black tracking-tight">PW</span>
          </div>
          <span className="text-white text-base font-semibold tracking-tight">PrepWise</span>
        </div>

        {/* Hero copy */}
        <div className="my-auto py-12">
          {/* Eyebrow */}
          <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-5">
            — Hiring Platform
          </p>

          <h1 className="text-white text-4xl font-bold leading-[1.15] mb-6">
            The smarter way to{' '}
            <span className="text-violet-400">interview</span>{' '}
            and hire
          </h1>

          <p className="text-slate-400 text-[15px] leading-relaxed mb-10 max-w-xs">
            Set up your account in under two minutes. No credit card required.
          </p>

          {/* Feature list */}
          <ul className="space-y-5">
            {features.map(f => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#111b33] border border-[#1e2d4a] flex items-center justify-center shrink-0 text-base">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-snug">{f.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="text-slate-600 text-[11px]">
          © {new Date().getFullYear()} PrepWise. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto py-10 px-6">
        <div className="w-full max-w-[520px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">PW</span>
            </div>
            <span className="text-white text-sm font-semibold">PrepWise</span>
          </div>

          {/* Form header */}
          <div className="mb-7">
            <h2 className="text-white text-2xl font-bold tracking-tight">Create an account</h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Already have one?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── PERSONAL DETAILS ── */}
            <p className={sectionHeadingClass}>Personal Details</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full name</label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleChange} className={inputClass}
                  placeholder="Jane Smith" required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleChange} className={inputClass}
                  placeholder="jane@example.com" required
                  autoComplete="email"
                />
              </div>
              {/* <div className="col-span-2">
                <label className={labelClass}>
                  Phone{' '}
                  <span className="text-slate-600 normal-case font-normal tracking-normal">(optional)</span>
                </label>
                <input
                  type="tel" name="phone" value={formData.phone}
                  onChange={handleChange} className={inputClass}
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                />
              </div> */}
            </div>

            {/* ── YOUR ROLE ── */}
            <p className={sectionHeadingClass}>Your Role</p>

            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: r.value }))}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl py-3.5 px-2 border transition-all cursor-pointer
                    ${formData.role === r.value
                      ? 'border-violet-500 bg-violet-500/10 shadow-sm shadow-violet-900/30'
                      : 'border-[#1e2d4a] bg-[#0b1120] hover:border-[#2d4270]'
                    }`}
                >
                  {formData.role === r.value && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                  )}
                  <span className="text-xl leading-none">{r.icon}</span>
                  <span className={`text-[11.5px] font-semibold ${
                    formData.role === r.value ? 'text-violet-300' : 'text-slate-500'
                  }`}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
              {roleDescriptions[formData.role]}
            </p>

            {/* ── SECURITY ── */}
            <p className={sectionHeadingClass}>Security</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password" name="password" value={formData.password}
                  onChange={handleChange} className={inputClass}
                  placeholder="Min 6 characters" required minLength={6}
                  autoComplete="new-password"
                />
                {formData.password && (
                  <>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="flex-1 h-[3px] rounded-full transition-all duration-300"
                          style={{
                            background: i < pwStrength
                              ? strengthColors[pwStrength - 1]
                              : '#1e2d4a',
                          }}
                        />
                      ))}
                    </div>
                    <p
                      className="text-[10.5px] mt-1 font-medium"
                      style={{ color: strengthColors[pwStrength - 1] }}
                    >
                      {strengthLabels[pwStrength - 1]}
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirm</label>
                <input
                  type="password" name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} className={inputClass}
                  placeholder="Repeat password" required
                  autoComplete="new-password"
                />
                {formData.confirmPassword && formData.password && (
                  <p
                    className="text-[10.5px] mt-1.5 font-medium"
                    style={{
                      color: formData.password === formData.confirmPassword
                        ? '#22c55e'
                        : '#ef4444',
                    }}
                  >
                    {formData.password === formData.confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/25 text-red-400 px-3.5 py-2.5 rounded-xl text-[12.5px] flex items-center gap-2">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create account →'
              )}
            </button>

            {/* Footer legal */}
            <p className="text-center text-[11px] text-slate-600 mt-4 leading-relaxed">
              By signing up you agree to our{' '}
              <a href="#" className="text-slate-500 hover:text-slate-400 underline underline-offset-2 transition-colors">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-slate-500 hover:text-slate-400 underline underline-offset-2 transition-colors">Privacy Policy</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;