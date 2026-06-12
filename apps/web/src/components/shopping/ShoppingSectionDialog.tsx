import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@lifehub/ui';
import { ContactChipPicker } from '@/components/shared/ContactChipPicker';
import { HubHint } from '@/components/hub';
import type { ConnectionWithUser, ShoppingSection } from '@lifehub/types';

interface ShoppingSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  section?: ShoppingSection;
  contacts: ConnectionWithUser[];
  isPending?: boolean;
  onSubmit: (data: { name: string; memberIds: string[] }) => void;
}

export function ShoppingSectionDialog({
  open,
  onOpenChange,
  mode,
  section,
  contacts,
  isPending,
  onSubmit,
}: ShoppingSectionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [shareSection, setShareSection] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && section) {
      setName(section.name);
      const ids = section.members?.map((m) => m.userId) ?? [];
      setMemberIds(ids);
      setShareSection(ids.length > 0 || !!section.isShared);
      return;
    }
    setName('');
    setShareSection(false);
    setMemberIds([]);
  }, [open, mode, section]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({
      name: trimmed,
      memberIds: shareSection ? memberIds : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('shopping.addSection') : t('shopping.editSectionTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopping-section-name">{t('shopping.sectionName')}</Label>
            <Input
              id="shopping-section-name"
              placeholder={t('shopping.newSectionPlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={shareSection}
                onChange={(e) => {
                  setShareSection(e.target.checked);
                  if (!e.target.checked) setMemberIds([]);
                }}
                className="h-4 w-4 rounded"
              />
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {t('shopping.shareSection')}
            </label>
            {shareSection && (
              <div className="space-y-2">
                <HubHint>{t('shopping.shareSectionHint')}</HubHint>
                <ContactChipPicker
                  contacts={contacts}
                  selectedIds={memberIds}
                  onChange={setMemberIds}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || isPending}
            onClick={handleSubmit}
          >
            {mode === 'create' ? t('shopping.addSection') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
