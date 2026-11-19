import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import rideService from '../services/rideService';
import useAuth from '../hooks/useAuth';

const RideHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await rideService.getRideHistory();
      setHistory(data);
    } catch (err) {
      setError('Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <div className="p-8 text-center text-primary-accent">Loading history...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-accent">Ride History</h1>
        <Link 
          to={user?.role === 'passenger' ? '/passenger' : '/driver'} 
          className="px-4 py-2 bg-slate-600 text-white rounded font-bold hover:bg-slate-700 transition"
        >
          Back to Dashboard
        </Link>
      </div>

      {error && <div className="bg-error/20 text-error p-3 rounded mb-4">{error}</div>}

      {history.length === 0 ? (
        <div className="bg-primary-card p-6 rounded-lg text-center border border-slate-700">
          <p className="text-text-secondary">No completed rides found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((ride) => (
            <div key={ride.id} className="bg-primary-card p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary-accent text-primary-bg px-2 py-1 text-xs font-bold rounded uppercase">
                    {ride.status}
                  </span>
                  <span className="text-text-secondary text-sm">{formatDate(ride.created_at)}</span>
                </div>
                <div className="text-sm space-y-1 mb-2">
                  <p><span className="text-text-secondary">Pickup:</span> {ride.pickup.lat.toFixed(4)}, {ride.pickup.lng.toFixed(4)}</p>
                  <p><span className="text-text-secondary">Dest:</span> {ride.destination.lat.toFixed(4)}, {ride.destination.lng.toFixed(4)}</p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end justify-center border-t md:border-t-0 md:border-l border-slate-600 pt-2 md:pt-0 md:pl-4">
                <div className="text-2xl font-bold text-warning">₹{ride.fare}</div>
                <div className="text-text-secondary text-sm">{ride.distance_km} km</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideHistory;
