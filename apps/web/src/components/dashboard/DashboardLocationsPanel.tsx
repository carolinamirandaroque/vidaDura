import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe2, CheckSquare, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { LocationsMap } from '@/components/shared/LocationsMap';
import { HubMetricCard, SectionChipTabs, hubEmptyClass, hubRowClass } from '@/components/hub';
import { useFormatters } from '@/hooks/useFormatters';
import { getEventTypeColor } from '@/lib/event-types';
import {
  buildLocationMapMarkers,
  filterEventsByLocation,
  getTasksForLocatedEvents,
  type LocationStats,
} from '@/lib/event-locations';
import type { Event, Task } from '@lifehub/types';

interface DashboardLocationsPanelProps {
  year: number;
  yearStats: LocationStats;
  events: Event[];
  allYearEvents: Event[];
  tasks: Task[];
  selectedLocationKey: string | null;
  onLocationChange: (locationKey: string | null) => void;
}

export function DashboardLocationsPanel({
  year,
  yearStats,
  events,
  allYearEvents,
  tasks,
  selectedLocationKey,
  onLocationChange,
}: DashboardLocationsPanelProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();

  const mapMarkers = useMemo(() => {
    const source = selectedLocationKey
      ? filterEventsByLocation(allYearEvents, selectedLocationKey)
      : allYearEvents;
    return buildLocationMapMarkers(source);
  }, [allYearEvents, selectedLocationKey]);

  const locatedTasks = useMemo(
    () => getTasksForLocatedEvents(tasks, events),
    [tasks, events],
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [events],
  );

  const sortedTasks = useMemo(
    () =>
      [...locatedTasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }),
    [locatedTasks],
  );

  if (yearStats.eventsWithLocation === 0) {
    return null;
  }

  const filterTabs = [
    {
      id: 'all',
      label: t('dashboard.locationsAll', { count: yearStats.eventsWithLocation }),
      icon: <Globe2 className="h-3.5 w-3.5" />,
    },
    ...yearStats.clusters.map((cluster) => ({
      id: cluster.key,
      label: t('dashboard.locationsCityChip', {
        city: cluster.city,
        count: cluster.eventCount,
      }),
      icon: <MapPin className="h-3.5 w-3.5" />,
    })),
  ];

  return (
    <DashboardPanel
      title={t('dashboard.locationsTitle', { year })}
      icon={MapPin}
      iconClassName="text-primary"
      to="/calendar"
      linkLabel={t('dashboard.viewAll')}
      className="border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('dashboard.locationsSubtitle')}</p>

        <div className="grid gap-2 sm:grid-cols-3">
          <HubMetricCard
            label={t('dashboard.locationsCitiesMetric')}
            value={String(yearStats.uniqueCities)}
            className="bg-background/80"
          />
          <HubMetricCard
            label={t('dashboard.locationsEventsMetric')}
            value={String(yearStats.eventsWithLocation)}
            className="bg-background/80"
          />
          <HubMetricCard
            label={t('dashboard.locationsCountriesMetric')}
            value={String(yearStats.uniqueCountries)}
            className="bg-background/80"
          />
        </div>

        {mapMarkers.length > 0 ? (
          <LocationsMap
            markers={mapMarkers}
            selectedLocationKey={selectedLocationKey}
          />
        ) : (
          <p className={hubEmptyClass}>{t('dashboard.locationsMapNoCoords')}</p>
        )}

        {yearStats.clusters.length > 0 && (
          <SectionChipTabs
            tabs={filterTabs}
            activeId={selectedLocationKey ?? 'all'}
            onChange={(id) => onLocationChange(id === 'all' ? null : id)}
            className={cn(filterTabs.length > 4 && 'pb-0.5')}
          />
        )}

        {sortedTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('dashboard.locationsTasksSection', { count: sortedTasks.length })}
            </p>
            <div className="space-y-1.5">
              {sortedTasks.slice(0, 6).map((task) => (
                <Link key={task.id} to="/tasks" className={hubRowClass}>
                  <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.eventTitle && (
                      <p className="truncate text-xs text-muted-foreground">{task.eventTitle}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {sortedEvents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('dashboard.locationsEventsSection', { count: sortedEvents.length })}
            </p>
            <div className="space-y-1.5">
              {sortedEvents.slice(0, 6).map((event) => (
                <Link key={event.id} to="/calendar" className={hubRowClass}>
                  <div
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: getEventTypeColor(event.type) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(event.startDate)}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className={hubEmptyClass}>{t('dashboard.locationsNoEvents')}</p>
        )}
      </div>
    </DashboardPanel>
  );
}
