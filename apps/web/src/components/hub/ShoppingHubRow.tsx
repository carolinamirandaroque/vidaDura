import { Home, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Button, cn } from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import type { User } from '@lifehub/types';
import { DeleteButton } from './DeleteButton';
import { EditableLabel } from './EditableLabel';
import { hubRowClass } from './hub-styles';

interface ShoppingHubRowProps {
  title: string;
  done?: boolean;
  canEdit?: boolean;
  contextLabel?: string | null;
  assignee?: User;
  assigneeControl?: React.ReactNode;
  deleteConfirm?: string;
  deleting?: boolean;
  onToggle?: () => void;
  onTitleChange?: (title: string) => Promise<void>;
  onDelete?: () => void;
  onRestore?: () => void;
  restoreLabel?: string;
}

export function ShoppingHubRow({
  title,
  done,
  canEdit = true,
  contextLabel,
  assignee,
  assigneeControl,
  deleteConfirm,
  deleting,
  onToggle,
  onTitleChange,
  onDelete,
  onRestore,
  restoreLabel,
}: ShoppingHubRowProps) {
  const atHomeStyle = done && onRestore;

  return (
    <div
      className={
        atHomeStyle
          ? 'flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5'
          : cn(hubRowClass, 'group')
      }
    >
      {atHomeStyle ? (
        <Home className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <input
          type="checkbox"
          checked={!!done}
          disabled={!canEdit || !onToggle}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded"
        />
      )}
      <div className="min-w-0 flex-1">
        {onTitleChange ? (
          <EditableLabel
            value={title}
            canEdit={canEdit}
            done={done}
            onSave={onTitleChange}
          />
        ) : (
          <span className={`block text-sm font-medium ${done ? 'line-through opacity-60' : ''}`}>
            {title}
          </span>
        )}
        {contextLabel && (
          <p className="truncate text-xs text-muted-foreground">{contextLabel}</p>
        )}
      </div>
      {assigneeControl}
      {!assigneeControl && assignee && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={assignee.avatar ?? undefined} />
          <AvatarFallback className="text-[8px]">{getInitials(assignee.name)}</AvatarFallback>
        </Avatar>
      )}
      {atHomeStyle && onRestore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs sm:px-3"
          onClick={onRestore}
        >
          <ShoppingBag className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">{restoreLabel}</span>
        </Button>
      )}
      {canEdit && onDelete && (
        <DeleteButton confirmMessage={deleteConfirm} disabled={deleting} onClick={onDelete} />
      )}
    </div>
  );
}
