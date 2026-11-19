import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import driverService from '../services/driverService';
import socketService from '../services/socketService';
import { useLocation } from '../hooks/useLocation';
import rideService from '../services/rideService';

import { Link } from 'react-router-dom';

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Track location ONLY if driver is online
  const { location, error: locError } = useLocation(profile?.status === 'online');

  const [formData, setFormData] = useState({
    vehicle_model: '',
    license_plate: '',
    capacity: 4
  });

  // Active Ride State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);

  useEffect(() => {
    fetchProfile();
    socketService.connect(localStorage.getItem('token'));
    
    socketService.on('new_ride_request', (data) => {
      // If we already have an active ride, ignore new requests
      if (!activeRide) {
        setIncomingRequests(prev => [...prev, data]);
      }
    });
    
    return () => {
      socketService.off('new_ride_request');
      socketService.disconnect();
    };
  }, [activeRide]);

  // Send continuous location updates via Socket.IO
  useEffect(() => {
    if (profile?.status === 'online' && location) {
      socketService.emit('driver:location_update', {
        driver_id: profile.id,
        lat: location.lat,
        lng: location.lng
      });
    }
  }, [location, profile?.status, profile?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await driverService.getProfile();
      setProfile(data);
      setFormData({
        vehicle_model: data.vehicle_model,
        license_plate: data.license_plate,
        capacity: data.capacity
      });
    } catch (err) {
      if (err.response?.status !== 404) setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await driverService.updateProfile(formData);
      setProfile(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const toggleStatus = async () => {
    try {
      if (profile.status === 'offline') {
        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const data = await driverService.goOnline();
            setProfile(data);
            setError('');
            
            socketService.emit('driver:go_online', {
              driver_id: data.id,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (err) => setError('Failed to get location. Cannot go online.')
        );
      } else {
        const data = await driverService.goOffline();
        setProfile(data);
        socketService.emit('driver:go_offline', { driver_id: profile.id });
        setError('');
        setIncomingRequests([]); // Clear incoming when offline
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  const acceptRequest = async (rideId) => {
    try {
      setError('');
      const ride = await rideService.acceptRide(rideId);
      setActiveRide(ride);
      setIncomingRequests([]); // clear others
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept ride. Another driver may have taken it.');
      setIncomingRequests(prev => prev.filter(r => r.id !== rideId));
    }
  };

  const updateStatus = async (status) => {
    try {
      setError('');
      const ride = await rideService.updateRideStatus(activeRide.id, status);
      setActiveRide(ride);
      if (status === 'completed') {
        setTimeout(() => setActiveRide(null), 3000); // Clear after 3s
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-warning">Driver Dashboard</h1>
        <div className="flex gap-4">
          <Link to="/history" className="px-4 py-2 bg-slate-600 text-white font-bold rounded hover:bg-slate-700 transition">View History</Link>
          <button onClick={logout} className="px-4 py-2 bg-error text-white font-bold rounded hover:bg-red-600 transition">Logout</button>
        </div>
      </div>

      {error && <div className="bg-error/20 text-error p-3 rounded mb-4">{error}</div>}
      {locError && <div className="bg-error/20 text-error p-3 rounded mb-4">Location Error: {locError}</div>}

      {!profile ? (
        <div className="bg-primary-card p-6 rounded-lg shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Vehicle Model</label>
              <input type="text" required value={formData.vehicle_model} onChange={e => setFormData({...formData, vehicle_model: e.target.value})} className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-warning outline-none" />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">License Plate</label>
              <input type="text" required value={formData.license_plate} onChange={e => setFormData({...formData, license_plate: e.target.value})} className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-warning outline-none" />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Capacity (Passengers)</label>
              <input type="number" min="1" max="8" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full bg-primary-bg border border-slate-600 rounded p-2 text-text-primary focus:border-warning outline-none" />
            </div>
            <button type="submit" className="w-full bg-warning text-primary-bg font-bold py-3 rounded mt-2 hover:bg-yellow-600 transition">Save Profile</button>
          </form>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-primary-card p-6 rounded-lg shadow-lg border border-slate-700 flex flex-col">
            {activeRide ? (
              <div>
                <h2 className="text-2xl font-bold text-primary-accent mb-4">Active Ride</h2>
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-800 p-4 rounded text-center">
                     <h3 className="text-lg font-bold uppercase">{activeRide.status}</h3>
                  </div>
                  <div className="flex justify-between border-b border-slate-600 pb-2">
                    <span className="text-text-secondary">Distance</span>
                    <span className="font-bold">{activeRide.distance_km} km</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-600 pb-2">
                    <span className="text-text-secondary">Fare</span>
                    <span className="font-bold text-warning">₹{activeRide.fare}</span>
                  </div>
                </div>
                
                {activeRide.status === 'accepted' && (
                  <button onClick={() => updateStatus('arriving')} className="w-full py-3 bg-primary-accent text-primary-bg font-bold rounded">Head to Pickup</button>
                )}
                {activeRide.status === 'arriving' && (
                  <button onClick={() => updateStatus('arrived')} className="w-full py-3 bg-primary-accent text-primary-bg font-bold rounded">Mark Arrived</button>
                )}
                {activeRide.status === 'arrived' && (
                  <button onClick={() => updateStatus('started')} className="w-full py-3 bg-primary-accent text-primary-bg font-bold rounded">Start Ride</button>
                )}
                {activeRide.status === 'started' && (
                  <button onClick={() => updateStatus('completed')} className="w-full py-3 bg-warning text-primary-bg font-bold rounded">Complete Ride</button>
                )}
                {activeRide.status === 'completed' && (
                  <div className="text-center text-warning font-bold">Ride Completed! Resetting...</div>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4">Availability</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-4 h-4 rounded-full ${profile.status === 'online' ? 'bg-primary-accent' : 'bg-slate-500'}`}></div>
                  <span className="text-xl capitalize">{profile.status.replace('_', ' ')}</span>
                </div>
                <button onClick={toggleStatus} disabled={activeRide != null} className={`w-full py-3 rounded font-bold transition ${profile.status === 'offline' ? 'bg-primary-accent text-primary-bg hover:bg-accent-dark' : 'bg-slate-600 text-white hover:bg-slate-700'} disabled:opacity-50`}>
                  {profile.status === 'offline' ? 'Go Online' : 'Go Offline'}
                </button>
                <p className="text-sm text-text-secondary mt-4">* GPS tracking is {profile.status === 'online' ? 'active' : 'inactive'}.</p>
              </>
            )}
          </div>
          
          <div className="bg-primary-card p-6 rounded-lg shadow-lg border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Incoming Requests</h2>
            {profile.status === 'offline' ? (
              <p className="text-text-secondary">Go online to receive ride requests.</p>
            ) : incomingRequests.length === 0 ? (
              <p className="text-text-secondary">No incoming requests right now.</p>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map(req => (
                  <div key={req.id} className="p-4 border border-slate-600 rounded bg-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{req.distance_km} km</p>
                      <p className="text-warning font-bold text-lg">₹{req.fare}</p>
                    </div>
                    <button 
                      onClick={() => acceptRequest(req.id)}
                      disabled={activeRide != null}
                      className="px-4 py-2 bg-primary-accent text-primary-bg font-bold rounded disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default DriverDashboard;
