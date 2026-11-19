import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import socketService from '../services/socketService';
import { useLocation } from '../hooks/useLocation';
import LiveMap from '../components/map/LiveMap';
import api from '../services/api';
import aiService from '../services/aiService';
import rideService from '../services/rideService';

import { Link } from 'react-router-dom';

const PassengerDashboard = () => {
  const { user, logout } = useAuth();
  const { location, error: locationError } = useLocation();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fare Estimation & Booking State
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [fareEstimate, setFareEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  
  // Active Ride State
  const [activeRide, setActiveRide] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const fetchNearbyDrivers = async (lat, lng) => {
    try {
      setLoading(true);
      const response = await api.get(`/drivers/nearby?lat=${lat}&lng=${lng}&radius_km=10`);
      setDrivers(response.data);
    } catch (err) {
      console.error("Failed to fetch drivers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    socketService.connect(localStorage.getItem('token'));

    if (location && !activeRide) {
      fetchNearbyDrivers(location.lat, location.lng);
    }

    socketService.on('driver_location_update', (data) => {
      setDrivers((prev) => {
        const exists = prev.find(d => d.driver_id === data.driver_id);
        if (exists) {
          return prev.map(d => d.driver_id === data.driver_id ? { ...d, lat: data.lat, lng: data.lng } : d);
        } else {
          return [...prev, data];
        }
      });
    });

    socketService.on('driver_offline', (data) => {
      setDrivers((prev) => prev.filter(d => d.driver_id !== data.driver_id));
    });

    socketService.on('ride_accepted', (data) => {
      if (data.passenger_id === user.id) {
        setActiveRide(data);
      }
    });

    socketService.on('ride_status_update', (data) => {
      if (data.passenger_id === user.id) {
        setActiveRide(data);
        if (data.status === 'completed') {
          setTimeout(() => {
            setActiveRide(null);
            setPickup(null);
            setDestination(null);
            setFareEstimate(null);
          }, 5000);
        }
      }
    });

    return () => {
      socketService.off('driver_location_update');
      socketService.off('driver_offline');
      socketService.off('ride_accepted');
      socketService.off('ride_status_update');
      socketService.disconnect();
    };
  }, [location, user.id, activeRide]);

  const handleMapClick = (latlng) => {
    if (activeRide) return; // Disable clicks during active ride
    if (!pickup) setPickup(latlng);
    else if (!destination) setDestination(latlng);
  };

  const clearSelection = () => {
    if (activeRide) return;
    setPickup(null);
    setDestination(null);
    setFareEstimate(null);
    setEstimateError('');
  };

  const getFareEstimate = async () => {
    if (!pickup || !destination) return;
    try {
      setEstimating(true);
      setEstimateError('');
      const response = await aiService.estimateFare(pickup.lat, pickup.lng, destination.lat, destination.lng);
      setFareEstimate(response);
    } catch (err) {
      setEstimateError(err.response?.data?.detail || 'Failed to estimate fare');
    } finally {
      setEstimating(false);
    }
  };

  const requestRide = async () => {
    try {
      setRequesting(true);
      setEstimateError('');
      const response = await rideService.requestRide(pickup.lat, pickup.lng, destination.lat, destination.lng);
      setActiveRide(response);
    } catch (err) {
      setEstimateError(err.response?.data?.detail || 'Failed to request ride');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary-accent">Passenger Dashboard</h1>
        <div className="flex gap-4">
          <Link to="/history" className="px-4 py-2 bg-slate-600 text-white font-bold rounded hover:bg-slate-700 transition">View History</Link>
          <button onClick={logout} className="px-4 py-2 bg-error text-white font-bold rounded hover:bg-red-600 transition">Logout</button>
        </div>
      </div>
      
      {locationError && <div className="bg-error/20 text-error p-3 rounded mb-4">Location Error: {locationError}</div>}
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-primary-card p-4 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-bold mb-4">Live Map</h2>
          <p className="text-sm text-text-secondary mb-2">{activeRide ? 'Ride in progress...' : 'Click on the map to set Pickup and Destination.'}</p>
          <LiveMap center={location} drivers={drivers} pickup={pickup} destination={destination} onMapClick={handleMapClick} />
          <div className="mt-4 text-text-secondary text-sm flex justify-between">
            <span>{!activeRide && `${drivers.length} drivers nearby`}</span>
            <span>{location ? 'GPS Active' : 'Waiting for GPS...'}</span>
          </div>
        </div>

        <div className="bg-primary-card p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col">
          <h2 className="text-xl font-bold mb-4">{activeRide ? 'Active Ride' : 'Book a Ride'}</h2>
          
          {activeRide ? (
             <div className="space-y-4">
               <div className="bg-slate-800 p-4 rounded text-center">
                 <h3 className="text-lg font-bold text-primary-accent uppercase">{activeRide.status.replace('_', ' ')}</h3>
                 {activeRide.status === 'requested' && <p className="text-sm">Waiting for a driver to accept...</p>}
                 {activeRide.status === 'accepted' && <p className="text-sm">A driver has accepted your ride!</p>}
                 {activeRide.status === 'arriving' && <p className="text-sm">Driver is on the way to pickup.</p>}
                 {activeRide.status === 'arrived' && <p className="text-sm">Driver has arrived.</p>}
                 {activeRide.status === 'started' && <p className="text-sm">Ride in progress.</p>}
                 {activeRide.status === 'completed' && <p className="text-sm text-warning font-bold mt-2">Ride Completed! Resetting map...</p>}
               </div>
               <div className="flex justify-between border-b border-slate-600 pb-2">
                 <span className="text-text-secondary">Distance</span>
                 <span className="font-bold">{activeRide.distance_km} km</span>
               </div>
               <div className="flex justify-between border-b border-slate-600 pb-2">
                 <span className="text-text-secondary">Fare</span>
                 <span className="font-bold text-warning">₹{activeRide.fare}</span>
               </div>
               {activeRide.driver_id && (
                 <div className="text-sm text-center pt-2">Driver Assigned</div>
               )}
             </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="p-3 border border-slate-600 rounded bg-primary-bg">
                  <p className="text-xs text-text-secondary">Pickup Location</p>
                  <p className="font-mono text-sm">{pickup ? `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : 'Not Selected'}</p>
                </div>
                <div className="p-3 border border-slate-600 rounded bg-primary-bg">
                  <p className="text-xs text-text-secondary">Destination</p>
                  <p className="font-mono text-sm">{destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Not Selected'}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={clearSelection} className="flex-1 py-2 bg-slate-600 text-white rounded font-bold hover:bg-slate-700 transition">Clear</button>
                <button onClick={getFareEstimate} disabled={!pickup || !destination || estimating} className="flex-1 py-2 bg-slate-200 text-slate-900 rounded font-bold hover:bg-white transition disabled:opacity-50">
                  {estimating ? 'Estimating...' : 'Get Estimate'}
                </button>
              </div>

              {estimateError && <div className="text-error text-sm mb-4 bg-error/10 p-2 rounded">{estimateError}</div>}

              {fareEstimate && (
                <div className="mt-auto border-t border-slate-600 pt-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Distance</span>
                    <span className="font-bold">{fareEstimate.distance_km} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Estimated Fare</span>
                    <span className="text-2xl font-bold text-warning">₹{fareEstimate.total_fare}</span>
                  </div>
                  <button 
                    onClick={requestRide} 
                    disabled={requesting}
                    className="w-full py-3 bg-primary-accent text-primary-bg rounded font-bold hover:bg-accent-dark transition disabled:opacity-50 text-lg"
                  >
                    {requesting ? 'Requesting...' : 'Request Ride'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerDashboard;
