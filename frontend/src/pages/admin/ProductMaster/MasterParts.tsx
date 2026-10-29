import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { fill } from '../../checkout/shared/format';
import type { MasterStatus } from '../../../services/admin/productMasterModels';
import mock from './ProductMaster.mock.json';
import * as S from '../AdminDashboard/AdminDashboard.styles';
import * as P from './ProductMaster.styles';

const C = mock._common;

export function SearchField({
  value,
  onChange,
  placeholder = C.searchPlaceholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <P.SearchBox>
      <i className="pi pi-search" aria-hidden />
      <P.SearchInput
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <P.ClearSearch type="button" aria-label={C.clearSearch} onClick={() => onChange('')}>
          <i className="pi pi-times" aria-hidden />
        </P.ClearSearch>
      )}
    </P.SearchBox>
  );
}

export type StatusFilterValue = MasterStatus | 'all';

export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}) {
  return (
    <P.Select
      value={value}
      aria-label={C.status}
      onChange={(e) => onChange(e.target.value as StatusFilterValue)}
    >
      <option value="all">{mock._status.all}</option>
      <option value="active">{mock._status.active}</option>
      <option value="inactive">{mock._status.inactive}</option>
    </P.Select>
  );
}

/** Activate / deactivate switch with a visible label (colour is never the only cue). */
export function StatusSwitch({
  status,
  name,
  onToggle,
}: {
  status: MasterStatus;
  name: string;
  onToggle: () => void;
}) {
  const on = status === 'active';
  return (
    <P.StatusToggle>
      <P.Switch
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${name} ${C.status.toLowerCase()}`}
        $on={on}
        onClick={onToggle}
      />
      <P.SwitchLabel $on={on}>{on ? mock._status.active : mock._status.inactive}</P.SwitchLabel>
    </P.StatusToggle>
  );
}

export function RowActions({
  name,
  onEdit,
  onDelete,
  children,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
}) {
  return (
    <P.ActionsCell>
      <P.RowActions>
        {children}
        <P.IconButton
          type="button"
          title={C.edit}
          aria-label={`${C.edit} ${name}`}
          onClick={onEdit}
        >
          <i className="pi pi-pencil" aria-hidden />
        </P.IconButton>
        <P.IconButton
          type="button"
          $danger
          title={C.delete}
          aria-label={`${C.delete} ${name}`}
          onClick={onDelete}
        >
          <i className="pi pi-trash" aria-hidden />
        </P.IconButton>
      </P.RowActions>
    </P.ActionsCell>
  );
}

/** Names as chips in a table cell; past `limit` the rest fold into a "+N more" chip. */
export function NameChips({
  names,
  limit = 2,
  strong,
}: {
  names: string[];
  limit?: number;
  strong?: boolean;
}) {
  if (names.length === 0) return <P.Muted>{C.none}</P.Muted>;
  const extra = names.length - limit;
  return (
    <P.ChipList>
      {names.slice(0, limit).map((name) => (
        <P.Chip key={name} $strong={strong}>
          <span>{name}</span>
        </P.Chip>
      ))}
      {extra > 0 && (
        <P.Chip title={names.slice(limit).join(', ')}>
          {fill(C.moreCount, { count: extra })}
        </P.Chip>
      )}
    </P.ChipList>
  );
}

export function EmptyRow({ colSpan, filtered }: { colSpan: number; filtered: boolean }) {
  return (
    <tr>
      <P.EmptyCell colSpan={colSpan}>
        <i className={`pi ${filtered ? 'pi-filter-slash' : 'pi-inbox'}`} aria-hidden />
        {filtered ? C.noResults : C.empty}
      </P.EmptyCell>
    </tr>
  );
}

/** Modal dialog: Esc and the scrim close it; the first field gets focus. */
export function MasterDialog({
  icon,
  title,
  subtitle,
  onClose,
  footer,
  narrow,
  danger,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer: ReactNode;
  narrow?: boolean;
  danger?: boolean;
  children?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Callers pass inline closures; keep the latest without re-running the mount effect.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panel.current
      ?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button')
      ?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <P.Scrim onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <P.Dialog
        ref={panel}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        $narrow={narrow}
      >
        <P.DialogHead>
          <P.DialogIcon $danger={danger}>
            <i className={`pi ${icon}`} aria-hidden />
          </P.DialogIcon>
          <P.DialogTitleBlock>
            <P.DialogTitle id={titleId}>{title}</P.DialogTitle>
            {subtitle && <P.DialogSubtitle>{subtitle}</P.DialogSubtitle>}
          </P.DialogTitleBlock>
          <P.DialogClose type="button" aria-label={C.close} onClick={onClose}>
            <i className="pi pi-times" aria-hidden />
          </P.DialogClose>
        </P.DialogHead>
        {children && <P.DialogBody>{children}</P.DialogBody>}
        <P.DialogFoot>{footer}</P.DialogFoot>
      </P.Dialog>
    </P.Scrim>
  );
}

export function ConfirmDelete({
  name,
  extra,
  onCancel,
  onConfirm,
}: {
  name: string;
  extra?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <MasterDialog
      narrow
      danger
      icon="pi-trash"
      title={fill(C.deleteTitle, { name })}
      subtitle={extra ? `${C.deleteBody} ${extra}` : C.deleteBody}
      onClose={onCancel}
      footer={
        <>
          <DialogCancel onClick={onCancel} />
          <P.DangerButton type="button" onClick={onConfirm}>
            {C.delete}
          </P.DangerButton>
        </>
      }
    />
  );
}

export function DialogCancel({ onClick }: { onClick: () => void }) {
  return (
    <S.QuickAction type="button" onClick={onClick}>
      {C.cancel}
    </S.QuickAction>
  );
}

/** "Active" switch row at the bottom of each create / edit form. */
export function StatusFormRow({
  status,
  onChange,
}: {
  status: MasterStatus;
  onChange: (status: MasterStatus) => void;
}) {
  const on = status === 'active';
  return (
    <P.ToggleRow>
      <P.NameText>
        <P.FieldLabel>{C.activeOnSave}</P.FieldLabel>
        <P.FieldHint>{C.activeOnSaveHint}</P.FieldHint>
      </P.NameText>
      <P.StatusToggle>
        <P.Switch
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={C.activeOnSave}
          $on={on}
          onClick={() => onChange(on ? 'inactive' : 'active')}
        />
        <P.SwitchLabel $on={on}>{on ? mock._status.active : mock._status.inactive}</P.SwitchLabel>
      </P.StatusToggle>
    </P.ToggleRow>
  );
}
