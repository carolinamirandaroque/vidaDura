import { Plus } from 'lucide-react';
import { Button, Input } from '@lifehub/ui';
import { hubAddRowClass } from './hub-styles';

interface HubAddRowProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
  isPending?: boolean;
  extra?: React.ReactNode;
}

export function HubAddRow({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  isPending,
  extra,
}: HubAddRowProps) {
  return (
    <div className={hubAddRowClass}>
      <Input
        className="min-w-[140px] flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit()}
        disabled={disabled || isPending}
      />
      {extra}
      <Button
        type="button"
        size="icon"
        disabled={disabled || isPending || !value.trim()}
        onClick={onSubmit}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
