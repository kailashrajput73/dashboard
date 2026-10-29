import { useState } from 'react';
import { fill } from '../../checkout/shared/format';
import { userInitials } from '../../../shared/userInitials';
import { withAlpha } from '../../../theme';
import {
  formOf,
  matchesQuery,
  newId,
  todayLabel,
} from '../../../services/admin/productMasterModels';
import type { MasterBrand } from '../../../services/admin/productMasterModels';
import * as S from '../AdminDashboard/AdminDashboard.styles';
import {
  ConfirmDelete,
  DialogCancel,
  EmptyRow,
  MasterDialog,
  NameChips,
  RowActions,
  SearchField,
  StatusFilter,
  StatusFormRow,
  StatusSwitch,
} from './MasterParts';
import type { StatusFilterValue } from './MasterParts';
import { flipStatus } from './masterTab';
import type { MasterTabProps } from './masterTab';
import mock from './ProductMaster.mock.json';
import * as P from './ProductMaster.styles';

const C = mock._common;
const L = mock.brand;

type BrandForm = Omit<MasterBrand, 'id' | 'updatedAt'> & { logoUrl: string };

const blankForm = (): BrandForm => ({
  code: '',
  name: '',
  description: '',
  website: '',
  logoColor: '#1A56DB',
  logoUrl: '',
  categoryIds: [],
  subCategoryIds: [],
  status: 'active',
});

function BrandLogo({ name, color, logoUrl }: { name: string; color: string; logoUrl?: string }) {
  return (
    <P.Thumb $bg={withAlpha(color, 0.12)} $fg={color} aria-hidden>
      {logoUrl ? <img src={logoUrl} alt="" /> : userInitials(name || '?')}
    </P.Thumb>
  );
}

