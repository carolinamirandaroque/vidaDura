import { parseRecurrenceInstanceId } from '@lifehub/utils';
import type { Event, Task } from '@lifehub/types';

const POSTAL_CODE = /^\d{4,5}(-\d{3})?$/;

export interface LocationCluster {
  key: string;
  city: string;
  country: string | null;
  eventCount: number;
  sampleLocation: string;
}

export interface LocationStats {
  clusters: LocationCluster[];
  uniqueCities: number;
  uniqueCountries: number;
  eventsWithLocation: number;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

export function extractCityFromLocation(location: string): string {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return location.trim();
  if (parts.length === 1) return parts[0];

  const withoutCountry = parts.slice(0, -1);
  let end = withoutCountry.length;
  while (end > 0 && POSTAL_CODE.test(withoutCountry[end - 1])) {
    end -= 1;
  }

  const trimmed = withoutCountry.slice(0, end);
  if (trimmed.length === 0) return parts[parts.length - 1];

  return trimmed[trimmed.length - 1];
}

export function extractCountryFromLocation(location: string): string | null {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function getEventLocationKey(event: Event): string | null {
  const location = event.location?.trim();
  if (!location || event.kind === 'deadline') return null;

  if (event.locationLat != null && event.locationLng != null) {
    return `geo:${event.locationLat.toFixed(1)}:${event.locationLng.toFixed(1)}`;
  }

  const city = extractCityFromLocation(location);
  return `city:${normalizeToken(city)}`;
}

export function eventMatchesLocationKey(event: Event, locationKey: string): boolean {
  return getEventLocationKey(event) === locationKey;
}

export function buildLocationStats(events: Event[]): LocationStats {
  const locatedEvents = events.filter((event) => getEventLocationKey(event) != null);
  const clusterMap = new Map<string, LocationCluster>();
  const countries = new Set<string>();

  for (const event of locatedEvents) {
    const key = getEventLocationKey(event);
    const location = event.location?.trim();
    if (!key || !location) continue;
    const city = extractCityFromLocation(location);
    const country = extractCountryFromLocation(location);

    if (country) {
      countries.add(normalizeToken(country));
    }

    const existing = clusterMap.get(key);
    if (existing) {
      existing.eventCount += 1;
      continue;
    }

    clusterMap.set(key, {
      key,
      city,
      country,
      eventCount: 1,
      sampleLocation: location,
    });
  }

  const clusters = [...clusterMap.values()].sort((a, b) => {
    if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
    return a.city.localeCompare(b.city, undefined, { sensitivity: 'base' });
  });

  return {
    clusters,
    uniqueCities: clusters.length,
    uniqueCountries: countries.size,
    eventsWithLocation: locatedEvents.length,
  };
}

export function filterEventsByLocation(events: Event[], locationKey: string | null): Event[] {
  if (!locationKey) return events;
  return events.filter((event) => eventMatchesLocationKey(event, locationKey));
}

export interface LocationMapMarker {
  key: string;
  lat: number;
  lng: number;
  city: string;
  location: string;
  events: Event[];
}

export function getEventSeriesId(event: Event) {
  return parseRecurrenceInstanceId(event.id).seriesId;
}

export function buildLocationMapMarkers(events: Event[]): LocationMapMarker[] {
  const markerMap = new Map<string, LocationMapMarker>();

  for (const event of events) {
    const key = getEventLocationKey(event);
    const location = event.location?.trim();
    if (
      !key ||
      !location ||
      event.locationLat == null ||
      event.locationLng == null
    ) {
      continue;
    }

    const existing = markerMap.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }

    markerMap.set(key, {
      key,
      lat: event.locationLat,
      lng: event.locationLng,
      city: extractCityFromLocation(location),
      location,
      events: [event],
    });
  }

  return [...markerMap.values()].sort((a, b) => {
    if (b.events.length !== a.events.length) return b.events.length - a.events.length;
    return a.city.localeCompare(b.city, undefined, { sensitivity: 'base' });
  });
}

export function getTasksForLocatedEvents(tasks: Task[], events: Event[]): Task[] {
  const seriesIds = new Set(events.map((event) => getEventSeriesId(event)));
  return tasks.filter((task) => task.eventId != null && seriesIds.has(task.eventId));
}

export function getTasksForLocationKey(
  tasks: Task[],
  events: Event[],
  locationKey: string,
): Task[] {
  const locatedEvents = events.filter((event) => getEventLocationKey(event) === locationKey);
  return getTasksForLocatedEvents(tasks, locatedEvents);
}

export function pickPrimaryLocatedEvent(events: Event[]): Event {
  const now = Date.now();
  const byDate = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  return (
    byDate.find((event) => new Date(event.startDate).getTime() >= now) ??
    byDate[byDate.length - 1]
  );
}

export function buildCalendarEventLink(event: Event): string {
  const { seriesId, occurrenceAt } = parseRecurrenceInstanceId(event.id);
  const params = new URLSearchParams({ event: seriesId });
  const occurrence = occurrenceAt ?? event.startDate;
  params.set('occursOn', new Date(occurrence).toISOString());
  return `/calendar?${params.toString()}`;
}
