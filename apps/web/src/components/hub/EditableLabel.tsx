import { useEffect, useState } from 'react';
import { Input, cn } from '@lifehub/ui';

interface EditableLabelProps {
  value: string;
  canEdit?: boolean;
  done?: boolean;
  onSave: (value: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}

export function EditableLabel({
  value,
  canEdit = true,
  done,
  onSave,
  className,
  inputClassName,
}: EditableLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const save = async () => {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing && canEdit) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          window.setTimeout(() => {
            void save();
          }, 0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void save();
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn('h-8', inputClassName)}
        autoFocus
        disabled={saving}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => canEdit && setEditing(true)}
      className={cn(
        'block w-full truncate text-left text-sm font-medium',
        done && 'line-through opacity-60',
        canEdit && 'hover:underline',
        className,
      )}
    >
      {value}
    </button>
  );
}
