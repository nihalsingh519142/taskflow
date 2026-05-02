import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/UI';

export default function AuthPage({ mode }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await signup(form);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.[0]?.msg
        || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <div className="auth-logo-text">TaskFlow</div>
            <div className="auth-tagline">Team Task Manager</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
          {isLogin ? 'Sign in to continue to your workspace' : 'Join TaskFlow and start collaborating'}
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" placeholder="John Doe" value={form.name} onChange={set('name')} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="select" value={form.role} onChange={set('role')}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <Loader /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/signup' : '/login'} style={{ color: 'var(--accent2)', fontWeight: 600, textDecoration: 'none' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>

        {isLogin && (
          <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Demo Credentials</div>
            <div>Admin: <span style={{ color: 'var(--accent2)' }}>admin@demo.com</span> / <span style={{ color: 'var(--accent2)' }}>demo123</span></div>
            <div>Member: <span style={{ color: 'var(--accent2)' }}>member@demo.com</span> / <span style={{ color: 'var(--accent2)' }}>demo123</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
