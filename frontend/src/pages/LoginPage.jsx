import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import useAuth from '../hooks/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await authService.login({ email, password });
      login(data);
      navigate(data.user.role === 'passenger' ? '/passenger' : '/driver');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-primary-card p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-text-primary mb-6 text-center">Login</h2>
        {error && <div className="bg-error/20 text-error p-3 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-text-secondary mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none" />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none" />
          </div>
          <button type="submit" className="w-full bg-primary-accent text-primary-bg font-bold py-3 rounded mt-2 hover:bg-accent-dark transition">
            Sign In
          </button>
        </form>
        <p className="text-text-secondary text-center mt-4">
          Don't have an account? <Link to="/register" className="text-primary-accent">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
