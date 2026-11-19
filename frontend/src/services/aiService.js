import api from './api';

const estimateFare = async (pickupLat, pickupLng, destLat, destLng) => {
  const response = await api.post('/ai/estimate-fare', {
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    dest_lat: destLat,
    dest_lng: destLng
  });
  return response.data;
};

export default {
  estimateFare
};
