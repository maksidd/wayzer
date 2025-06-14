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
    initMap: () => void;
  }
}

export default function RouteMap({ routes, selectedRouteId, onRouteSelect }: RouteMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const pathsRef = useRef<Map<number, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Загрузка Google Maps script
  useEffect(() => {
    if (window.google?.maps || document.getElementById('google-maps-script')) {
      setScriptLoaded(true);
      return;
    }

    // Создаем глобальную функцию обратного вызова
    window.initMap = () => {
      setScriptLoaded(true);
    };

    // Создаем элемент скрипта
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Google Maps script failed to load');
    };

    // Добавляем скрипт в head документа
    document.head.appendChild(script);

    return () => {
      window.initMap = () => {}; // Очищаем глобальную функцию
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || googleMapRef.current) return;
    
    try {
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded');
        return;
      }
      
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
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, [scriptLoaded]);

  // Add route markers and paths to the map
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    if (!routes || routes.length === 0) return;

    try {
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
        
        try {
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
        } catch (err) {
          console.error('Error processing route:', route.id, err);
        }
      });

      // Fit map to bounds if there are routes
      if (routes.length > 0) {
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error('Error setting up map routes:', error);
    }
  }, [routes, mapLoaded, selectedRouteId, onRouteSelect]);

  // Update path styling when selected route changes
  useEffect(() => {
    if (!mapLoaded || !selectedRouteId) return;
    
    try {
      pathsRef.current.forEach((path, routeId) => {
        path.setOptions({
          strokeColor: routeId === selectedRouteId ? '#2563EB' : '#999999',
          strokeOpacity: routeId === selectedRouteId ? 1.0 : 0.7,
          strokeWeight: routeId === selectedRouteId ? 4 : 2,
        });
      });
    } catch (error) {
      console.error('Error updating path styling:', error);
    }
  }, [selectedRouteId, mapLoaded]);

  // Zoom in button
  const handleZoomIn = () => {
    try {
      if (googleMapRef.current) {
        googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
      }
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  };

  // Zoom out button
  const handleZoomOut = () => {
    try {
      if (googleMapRef.current) {
        googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
      }
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  };

  // Center on user location
  const handleCenterOnUser = () => {
    try {
      if (navigator.geolocation && googleMapRef.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const userLatLng = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              googleMapRef.current?.setCenter(userLatLng);
              googleMapRef.current?.setZoom(13);
            } catch (error) {
              console.error('Error centering map:', error);
            }
          },
          () => {
            // Handle geolocation error
            console.error('Geolocation error');
            alert(t('map.location_error'));
          }
        );
      } else {
        alert(t('map.geolocation_not_supported'));
      }
    } catch (error) {
      console.error('Error accessing geolocation:', error);
    }
  };

  return (
    <div className="map-container h-[350px] md:h-[450px] lg:h-[550px] bg-gray-100 rounded-lg overflow-hidden relative shadow-sm" ref={mapRef}>
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{t('map.loading')}</p>
          </div>
        </div>
      )}
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md z-10">
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
