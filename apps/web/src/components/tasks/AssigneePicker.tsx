import { useTranslation } from 'react-i18next';
import { UserCircle, Check } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import type { User } from '@lifehub/types';

interface AssigneePickerProps {
  people: User[];
  value?: string | null;
  onChange: (userId: string | null) => void;
  className?: string;
}

export function AssigneePicker({ people, value, onChange, className }: AssigneePickerProps) {
  const { t } = useTranslation();
  const assignee = people.find((p) => p.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 shrink-0 rounded-full', className)}
          title={t('tasks.assignTo')}
        >
          {assignee ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar ?? undefined} />
              <AvatarFallback className="text-[9px]">{getInitials(assignee.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <UserCircle className="h-5 w-5 text-muted-foreground/60" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onChange(null)} className="gap-2">
          {!value && <Check className="h-3.5 w-3.5" />}
          <span className={!value ? '' : 'pl-5'}>{t('tasks.unassigned')}</span>
        </DropdownMenuItem>
        {people.map((person) => (
          <DropdownMenuItem key={person.id} onClick={() => onChange(person.id)} className="gap-2">
            {value === person.id && <Check className="h-3.5 w-3.5" />}
            <span className={cn('flex items-center gap-2', value !== person.id && 'pl-5')}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={person.avatar ?? undefined} />
                <AvatarFallback className="text-[8px]">{getInitials(person.name)}</AvatarFallback>
              </Avatar>
              {person.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
