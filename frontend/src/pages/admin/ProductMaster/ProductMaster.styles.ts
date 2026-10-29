import styled, { css, keyframes } from 'styled-components';
import { textStyle, withAlpha } from '../../../theme';

/*
 * Product master reuses the admin dashboard's shell, card, table and chip
 * styles (`AdminDashboard.styles`) and adds tabs, toolbars, row actions,
 * the status switch and the create/edit dialogs here.
 */

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const resetButton = css`
  appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
  background: none;
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

// ── Tabs ────────────────────────────────────────────────────────────────

export const TabList = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space1}px;
  margin-bottom: ${({ theme }) => theme.spacing.space5}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.divider};
  overflow-x: auto;
  scrollbar-width: none;
`;

export const Tab = styled.button<{ $active: boolean }>`
  ${resetButton}
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space3}px ${theme.spacing.space4}px`};
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.onSurfaceVariant)};
  border-radius: ${({ theme }) => `${theme.radius.sm}px ${theme.radius.sm}px 0 0`};
  transition:
    color 0.15s ease,
    background 0.15s ease;
  ${focusRing}

  &::after {
    content: '';
    position: absolute;
    left: ${({ theme }) => theme.spacing.space2}px;
    right: ${({ theme }) => theme.spacing.space2}px;
    bottom: -1px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  }

  i {
    font-size: 14px;
  }

  &:hover {
    background: ${({ theme }) => withAlpha(theme.colors.primary, 0.06)};
  }
`;

export const TabCount = styled.span<{ $active: boolean }>`
  min-width: 22px;
  padding: 0 ${({ theme }) => theme.spacing.space1 + 2}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ theme, $active }) => ($active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surfaceContainer};
`;

export const TabStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

// ── Toolbar: search + filters + actions ─────────────────────────────────

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

/** Search + selects. Fixed-width controls so wrapped rows stay in columns. */
export const ToolbarFilters = styled.div`
  flex: 1 1 520px;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;

  > label {
    flex: 0 1 ${({ theme }) => theme.layout.masterSearchWidth + 40}px;
    max-width: none;
    min-width: 220px;
  }

  > select {
    flex: 0 1 ${({ theme }) => theme.layout.masterFilterWidth - 20}px;
    min-width: 150px;
  }

  @media (max-width: 600px) {
    > label {
      flex-basis: 100%;
    }

    > select {
      flex: 1 1 140px;
    }
  }
`;

/** Buttons stay together on the right, even when the filters wrap. */
export const ToolbarActions = styled.div`
  flex: 0 0 auto;
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const SearchBox = styled.label`
  position: relative;
  flex: 1 1 ${({ theme }) => theme.layout.masterSearchWidth}px;
  max-width: ${({ theme }) => theme.layout.masterSearchWidth + 80}px;
  display: flex;
  align-items: center;

  > i {
    position: absolute;
    left: ${({ theme }) => theme.spacing.space3}px;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.outline};
    pointer-events: none;
  }
`;

const control = css`
  height: ${({ theme }) => theme.components.minInteractiveDimension - 8}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  background: ${({ theme }) => theme.colors.surface};
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}
  color: ${({ theme }) => theme.colors.onSurface};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.outline};
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => withAlpha(theme.colors.primary, 0.16)};
  }
`;

