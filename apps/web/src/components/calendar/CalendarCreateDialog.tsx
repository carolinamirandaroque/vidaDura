import { useTranslation } from 'react-i18next';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@lifehub/ui';
import { ContactMultiSelect } from '@/components/shared/ContactMultiSelect';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { DateTimePickerField } from '@/components/shared/DateTimePickerField';
import {
  resolveAllDayEventDates,
  resolveDueDate,
  resolveEventDates,
  toDateInputValue,
} from '@/lib/calendar';
import { LocationPicker } from '@/components/shared/LocationPicker';
import { HUB_EVENT_TYPES, getEventTypeColor } from '@/lib/event-types';
import type { Calendar, HubEventType, RecurrenceType } from '@lifehub/types';

const EMPTY_FORM: CalendarCreateFormState = {
  title: '',
  startDate: '',
  endDate: '',
  calendarId: '',
  type: 'social',
  participantIds: [],
  recurrence: 'none',
  recurrenceEnd: '',
  dueDate: '',
  allDay: false,
  location: '',
  locationLat: null,
  locationLng: null,
};

export function createEmptyCalendarForm(): CalendarCreateFormState {
  return { ...EMPTY_FORM };
}

export function createFormForDate(
  date: Date,
  kind: 'appointment' | 'deadline',
): CalendarCreateFormState {
  const dateKey = toDateInputValue(date);
  if (kind === 'deadline') {
    return { ...EMPTY_FORM, dueDate: dateKey };
  }
  return {
    ...EMPTY_FORM,
    startDate: `${dateKey}T09:00`,
    endDate: `${dateKey}T10:00`,
    allDay: false,
  };
}

export interface CalendarCreateFormState {
  title: string;
  startDate: string;
  endDate: string;
  calendarId: string;
  type: HubEventType;
  participantIds: string[];
  recurrence: RecurrenceType;
  recurrenceEnd: string;
  dueDate: string;
  allDay: boolean;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
}

interface CalendarCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createKind: 'appointment' | 'deadline';
  form: CalendarCreateFormState;
  onFormChange: (form: CalendarCreateFormState) => void;
  currentUserId?: string;
  isPending?: boolean;
  loadingCalendars?: boolean;
  error?: string | null;
  onSubmit: () => void;
}

