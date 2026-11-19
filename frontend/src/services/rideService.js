import api from './api';

const requestRide = async (pickupLat, pickupLng, destLat, destLng) => {
  const response = await api.post('/rides/request', {
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    dest_lat: destLat,
    dest_lng: destLng
  });
  return response.data;
};

const acceptRide = async (rideId) => {
  const response = await api.post(`/rides/${rideId}/accept`);
  return response.data;
};

const updateRideStatus = async (rideId, status) => {
  const response = await api.post(`/rides/${rideId}/status`, { status });
  return response.data;
};

const getRideHistory = async () => {
  const response = await api.get('/rides/history');
  return response.data;
};

export default {
  requestRide,
  acceptRide,
  updateRideStatus,
  getRideHistory
};
