import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icons for Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface RoutePoint {
  lat: number;
  lng: number;
}

interface RouteDisplayMapProps {
  route: RoutePoint[];
  center?: RoutePoint;
  className?: string;
}

// Component for automatic map bounds fitting to route
function FitBounds({ route }: { route: RoutePoint[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route.map(point => [point.lat, point.lng]));
      // Add small padding around route
      const paddedBounds = bounds.pad(0.1);
      map.fitBounds(paddedBounds);
    }
  }, [map, route]);
  
  return null;
}

export function RouteDisplayMap({ route, center, className = "" }: RouteDisplayMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // If no route, don't show map
  if (!route || route.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div style={{ height: '300px', width: '100%', border: '2px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
          <p className="text-gray-500">Route not set</p>
        </div>
      </div>
    );
  }

  // Determine map center - either passed or route center
  const mapCenter = center || {
    lat: route.reduce((sum, point) => sum + point.lat, 0) / route.length,
    lng: route.reduce((sum, point) => sum + point.lng, 0) / route.length
  };

  // Calculate route bounds to determine initial zoom
  const calculateBounds = () => {
    if (route.length === 0) return null;
    
    const lats = route.map(p => p.lat);
    const lngs = route.map(p => p.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  };

  const bounds = calculateBounds();
  
  // Determine appropriate zoom based on route size
  const calculateZoom = () => {
    if (!bounds || route.length <= 1) return 13;
    
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    // Adjust zoom depending on area size
    if (maxDiff > 1) return 8;
    if (maxDiff > 0.5) return 9;
    if (maxDiff > 0.1) return 11;
    if (maxDiff > 0.05) return 12;
    if (maxDiff > 0.01) return 13;
    return 14;
  };

  const initialZoom = calculateZoom();

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div style={{ height: '300px', width: '100%', border: '2px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[300px] rounded-lg border border-gray-200 bg-white ${className}`}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={initialZoom}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
        ref={mapRef}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {/* Zoom buttons on the right */}
        <ZoomControl position="topright" />
        {/* Automatic bounds fitting to route */}
        <FitBounds route={route} />
        {/* Markers for each route point */}
        {route.map((point, index) => {
          let title = `Point ${index + 1}`;
          if (index === 0) title = 'Route start';
          if (index === route.length - 1 && route.length > 1) title = 'Route end';
          return (
            <Marker
              key={index}
              position={[point.lat, point.lng]}
              title={title}
            />
          );
        })}
        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            positions={route.map(point => [point.lat, point.lng])}
            color="#2563eb"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}