import { Injectable } from '@nestjs/common';

export interface GeocodingPlace {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Injectable()
export class GeocodingService {
  private readonly userAgent = 'VidaDura/1.0 (lifehub; contact: dev@vidadura.pt)';

  async search(query: string, lang = 'pt', lat?: number, lon?: number): Promise<GeocodingPlace[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const acceptLanguage = lang.startsWith('pt') ? 'pt-PT' : lang.startsWith('en') ? 'en' : lang;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '6');
    if (lat != null && lon != null) {
      url.searchParams.set('viewbox', this.viewbox(lat, lon, 0.15));
      url.searchParams.set('bounded', '0');
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': acceptLanguage,
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as NominatimResult[];
    return data
      .map((place) => ({
        label: place.display_name,
        lat: Number(place.lat),
        lng: Number(place.lon),
      }))
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  }

  private viewbox(lat: number, lon: number, delta: number) {
    const minLon = lon - delta;
    const maxLat = lat + delta;
    const maxLon = lon + delta;
    const minLat = lat - delta;
    return `${minLon},${maxLat},${maxLon},${minLat}`;
  }
}
