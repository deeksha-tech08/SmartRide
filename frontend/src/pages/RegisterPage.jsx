import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import useAuth from '../hooks/useAuth';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'passenger' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await authService.register(formData);
      login(data);
      navigate(data.user.role === 'passenger' ? '/passenger' : '/driver');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-primary-card p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-text-primary mb-6 text-center">Register</h2>
        {error && <div className="bg-error/20 text-error p-3 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-text-secondary mb-1">Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none" />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none" />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Password</label>
            <input type="password" name="password" required minLength="6" value={formData.password} onChange={handleChange}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none" />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Role</label>
            <select name="role" value={formData.role} onChange={handleChange}
              className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-primary-accent outline-none">
              <option value="passenger">Passenger</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-primary-accent text-primary-bg font-bold py-3 rounded mt-2 hover:bg-accent-dark transition">
            Create Account
          </button>
        </form>
        <p className="text-text-secondary text-center mt-4">
          Already have an account? <Link to="/login" className="text-primary-accent">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
