import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DriverMarker from './DriverMarker';

// Fix default Leaflet icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
};

const LiveMap = ({ center, drivers = [], pickup, destination, onMapClick }) => {
  if (!center) {
    return <div className="h-64 bg-slate-800 flex items-center justify-center rounded">Loading Map...</div>;
  }

  return (
    <div className="h-96 w-full rounded overflow-hidden border border-slate-700 relative z-0">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Passenger (Current User) Marker */}
        <Marker position={[center.lat, center.lng]}>
          <Popup>You are here</Popup>
        </Marker>
        <Circle center={[center.lat, center.lng]} radius={100} color="#00ff88" fillOpacity={0.2} />

        {/* Selected Pickup */}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]}>
            <Popup>Selected Pickup</Popup>
          </Marker>
        )}
        
        {/* Selected Destination */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Selected Destination</Popup>
          </Marker>
        )}

        {/* Nearby Drivers */}
        {drivers.map(driver => (
          <DriverMarker key={driver.driver_id} driver={driver} />
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
