import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@lifehub/ui';
import { ThemeMapTileLayer } from '@/components/shared/ThemeMapLayers';
import {
  buildCalendarEventLink,
  pickPrimaryLocatedEvent,
  type LocationMapMarker,
} from '@/lib/event-locations';
import { createPrimaryMarkerIcon } from '@/lib/map-theme';
import 'leaflet/dist/leaflet.css';

interface LocationsMapProps {
  markers: LocationMapMarker[];
  selectedLocationKey?: string | null;
  className?: string;
}

function MapFitBounds({ markers }: { markers: LocationMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 11, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 11 });
  }, [markers, map]);

  return null;
}

export function LocationsMap({
  markers,
  selectedLocationKey,
  className,
}: LocationsMapProps) {
  const navigate = useNavigate();

  if (markers.length === 0) {
    return null;
  }

  const defaultCenter: [number, number] = [markers[0].lat, markers[0].lng];

  return (
    <div className={cn('theme-map rounded-xl border', className)}>
      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={false}
        className="h-52 w-full sm:h-60"
      >
        <ThemeMapTileLayer />
        <MapFitBounds markers={markers} />
        {markers.map((marker) => {
          const isSelected = selectedLocationKey === marker.key;
          const primaryEvent = pickPrimaryLocatedEvent(marker.events);

          return (
            <Marker
              key={marker.key}
              position={[marker.lat, marker.lng]}
              icon={createPrimaryMarkerIcon(isSelected)}
              eventHandlers={{
                click: () => {
                  navigate(buildCalendarEventLink(primaryEvent));
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
