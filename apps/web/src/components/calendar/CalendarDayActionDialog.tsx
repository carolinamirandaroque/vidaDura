import { useTranslation } from 'react-i18next';
import { Bell, CalendarDays, Eye } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@lifehub/ui';

interface CalendarDayActionDialogProps {
  date: Date | null;
  onOpenChange: (open: boolean) => void;
  onViewDay: () => void;
  onAddEvent: () => void;
  onAddDeadline: () => void;
}

export function CalendarDayActionDialog({
  date,
  onOpenChange,
  onViewDay,
  onAddEvent,
  onAddDeadline,
}: CalendarDayActionDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';

  const title = date
    ? date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <Dialog open={!!date} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="capitalize">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="justify-start" onClick={onViewDay}>
            <Eye className="mr-2 h-4 w-4" />
            {t('calendar.viewDay')}
          </Button>
          <Button type="button" className="justify-start" onClick={onAddEvent}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {t('calendar.addEvent')}
          </Button>
          <Button type="button" variant="secondary" className="justify-start" onClick={onAddDeadline}>
            <Bell className="mr-2 h-4 w-4" />
            {t('calendar.addDeadline')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