export function BrandTab({ data, setData, notify }: MasterTabProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [editing, setEditing] = useState<{ id: string | null; form: BrandForm } | null>(null);
  const [deleting, setDeleting] = useState<MasterBrand | null>(null);
  /** Uploaded logos (object URLs) by brand id — UI only, not in the mock model. */
  const [logos, setLogos] = useState<Record<string, string>>({});

  const categoryName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? id;
  const subCategoryNames = (ids: string[]) =>
    ids.flatMap((id) => data.subCategories.find((s) => s.id === id)?.name ?? []);

  const rows = data.brands.filter(
    (b) =>
      (categoryId === 'all' || b.categoryIds.includes(categoryId)) &&
      (status === 'all' || b.status === status) &&
      matchesQuery(query, b.name, b.code),
  );
  const filtered = query !== '' || categoryId !== 'all' || status !== 'all';

  const openCreate = () => setEditing({ id: null, form: blankForm() });
  const openEdit = (row: MasterBrand) =>
    setEditing({ id: row.id, form: { ...formOf(row), logoUrl: logos[row.id] ?? '' } });
  const patch = (changes: Partial<BrandForm>) =>
    setEditing((e) => e && { ...e, form: { ...e.form, ...changes } });

  /** Unchecking a category also drops its sub-categories from the mapping. */
  const toggleCategory = (id: string) => {
    if (!editing) return;
    const { categoryIds, subCategoryIds } = editing.form;
    if (categoryIds.includes(id)) {
      const dropped = new Set(
        data.subCategories.filter((s) => s.categoryId === id).map((s) => s.id),
      );
      patch({
        categoryIds: categoryIds.filter((c) => c !== id),
        subCategoryIds: subCategoryIds.filter((s) => !dropped.has(s)),
      });
    } else {
      patch({ categoryIds: [...categoryIds, id] });
    }
  };
  const toggleSub = (id: string) => {
    if (!editing) return;
    const ids = editing.form.subCategoryIds;
    patch({ subCategoryIds: ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id] });
  };
  const setAllSubs = (catId: string, on: boolean) => {
    if (!editing) return;
    const inCat = data.subCategories.filter((s) => s.categoryId === catId).map((s) => s.id);
    const rest = editing.form.subCategoryIds.filter((s) => !inCat.includes(s));
    patch({ subCategoryIds: on ? [...rest, ...inCat] : rest });
  };

  const save = () => {
    if (!editing) return;
    const { id, form } = editing;
    const { logoUrl, ...brand } = form;
    const row = { ...brand, id: id ?? newId('brand'), updatedAt: todayLabel() };
    setData((d) => ({
      ...d,
      brands: id ? d.brands.map((b) => (b.id === id ? row : b)) : [...d.brands, row],
    }));
    if (logoUrl) setLogos((l) => ({ ...l, [row.id]: logoUrl }));
    notify(fill(id ? C.updated : C.created, { name: row.name }));
    setEditing(null);
  };

  const toggle = (row: MasterBrand) => {
    const next = flipStatus(row.status);
    setData((d) => ({
      ...d,
      brands: d.brands.map((b) =>
        b.id === row.id ? { ...b, status: next, updatedAt: todayLabel() } : b,
      ),
    }));
    notify(fill(next === 'active' ? C.activated : C.deactivated, { name: row.name }));
  };

  const remove = (row: MasterBrand) => {
    setData((d) => ({ ...d, brands: d.brands.filter((b) => b.id !== row.id) }));
    notify(fill(C.deleted, { name: row.name }));
    setDeleting(null);
  };

  return (
    <S.Card $lg={12} aria-label={mock._tabs[2].label}>
      <P.Toolbar>
        <P.ToolbarFilters>
          <SearchField value={query} onChange={setQuery} />
          <P.Select
            value={categoryId}
            aria-label={L.mappedCategories}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="all">{C.allCategories}</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </P.Select>
          <StatusFilter value={status} onChange={setStatus} />
        </P.ToolbarFilters>
        <P.ToolbarActions>
          <S.QuickAction type="button" $primary onClick={openCreate}>
            <i className="pi pi-plus" aria-hidden />
            {L.add}
          </S.QuickAction>
        </P.ToolbarActions>
      </P.Toolbar>

      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th scope="col">{C.brand}</th>
              <th scope="col">{L.mappedCategories}</th>
              <th scope="col">{L.mappedSubCategories}</th>
              <th scope="col">{C.status}</th>
              <th scope="col">{C.updatedOn}</th>
              <P.ActionsHead scope="col">{C.actions}</P.ActionsHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <P.NameCell>
                    <BrandLogo name={row.name} color={row.logoColor} logoUrl={logos[row.id]} />
                    <P.NameText>
                      <S.ProductName>{row.name}</S.ProductName>
                      <P.Code>{row.code}</P.Code>
                    </P.NameText>
                  </P.NameCell>
                </td>
                <td>
                  {row.categoryIds.length === 0 ? (
                    <P.Muted>{L.notMapped}</P.Muted>
                  ) : (
                    <NameChips names={row.categoryIds.map(categoryName)} strong />
                  )}
                </td>
                <td>
                  <NameChips names={subCategoryNames(row.subCategoryIds)} />
                </td>
                <td>
                  <StatusSwitch status={row.status} name={row.name} onToggle={() => toggle(row)} />
                </td>
                <td>
                  <P.Muted>{row.updatedAt}</P.Muted>
                </td>
                <RowActions
                  name={row.name}
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleting(row)}
                />
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={6} filtered={filtered} />}
          </tbody>
        </S.Table>
      </S.TableScroll>
      <P.ResultMeta>
        {fill(C.showing, { shown: rows.length, total: data.brands.length })}
      </P.ResultMeta>

      {editing && (
        <MasterDialog
          icon="pi-tag"
          title={editing.id ? L.editTitle : L.createTitle}
          subtitle={L.formSubtitle}
          onClose={() => setEditing(null)}
          footer={
            <>
              <DialogCancel onClick={() => setEditing(null)} />
              <S.QuickAction type="button" $primary onClick={save}>
                <i className="pi pi-check" aria-hidden />
                {editing.id ? C.save : L.createTitle}
              </S.QuickAction>
            </>
          }
        >
          <P.FormGrid>
            <P.Field>
              <P.FieldLabel>{C.name}</P.FieldLabel>
              <P.Input
                value={editing.form.name}
                placeholder={L.namePlaceholder}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </P.Field>
            <P.Field>
              <P.FieldLabel>{C.code}</P.FieldLabel>
              <P.Input
                value={editing.form.code}
                placeholder={L.codePlaceholder}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              />
            </P.Field>
            <P.Field $full>
              <P.FieldLabel>{C.description}</P.FieldLabel>
              <P.TextArea
                value={editing.form.description}
                placeholder={L.descriptionPlaceholder}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </P.Field>
          </P.FormGrid>

          <P.FormSection>
            <P.FormSectionTitle>{L.logo}</P.FormSectionTitle>
            <P.UploadRow>
              <P.UploadPreview
                $bg={withAlpha(editing.form.logoColor, 0.12)}
                $fg={editing.form.logoColor}
                aria-hidden
              >
                {editing.form.logoUrl ? (
                  <img src={editing.form.logoUrl} alt="" />
                ) : (
                  userInitials(editing.form.name || '?')
                )}
              </P.UploadPreview>
              <P.UploadText>
                <label>
                  <P.HiddenFileInput
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) patch({ logoUrl: URL.createObjectURL(file) });
                    }}
                  />
                  <P.OutlineButton>
                    <i className="pi pi-upload" aria-hidden />
                    {L.upload}
                  </P.OutlineButton>
                </label>
                <P.FieldHint>{L.logoHint}</P.FieldHint>
              </P.UploadText>
            </P.UploadRow>
          </P.FormSection>

          <P.FormSection>
            <P.FormSectionTitle>
              <i className="pi pi-link" aria-hidden />
              {L.mapping}
            </P.FormSectionTitle>
            <P.FieldHint>{L.mappingHint}</P.FieldHint>

            <P.FieldLabel>{L.mappedCategories}</P.FieldLabel>
            <P.CheckChips>
              {data.categories.map((c) => {
                const on = editing.form.categoryIds.includes(c.id);
                return (
                  <P.CheckChip key={c.id} $checked={on}>
                    <input type="checkbox" checked={on} onChange={() => toggleCategory(c.id)} />
                    {on && <i className="pi pi-check" aria-hidden />}
                    {c.name}
                  </P.CheckChip>
                );
              })}
            </P.CheckChips>

            <P.FieldLabel>{L.mappedSubCategories}</P.FieldLabel>
            <P.PickerBox>
              <P.PickerList>
                {editing.form.categoryIds.length === 0 && (
                  <P.PickerEmpty>{L.noCategoryPicked}</P.PickerEmpty>
                )}
                {editing.form.categoryIds.map((catId) => {
                  const subs = data.subCategories.filter((s) => s.categoryId === catId);
                  const allOn =
                    subs.length > 0 &&
                    subs.every((s) => editing.form.subCategoryIds.includes(s.id));
                  return (
                    <li key={catId}>
                      <P.PickerSubList>
                        <P.PickerGroupLabel>
                          {categoryName(catId)}
                          {subs.length > 0 && (
                            <P.LinkButton type="button" onClick={() => setAllSubs(catId, !allOn)}>
                              {allOn ? L.clear : L.selectAll}
                            </P.LinkButton>
                          )}
                        </P.PickerGroupLabel>
                        {subs.length === 0 && <P.PickerEmpty>{C.empty}</P.PickerEmpty>}
                        {subs.map((s) => {
                          const on = editing.form.subCategoryIds.includes(s.id);
                          return (
                            <li key={s.id}>
                              <P.PickerItem $checked={on}>
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggleSub(s.id)}
                                />
                                <P.PickerText>
                                  {s.name}
                                  <small>{s.code}</small>
                                </P.PickerText>
                              </P.PickerItem>
                            </li>
                          );
                        })}
                      </P.PickerSubList>
                    </li>
                  );
                })}
              </P.PickerList>
            </P.PickerBox>
          </P.FormSection>

          <StatusFormRow status={editing.form.status} onChange={(s) => patch({ status: s })} />
        </MasterDialog>
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </S.Card>
  );
}
