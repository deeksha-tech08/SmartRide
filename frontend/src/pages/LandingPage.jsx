import { Link, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const LandingPage = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  
  if (user) {
    return <Navigate to={user.role === 'passenger' ? '/passenger' : '/driver'} replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-6xl font-bold text-primary-accent mb-6">🚗 SmartRide</h1>
      <p className="text-2xl text-text-secondary mb-10 max-w-2xl">
        Real-Time Ride Sharing & AI-Assisted Fare Estimation Platform
      </p>
      <div className="flex gap-4">
        <Link to="/login" className="px-8 py-4 bg-primary-card text-text-primary border border-primary-accent rounded-lg font-bold text-lg hover:bg-slate-700 transition">
          Login
        </Link>
        <Link to="/register" className="px-8 py-4 bg-primary-accent text-primary-bg rounded-lg font-bold text-lg hover:bg-accent-dark transition">
          Register
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
