import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

const labels: Record<SupportedLanguage, string> = {
  en: 'English',
  'pt-PT': 'Português',
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon' : 'sm'} className="gap-2">
          <Languages className="h-4 w-4" />
          {!compact && <span>{labels[i18n.language as SupportedLanguage] ?? 'EN'}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => changeLanguage(lng)}
            className={i18n.language === lng ? 'bg-accent' : ''}
          >
            {t(`language.${lng}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
