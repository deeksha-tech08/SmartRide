import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Create a custom icon for the driver
const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', // A simple car icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const DriverMarker = ({ driver }) => {
  return (
    <Marker position={[driver.lat, driver.lng]} icon={carIcon}>
      <Popup>
        <div className="text-center text-slate-800">
          <strong>{driver.vehicle_model}</strong>
          <br />
          {driver.distance_km ? `${driver.distance_km} km away` : 'Nearby'}
        </div>
      </Popup>
    </Marker>
  );
};

export default DriverMarker;