export const SearchInput = styled.input`
  ${control}
  width: 100%;
  padding: 0 ${({ theme }) => theme.spacing.space8}px 0 ${({ theme }) => theme.spacing.space8 + 4}px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.outline};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

export const ClearSearch = styled.button`
  ${resetButton}
  position: absolute;
  right: ${({ theme }) => theme.spacing.space2}px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.colors.outline};
  ${focusRing}

  i {
    font-size: 11px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const Select = styled.select`
  ${control}
  flex: 0 1 ${({ theme }) => theme.layout.masterFilterWidth}px;
  min-width: 140px;
  padding: 0 ${({ theme }) => theme.spacing.space8}px 0 ${({ theme }) => theme.spacing.space3}px;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2374777F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
`;

export const ResultMeta = styled.p`
  margin: ${({ theme }) => theme.spacing.space3}px 0 0;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

// ── Table cells ─────────────────────────────────────────────────────────

export const NameCell = styled.div`
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const Thumb = styled.span<{ $bg: string; $fg: string }>`
  width: ${({ theme }) => theme.layout.adminThumbSize + 8}px;
  height: ${({ theme }) => theme.layout.adminThumbSize + 8}px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ $fg }) => $fg};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    mix-blend-mode: multiply;
  }

  i {
    font-size: 16px;
  }
`;

export const NameText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const NameBlock = styled(NameText)`
  min-width: 180px;
`;

export const Code = styled.span`
  ${({ theme }) => textStyle(theme.typography.labelSmallMono)}
`;

export const DescCell = styled.td`
  max-width: 280px;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
  font-size: 13px;
`;

export const Muted = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
  white-space: nowrap;
`;

export const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space1}px;
  min-width: 180px;
`;

export const Chip = styled.span<{ $strong?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  max-width: 100%;
  padding: 2px ${({ theme }) => theme.spacing.space2}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  white-space: nowrap;
  color: ${({ theme, $strong }) => ($strong ? theme.colors.primary : theme.colors.onSurface)};
  background: ${({ theme, $strong }) =>
    $strong ? withAlpha(theme.colors.primary, 0.08) : theme.colors.surfaceContainer};

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const ChipRemove = styled.button`
  ${resetButton}
  width: 16px;
  height: 16px;
  margin-right: -4px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  ${focusRing}

  i {
    font-size: 9px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => withAlpha(theme.colors.error, 0.12)};
  }
`;

export const ActionsHead = styled.th`
  text-align: right !important;
`;

export const ActionsCell = styled.td`
  white-space: nowrap;
  text-align: right;
`;

export const RowActions = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const IconButton = styled.button<{ $danger?: boolean }>`
  ${resetButton}
  width: ${({ theme }) => theme.layout.masterIconButtonSize}px;
  height: ${({ theme }) => theme.layout.masterIconButtonSize}px;
  display: inline-grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.primary)};
  background: ${({ theme, $danger }) => withAlpha($danger ? theme.colors.error : theme.colors.primary, 0.08)};
  transition: background 0.15s ease;
  ${focusRing}

  i {
    font-size: 13px;
  }

  &:hover {
    background: ${({ theme, $danger }) =>
      withAlpha($danger ? theme.colors.error : theme.colors.primary, 0.16)};
  }
`;

export const EmptyCell = styled.td`
  padding: ${({ theme }) => theme.spacing.space10}px 0 !important;
  text-align: center;
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}

  i {
    display: block;
    margin-bottom: ${({ theme }) => theme.spacing.space2}px;
    font-size: 24px;
    color: ${({ theme }) => theme.colors.outlineVariant};
  }
`;

// ── Status switch ───────────────────────────────────────────────────────

export const StatusToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  cursor: pointer;
  white-space: nowrap;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 600;
`;

export const Switch = styled.button<{ $on: boolean }>`
  ${resetButton}
  position: relative;
  flex-shrink: 0;
  width: ${({ theme }) => theme.layout.masterSwitchWidth}px;
  height: ${({ theme }) => theme.layout.masterSwitchHeight}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme, $on }) => ($on ? theme.colors.success : theme.colors.outlineVariant)};
  transition: background 0.2s ease;
  ${focusRing}

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: ${({ theme }) => theme.layout.masterSwitchHeight - 4}px;
    height: ${({ theme }) => theme.layout.masterSwitchHeight - 4}px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.surface};
    box-shadow: ${({ theme }) => theme.elevation.level1};
    transform: translateX(
      ${({ theme, $on }) =>
        $on ? theme.layout.masterSwitchWidth - theme.layout.masterSwitchHeight : 0}px
    );
    transition: transform 0.2s ${({ theme }) => theme.motion.easeOutCubic};
  }
`;

export const SwitchLabel = styled.span<{ $on: boolean }>`
  min-width: 52px;
  color: ${({ theme, $on }) => ($on ? theme.colors.success : theme.colors.outline)};