export function CalendarCreateDialog({
  open,
  onOpenChange,
  createKind,
  form,
  onFormChange,
  currentUserId,
  isPending,
  loadingCalendars,
  error,
  onSubmit,
}: CalendarCreateDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createKind === 'deadline' ? t('calendar.newDeadline') : t('calendar.newEvent')}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {createKind === 'appointment' && (
            <div className="space-y-2">
              <Label>{t('eventHub.type')}</Label>
              <Select
                value={form.type}
                onValueChange={(value) => onFormChange({ ...form, type: value as HubEventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HUB_EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getEventTypeColor(type) }}
                        />
                        {t(`eventHub.types.${type}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('common.title')} *</Label>
            <Input
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder={
                createKind === 'deadline'
                  ? t('eventHub.deadlinePlaceholder')
                  : t('eventHub.titlePlaceholder')
              }
              required
            />
          </div>

          {createKind === 'appointment' && (
            <div className="space-y-2">
              <Label htmlFor="event-location">{t('eventHub.location')}</Label>
              <LocationPicker
                id="event-location"
                placeholder={t('eventHub.locationPlaceholder')}
                value={{
                  location: form.location,
                  locationLat: form.locationLat,
                  locationLng: form.locationLng,
                }}
                onChange={(next) => onFormChange({ ...form, ...next })}
              />
            </div>
          )}

          {createKind === 'deadline' ? (
            <div className="space-y-2">
              <Label>{t('eventHub.dueDate')} *</Label>
              <DatePickerField
                value={form.dueDate}
                onChange={(dueDate) => onFormChange({ ...form, dueDate })}
              />
              <p className="text-xs text-muted-foreground">{t('eventHub.deadlineHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="all-day" className="cursor-pointer">
                  {t('calendar.allDay')}
                </Label>
                <Switch
                  id="all-day"
                  checked={form.allDay}
                  onCheckedChange={(allDay) =>
                    onFormChange({
                      ...form,
                      allDay,
                      startDate: allDay
                        ? form.startDate.split('T')[0]
                        : form.startDate
                          ? `${form.startDate.split('T')[0]}T09:00`
                          : '',
                      endDate: allDay
                        ? form.endDate.split('T')[0] || form.startDate.split('T')[0]
                        : form.endDate
                          ? `${form.endDate.split('T')[0]}T10:00`
                          : '',
                    })
                  }
                />
              </div>
              {form.allDay ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('common.start')}</Label>
                    <DatePickerField
                      value={form.startDate.split('T')[0]}
                      onChange={(startDate) => onFormChange({ ...form, startDate })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.end')}</Label>
                    <DatePickerField
                      value={(form.endDate || form.startDate).split('T')[0]}
                      onChange={(endDate) => onFormChange({ ...form, endDate })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('common.start')}</Label>
                    <DateTimePickerField
                      value={form.startDate}
                      onChange={(startDate) => onFormChange({ ...form, startDate })}
                    />
                    <p className="text-xs text-muted-foreground">{t('eventHub.datesOptionalHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.end')}</Label>
                    <DateTimePickerField
                      value={form.endDate}
                      onChange={(endDate) => onFormChange({ ...form, endDate })}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('eventHub.recurrence.label')}</Label>
            <Select
              value={form.recurrence}
              onValueChange={(value) =>
                onFormChange({ ...form, recurrence: value as RecurrenceType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {t(`eventHub.recurrence.${value}`)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {form.recurrence !== 'none' && (
            <div className="space-y-2">
              <Label>{t('eventHub.recurrence.endLabel')}</Label>
              <DatePickerField
                value={form.recurrenceEnd}
                onChange={(recurrenceEnd) => onFormChange({ ...form, recurrenceEnd })}
              />
              <p className="text-xs text-muted-foreground">{t('eventHub.recurrence.hint')}</p>
            </div>
          )}

          {createKind === 'appointment' && (
            <div className="space-y-2">
              <Label>{t('eventHub.inviteContacts')}</Label>
              <ContactMultiSelect
                currentUserId={currentUserId}
                selectedIds={form.participantIds}
                onChange={(participantIds) => onFormChange({ ...form, participantIds })}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending || loadingCalendars}>
            {t('common.create')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function buildCalendarCreatePayload(
  createKind: 'appointment' | 'deadline',
  form: CalendarCreateFormState,
  calendars: Calendar[] | undefined,
) {
  const title = form.title.trim();
  if (!title) throw new Error('title');

  const calendarId = form.calendarId || calendars?.[0]?.id;
  if (!calendarId) throw new Error('calendar');

  const dates =
    createKind === 'deadline'
      ? resolveDueDate(form.dueDate)
      : form.allDay
        ? resolveAllDayEventDates(form.startDate, form.endDate)
        : resolveEventDates(form.startDate, form.endDate);

  return {
    createKind,
    title,
    type: form.type,
    calendarId,
    startDate: dates.startDate,
    endDate: dates.endDate,
    allDay: createKind === 'appointment' ? form.allDay : undefined,
    recurrence: form.recurrence,
    recurrenceEnd: form.recurrenceEnd.trim()
      ? new Date(form.recurrenceEnd).toISOString()
      : undefined,
    participantIds:
      createKind === 'appointment' && form.participantIds.length > 0
        ? form.participantIds
        : undefined,
    location:
      createKind === 'appointment' && form.location.trim()
        ? form.location.trim()
        : undefined,
    locationLat:
      createKind === 'appointment' && form.location.trim() ? form.locationLat : undefined,
    locationLng:
      createKind === 'appointment' && form.location.trim() ? form.locationLng : undefined,
  };
}
