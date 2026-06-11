import type { HubEventType } from '@lifehub/types';

export const HUB_EVENT_TYPES: HubEventType[] = [
  'social',
  'corporate',
  'cultural',
  'entertainment',
  'sports',
  'educational',
  'technological',
  'charitable',
  'religious',
  'other',
];

export const EVENT_TYPE_COLORS: Record<HubEventType, string> = {
  social: '#ec4899',
  corporate: '#2563eb',
  cultural: '#9333ea',
  entertainment: '#f59e0b',
  sports: '#16a34a',
  educational: '#0891b2',
  technological: '#4f46e5',
  charitable: '#ea580c',
  religious: '#7c3aed',
  other: '#64748b',
};

export function getEventTypeColor(type: HubEventType): string {
  return EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.other;
}
