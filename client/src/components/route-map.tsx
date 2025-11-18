import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { X, MapPin } from 'lucide-react';
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

interface RouteMapProps {
  center: RoutePoint;
  route: RoutePoint[];
  onRouteChange: (route: RoutePoint[]) => void;
  className?: string;
}

function MapEventHandler({ onRouteChange, route }: { onRouteChange: (route: RoutePoint[]) => void; route: RoutePoint[] }) {
  useMapEvents({
    click: (e) => {
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      onRouteChange([...route, newPoint]);
    },
  });
  return null;
}

export function RouteMap({ center, route, onRouteChange, className = "" }: RouteMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const clearRoute = () => {
    onRouteChange([]);
  };

  const removeLastPoint = () => {
    if (route.length > 0) {
      onRouteChange(route.slice(0, -1));
    }
  };

  const removePoint = (index: number) => {
    const newRoute = route.filter((_, i) => i !== index);
    onRouteChange(newRoute);
  };

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div style={{ height: '400px', width: '100%', border: '2px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-10 ${className}`}>
      <div className="absolute top-2 right-2 z-[1000] flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={removeLastPoint}
          disabled={route.length === 0}
          className="bg-white"
        >
          Remove point
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={clearRoute}
          disabled={route.length === 0}
          className="bg-white"
        >
          Clear route
        </Button>
      </div>
      
      <div style={{ height: '400px', width: '100%', border: '2px solid #e2e8f0', borderRadius: '8px' }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
           {/* url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" */}
          <MapEventHandler onRouteChange={onRouteChange} route={route} />
          
          {/* Markers for each route point */}
          {route.map((point, index) => (
            <Marker
              key={index}
              position={[point.lat, point.lng]}
              title={`Point ${index + 1}`}
            />
          ))}
          
          {/* Route polyline */}
          {route.length > 1 && (
            <Polyline
              positions={route.map(point => [point.lat, point.lng])}
              color="blue"
              weight={4}
              opacity={0.7}
            />
          )}
        </MapContainer>
      </div>
      
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Click on the map to add route points
          </p>
          <p className="text-sm font-medium text-gray-700">
            Points: {route.length}
          </p>
        </div>
        
        {route.length > 0 && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Route points
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {route.map((point, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-white p-2 rounded border"
                >
                  <span className="text-sm">
                    {index + 1}. {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removePoint(index)}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}