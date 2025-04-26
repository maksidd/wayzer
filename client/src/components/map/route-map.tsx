import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { PlusIcon, MinusIcon, MapPin } from 'lucide-react';
import { Route } from '@shared/schema';

interface RouteMapProps {
  routes: Route[];
  selectedRouteId: number | null;
  onRouteSelect: (routeId: number) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function RouteMap({ routes, selectedRouteId, onRouteSelect }: RouteMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const pathsRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google || googleMapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40, lng: 0 }, // Default center
      zoom: 3,
      mapTypeId: 'roadmap',
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
    });

    googleMapRef.current = map;
    setMapLoaded(true);
  }, []);

  // Add route markers and paths to the map
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !routes.length) return;

    const map = googleMapRef.current;
    const infoWindow = new window.google.maps.InfoWindow();
    const bounds = new window.google.maps.LatLngBounds();

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Clear existing paths
    pathsRef.current.forEach(path => path.setMap(null));
    pathsRef.current.clear();

    // Add markers and paths for each route
    routes.forEach(route => {
      if (!route.startLat || !route.startLng || !route.endLat || !route.endLng) return;
      
      const startLatLng = new window.google.maps.LatLng(
        parseFloat(route.startLat), 
        parseFloat(route.startLng)
      );
      
      const endLatLng = new window.google.maps.LatLng(
        parseFloat(route.endLat), 
        parseFloat(route.endLng)
      );

      // Create start marker
      const startMarker = new window.google.maps.Marker({
        position: startLatLng,
        map,
        title: route.startPoint,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        }
      });

      // Create end marker
      const endMarker = new window.google.maps.Marker({
        position: endLatLng,
        map,
        title: route.endPoint,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        }
      });

      // Add info window to markers
      const routeInfo = `
        <div style="width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 5px;">${route.title}</h3>
          <p style="font-size: 12px; margin-bottom: 5px;">${route.startPoint} → ${route.endPoint}</p>
          <p style="font-size: 12px;">${new Date(route.date).toLocaleDateString()}</p>
        </div>
      `;

      startMarker.addListener('click', () => {
        infoWindow.setContent(routeInfo);
        infoWindow.open(map, startMarker);
        onRouteSelect(route.id);
      });

      endMarker.addListener('click', () => {
        infoWindow.setContent(routeInfo);
        infoWindow.open(map, endMarker);
        onRouteSelect(route.id);
      });

      // Draw path between start and end
      const path = new window.google.maps.Polyline({
        path: [startLatLng, endLatLng],
        geodesic: true,
        strokeColor: route.id === selectedRouteId ? '#2563EB' : '#999999',
        strokeOpacity: route.id === selectedRouteId ? 1.0 : 0.7,
        strokeWeight: route.id === selectedRouteId ? 4 : 2,
        map
      });

      path.addListener('click', () => {
        onRouteSelect(route.id);
      });

      // Store markers and path
      markersRef.current.set(route.id, startMarker);
      markersRef.current.set(-route.id, endMarker); // Use negative ID for end marker
      pathsRef.current.set(route.id, path);

      // Extend bounds
      bounds.extend(startLatLng);
      bounds.extend(endLatLng);
    });

    // Fit map to bounds if there are routes
    if (routes.length > 0) {
      map.fitBounds(bounds);
    }
  }, [routes, mapLoaded, selectedRouteId, onRouteSelect]);

  // Update path styling when selected route changes
  useEffect(() => {
    if (!mapLoaded || !selectedRouteId) return;

    pathsRef.current.forEach((path, routeId) => {
      path.setOptions({
        strokeColor: routeId === selectedRouteId ? '#2563EB' : '#999999',
        strokeOpacity: routeId === selectedRouteId ? 1.0 : 0.7,
        strokeWeight: routeId === selectedRouteId ? 4 : 2,
      });
    });
  }, [selectedRouteId, mapLoaded]);

  // Zoom in button
  const handleZoomIn = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
    }
  };

  // Zoom out button
  const handleZoomOut = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
    }
  };

  // Center on user location
  const handleCenterOnUser = () => {
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          googleMapRef.current?.setCenter(userLatLng);
          googleMapRef.current?.setZoom(13);
        },
        () => {
          // Handle geolocation error
          alert(t('map.location_error'));
        }
      );
    } else {
      alert(t('map.geolocation_not_supported'));
    }
  };

  return (
    <div className="map-container bg-gray-100 rounded-lg overflow-hidden relative" ref={mapRef}>
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <i className="fas fa-map-marked-alt text-5xl text-gray-400 mb-3"></i>
            <p className="text-gray-500 text-sm">{t('map.loading')}</p>
          </div>
        </div>
      )}
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 border-t border-gray-200"
          onClick={handleZoomOut}
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 border-t border-gray-200"
          onClick={handleCenterOnUser}
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
