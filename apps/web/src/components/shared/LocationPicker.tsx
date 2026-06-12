import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2 } from 'lucide-react';
import { Input, cn } from '@lifehub/ui';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import { ThemeMapTileLayer } from '@/components/shared/ThemeMapLayers';
import { api } from '@/lib/api';
import { createPrimaryMarkerIcon } from '@/lib/map-theme';
import type { GeocodingPlace } from '@lifehub/types';
import 'leaflet/dist/leaflet.css';

const markerIcon = createPrimaryMarkerIcon();

export interface LocationValue {
  location: string;
  locationLat: number | null;
  locationLng: number | null;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  placeholder?: string;
  id?: string;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({ value, onChange, placeholder, id }: LocationPickerProps) {
  const { t, i18n } = useTranslation();
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const listId = `${inputId}-results`;
  const [query, setQuery] = useState(value.location);
  const [results, setResults] = useState<GeocodingPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value.location);
  }, [value.location]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (trimmed === value.location.trim() && value.locationLat != null && value.locationLng != null) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const places = await api.searchLocations(
          trimmed,
          i18n.language === 'pt-PT' ? 'pt' : 'en',
          value.locationLat ?? undefined,
          value.locationLng ?? undefined,
        );
        setResults(places);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, i18n.language, value.location, value.locationLat, value.locationLng]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPlace = (place: GeocodingPlace) => {
    setQuery(place.label);
    setResults([]);
    setIsOpen(false);
    onChange({
      location: place.label,
      locationLat: place.lat,
      locationLng: place.lng,
    });
  };

  const handleInputChange = (next: string) => {
    setQuery(next);
    setIsOpen(true);
    onChange({
      location: next,
      locationLat: null,
      locationLng: null,
    });
  };

  const showMap = value.locationLat != null && value.locationLng != null;

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listId}
          value={query}
          placeholder={placeholder}
          className="pl-9 pr-9"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (!isOpen || results.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (e.key === 'Enter' && activeIndex >= 0) {
              e.preventDefault();
              selectPlace(results[activeIndex]);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('eventHub.locationNoResults')}</p>
      )}

      {isOpen && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-md"
        >
          {results.map((place, index) => (
            <li key={`${place.lat}-${place.lng}-${place.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                  index === activeIndex && 'bg-accent',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlace(place)}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showMap && (
        <div className="theme-map overflow-hidden rounded-lg border">
          <MapContainer
            center={[value.locationLat!, value.locationLng!]}
            zoom={15}
            scrollWheelZoom={false}
            className="h-40 w-full"
          >
            <ThemeMapTileLayer />
            <MapRecenter lat={value.locationLat!} lng={value.locationLng!} />
            <Marker position={[value.locationLat!, value.locationLng!]} icon={markerIcon} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
