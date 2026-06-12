import { Trash2 } from 'lucide-react';
import { Button } from '@lifehub/ui';

interface DeleteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  confirmMessage?: string;
  title?: string;
}

export function DeleteButton({ onClick, disabled, confirmMessage, title }: DeleteButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
      disabled={disabled}
      title={title}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        onClick();
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
