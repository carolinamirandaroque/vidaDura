import { Input, Label } from '@lifehub/ui';
import { useTranslation } from 'react-i18next';
import { DatePickerField, toDateInputValue } from './DatePickerField';

interface DateTimePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  dateLabel?: string;
  timeLabel?: string;
}

function splitDatetimeLocal(value: string): { date: string; time: string } {
  if (!value?.trim()) return { date: '', time: '' };
  const [date, time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
}

function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '09:00'}`;
}

export function DateTimePickerField({
  value,
  onChange,
  dateLabel,
  timeLabel,
}: DateTimePickerFieldProps) {
  const { t } = useTranslation();
  const { date, time } = splitDatetimeLocal(value);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{dateLabel ?? t('common.date')}</Label>
        <DatePickerField
          value={date}
          onChange={(nextDate) => onChange(joinDatetimeLocal(nextDate, time))}
        />
      </div>
      <div className="space-y-2">
        <Label>{timeLabel ?? t('common.time')}</Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => onChange(joinDatetimeLocal(date || toDateInputValue(new Date()), e.target.value))}
        />
      </div>
    </div>
  );
}
