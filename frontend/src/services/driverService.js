import api from './api';

const driverService = {
  getProfile: async () => {
    const response = await api.get('/drivers/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.post('/drivers/profile', profileData);
    return response.data;
  },
  goOnline: async () => {
    const response = await api.post('/drivers/go-online');
    return response.data;
  },
  goOffline: async () => {
    const response = await api.post('/drivers/go-offline');
    return response.data;
  }
};

export default driverService;
