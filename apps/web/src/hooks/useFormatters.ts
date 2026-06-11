import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, formatTime, formatCurrency } from '@lifehub/utils';

export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';

  return {
    locale,
    formatDate: (date: string | Date) => formatDate(date, locale),
    formatDateTime: (date: string | Date) => formatDateTime(date, locale),
    formatTime: (date: string | Date) => formatTime(date, locale),
    formatCurrency: (amount: number, currency = 'EUR') => formatCurrency(amount, currency, locale),
    formatMonthYear: (date: Date) =>
      date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
  };
}
