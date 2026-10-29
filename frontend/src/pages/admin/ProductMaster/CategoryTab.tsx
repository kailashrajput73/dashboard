import { useState } from 'react';
import { fill } from '../../checkout/shared/format';
import {
  formOf,
  matchesQuery,
  newId,
  todayLabel,
} from '../../../services/admin/productMasterModels';
import type { MasterCategory } from '../../../services/admin/productMasterModels';
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
const L = mock.category;

type CategoryForm = Omit<MasterCategory, 'id' | 'updatedAt'>;

const blankForm = (displayOrder: number): CategoryForm => ({
  code: '',
  name: '',
  description: '',
  icon: 'pi-th-large',
  imageAsset: '',
  iconColor: '#1A56DB',
  iconBackground: '#D6E4FF',
  displayOrder,
  status: 'active',
});

function CategoryThumb({
  category,
}: {
  category: Pick<MasterCategory, 'icon' | 'imageAsset' | 'iconColor' | 'iconBackground'>;
}) {
  return (
    <P.Thumb $bg={category.iconBackground} $fg={category.iconColor} aria-hidden>
      {category.imageAsset ? (
        <img src={category.imageAsset} alt="" loading="lazy" />
      ) : (
        <i className={`pi ${category.icon}`} />
      )}
    </P.Thumb>
  );
}

export function CategoryTab({ data, setData, notify }: MasterTabProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [editing, setEditing] = useState<{ id: string | null; form: CategoryForm } | null>(null);
  const [deleting, setDeleting] = useState<MasterCategory | null>(null);

  const subNames = (id: string) =>
    data.subCategories.filter((s) => s.categoryId === id).map((s) => s.name);
  const subCount = (id: string) => subNames(id).length;
  const brandNames = (id: string) =>
    data.brands.filter((b) => b.categoryIds.includes(id)).map((b) => b.name);

  const rows = [...data.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        matchesQuery(query, c.name, c.code, c.description),
    );
  const filtered = query !== '' || status !== 'all';

  const openCreate = () =>
    setEditing({
      id: null,
      form: blankForm(Math.max(0, ...data.categories.map((c) => c.displayOrder)) + 1),
    });
  const openEdit = (row: MasterCategory) => setEditing({ id: row.id, form: formOf(row) });
  const patch = (changes: Partial<CategoryForm>) =>
    setEditing((e) => e && { ...e, form: { ...e.form, ...changes } });

  const save = () => {
    if (!editing) return;
    const { id, form } = editing;
    const row = { ...form, id: id ?? newId('cat'), updatedAt: todayLabel() };
    setData((d) => ({
      ...d,
      categories: id ? d.categories.map((c) => (c.id === id ? row : c)) : [...d.categories, row],
    }));
    notify(fill(id ? C.updated : C.created, { name: row.name }));
    setEditing(null);
  };

  const toggle = (row: MasterCategory) => {
    const next = flipStatus(row.status);
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === row.id ? { ...c, status: next, updatedAt: todayLabel() } : c,
      ),
    }));
    notify(fill(next === 'active' ? C.activated : C.deactivated, { name: row.name }));
  };

  /** Deleting a category also removes its sub-categories and unmaps it from brands. */
  const remove = (row: MasterCategory) => {
    setData((d) => {
      const subIds = new Set(
        d.subCategories.filter((s) => s.categoryId === row.id).map((s) => s.id),
      );
      return {
        ...d,
        categories: d.categories.filter((c) => c.id !== row.id),
        subCategories: d.subCategories.filter((s) => !subIds.has(s.id)),
        brands: d.brands.map((b) => ({
          ...b,
          categoryIds: b.categoryIds.filter((id) => id !== row.id),
          subCategoryIds: b.subCategoryIds.filter((id) => !subIds.has(id)),
        })),
      };
    });
    notify(fill(C.deleted, { name: row.name }));
    setDeleting(null);
  };

  const onUpload = (file: File | undefined) =>
    file && patch({ imageAsset: URL.createObjectURL(file) });

  return (
    <S.Card $lg={12} aria-label={mock._tabs[0].label}>
      <P.Toolbar>
        <P.ToolbarFilters>
          <SearchField value={query} onChange={setQuery} />
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
              <th scope="col">{C.category}</th>
              <th scope="col">{C.description}</th>
              <th scope="col">{L.subCategories}</th>
              <th scope="col">{L.brands}</th>
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
                    <CategoryThumb category={row} />
                    <P.NameText>
                      <S.ProductName>{row.name}</S.ProductName>
                      <P.Code>{row.code}</P.Code>
                    </P.NameText>
                  </P.NameCell>
                </td>
                <P.DescCell>{row.description}</P.DescCell>
                <td>
                  <NameChips names={subNames(row.id)} />
                </td>
                <td>
                  <NameChips names={brandNames(row.id)} />
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
            {rows.length === 0 && <EmptyRow colSpan={7} filtered={filtered} />}
          </tbody>
        </S.Table>
      </S.TableScroll>
      <P.ResultMeta>
        {fill(C.showing, { shown: rows.length, total: data.categories.length })}
      </P.ResultMeta>

      {editing && (
        <MasterDialog
          icon="pi-th-large"
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
            <P.FormSectionTitle>{L.image}</P.FormSectionTitle>
            <P.UploadRow>
              <P.UploadPreview
                $bg={editing.form.iconBackground}
                $fg={editing.form.iconColor}
                aria-label={L.preview}
              >
                {editing.form.imageAsset ? (
                  <img src={editing.form.imageAsset} alt="" />
                ) : (
                  <i className={`pi ${editing.form.icon}`} aria-hidden />
                )}
              </P.UploadPreview>
              <P.UploadText>
                <label>
                  <P.HiddenFileInput
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => onUpload(e.target.files?.[0])}
                  />
                  <P.OutlineButton>
                    <i className="pi pi-upload" aria-hidden />
                    {editing.form.imageAsset ? L.replace : L.upload}
                  </P.OutlineButton>
                </label>
                <P.FieldHint>{L.imageHint}</P.FieldHint>
              </P.UploadText>
            </P.UploadRow>
          </P.FormSection>

          <StatusFormRow status={editing.form.status} onChange={(s) => patch({ status: s })} />
        </MasterDialog>
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          extra={
            subCount(deleting.id) > 0
              ? fill(L.deleteLinked, { count: subCount(deleting.id) })
              : undefined
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </S.Card>
  );
}