`;

// ── Dialogs ─────────────────────────────────────────────────────────────

export const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: ${({ theme }) => theme.colors.scrim};
  animation: ${fadeIn} 0.15s ease both;

  ${({ theme }) => theme.media.sm} {
    align-items: center;
    padding: ${({ theme }) => theme.spacing.space6}px;
  }
`;

export const Dialog = styled.div<{ $narrow?: boolean }>`
  width: 100%;
  max-width: ${({ theme, $narrow }) =>
    $narrow ? theme.layout.masterConfirmWidth : theme.layout.masterDialogWidth}px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => `${theme.components.dialog.radius}px ${theme.components.dialog.radius}px 0 0`};
  background: ${({ theme }) => theme.components.dialog.background};
  box-shadow: ${({ theme }) => theme.components.dialog.shadow};
  animation: ${popIn} 0.22s ${({ theme }) => theme.motion.easeOutCubic} both;

  ${({ theme }) => theme.media.sm} {
    border-radius: ${({ theme }) => theme.components.dialog.radius}px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const DialogHead = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => `${theme.spacing.space5}px ${theme.spacing.space6}px ${theme.spacing.space4}px`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.divider};
`;

export const DialogIcon = styled.span<{ $danger?: boolean }>`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.md}px;
  color: ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.primary)};
  background: ${({ theme, $danger }) => withAlpha($danger ? theme.colors.error : theme.colors.primary, 0.1)};

  i {
    font-size: 16px;
  }
`;

export const DialogTitleBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

export const DialogTitle = styled.h2`
  margin: 0;
  ${({ theme }) => textStyle(theme.typography.titleLarge)}
  font-weight: 600;
`;

export const DialogSubtitle = styled.p`
  margin: 2px 0 0;
  ${({ theme }) => textStyle(theme.typography.bodyMedium)}
`;

export const DialogClose = styled.button`
  ${resetButton}
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  ${focusRing}

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const DialogBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.spacing.space5}px ${theme.spacing.space6}px`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const DialogFoot = styled.footer`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space4}px ${theme.spacing.space6}px`};
  border-top: 1px solid ${({ theme }) => theme.colors.divider};
`;

export const FootNote = styled.span<{ $warn?: boolean }>`
  margin-right: auto;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
  color: ${({ theme, $warn }) => ($warn ? theme.colors.secondary : theme.colors.onSurfaceVariant)};
`;

export const DangerButton = styled.button`
  ${resetButton}
  height: ${({ theme }) => theme.components.minInteractiveDimension - 8}px;
  padding: 0 ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onError};
  background: ${({ theme }) => theme.colors.error};
  ${focusRing}

  &:hover {
    filter: brightness(0.92);
  }
`;

// ── Form ────────────────────────────────────────────────────────────────

export const FormSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const FormSectionTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  ${({ theme }) => textStyle(theme.typography.titleSmall)}

  small {
    margin-left: auto;
    ${({ theme }) => textStyle(theme.typography.labelMedium)}
    font-weight: 600;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.space4}px;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Field = styled.label<{ $full?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1 + 2}px;
  min-width: 0;

  ${({ theme }) => theme.media.sm} {
    grid-column: ${({ $full }) => ($full ? '1 / -1' : 'auto')};
  }
`;

export const FieldLabel = styled.span`
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
`;

export const FieldHint = styled.span`
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const Input = styled.input`
  ${control}
  width: 100%;
  height: ${({ theme }) => theme.components.minInteractiveDimension}px;
  padding: 0 ${({ theme }) => theme.spacing.space3}px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.outline};
  }
`;

export const TextArea = styled.textarea`
  ${control}
  width: 100%;
  height: auto;
  min-height: 72px;
  padding: ${({ theme }) => `${theme.spacing.space3}px`};
  resize: vertical;

  &::placeholder {
    color: ${({ theme }) => theme.colors.outline};
  }
`;

export const FormSelect = styled(Select)`
  width: 100%;
  max-width: none;
  flex: none;
  height: ${({ theme }) => theme.components.minInteractiveDimension}px;
`;

export const UploadRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const UploadPreview = styled(Thumb)`
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.md}px;

  i {
    font-size: 26px;
  }
`;

export const UploadText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

export const OutlineButton = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: 34px;
  padding: 0 ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  label:focus-within & {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space3}px ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.surfaceContainer};
`;

// ── Checkbox pickers (brand mapping, product assignment) ────────────────

export const PickerBox = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
`;

export const PickerTools = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => theme.spacing.space2}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.divider};
  background: ${({ theme }) => theme.colors.background};

  ${SearchBox} {
    max-width: none;
  }
`;

export const PickerList = styled.ul<{ $maxHeight?: number }>`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.spacing.space1}px;
  max-height: ${({ theme, $maxHeight }) => $maxHeight ?? theme.layout.masterPickerHeight}px;
  overflow-y: auto;
`;

export const PickerItem = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => `${theme.spacing.space2}px ${theme.spacing.space3}px`};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  cursor: pointer;
  background: ${({ theme, $checked }) =>
    $checked ? withAlpha(theme.colors.primary, 0.06) : 'transparent'};

  &:hover {
    background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};
  }

  input {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

export const PickerText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  ${({ theme }) => textStyle(theme.typography.labelLarge)}

  small {
    ${({ theme }) => textStyle(theme.typography.bodySmall)}
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export const PickerSide = styled.span`
  flex-shrink: 0;
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-variant-numeric: tabular-nums;
`;

export const PickerSubList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const PickerGroupLabel = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space2}px ${theme.spacing.space3}px ${theme.spacing.space1}px`};
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

export const PickerEmpty = styled.li`
  padding: ${({ theme }) => theme.spacing.space5}px;
  text-align: center;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}
`;

export const CheckChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const CheckChip = styled.label<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space1 + 2}px ${theme.spacing.space3}px`};
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1.5px solid
    ${({ theme, $checked }) => ($checked ? theme.colors.primary : theme.colors.outlineVariant)};
  background: ${({ theme, $checked }) =>
    $checked ? withAlpha(theme.colors.primary, 0.08) : theme.colors.surface};
  ${({ theme }) => textStyle(theme.typography.labelLarge)}
  color: ${({ theme, $checked }) => ($checked ? theme.colors.primary : theme.colors.onSurface)};
  cursor: pointer;

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  i {
    font-size: 11px;
  }
`;

export const LinkButton = styled.button`
  ${resetButton}
  ${({ theme }) => textStyle(theme.typography.labelMedium)}
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.xs}px;
  ${focusRing}

  &:hover {
    text-decoration: underline;
  }
`;

// ── Bulk import ─────────────────────────────────────────────────────────

export const DropZone = styled.label<{ $dragging: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => `${theme.spacing.space8}px ${theme.spacing.space4}px`};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  border: 2px dashed
    ${({ theme, $dragging }) => ($dragging ? theme.colors.primary : theme.colors.outlineVariant)};
  background: ${({ theme, $dragging }) =>
    $dragging ? withAlpha(theme.colors.primary, 0.06) : theme.colors.background};
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  > i {
    font-size: 30px;
    color: ${({ theme }) => theme.colors.accentGreen};
  }

  strong {
    ${({ theme }) => textStyle(theme.typography.titleSmall)}
  }

  span {
    ${({ theme }) => textStyle(theme.typography.bodySmall)}
  }
`;

export const ColumnChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  ${({ theme }) => textStyle(theme.typography.bodySmall)}

  code {
    padding: 1px ${({ theme }) => theme.spacing.space2}px;
    border-radius: ${({ theme }) => theme.radius.xs}px;
    ${({ theme }) => textStyle(theme.typography.labelSmallMono)}
    color: ${({ theme }) => theme.colors.onSurface};
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const FileBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => withAlpha(theme.colors.accentGreen, 0.1)};

  > i {
    font-size: 22px;
    color: ${({ theme }) => theme.colors.onAccentGreenContainer};
  }

  > div {
    flex: 1;
  }
`;
