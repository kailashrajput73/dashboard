import { useState } from 'react';
import { fill, formatInr } from '../../checkout/shared/format';
import {
  MIN_GROUP_PRODUCTS,
  matchesQuery,
  formOf,
  newId,
  todayLabel,
} from '../../../services/admin/productMasterModels';
import type { MasterProduct, ProductGroup } from '../../../services/admin/productMasterModels';
import * as S from '../AdminDashboard/AdminDashboard.styles';
import {
  ConfirmDelete,
  DialogCancel,
  EmptyRow,
  MasterDialog,
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
const L = mock.productGroup;
/** "No filter" value for the group / category / brand selects. */
const ALL = 'all';

type GroupForm = Omit<ProductGroup, 'id' | 'updatedAt'>;

const blankForm = (): GroupForm => ({
  code: '',
  name: '',
  description: '',
  productIds: [],
  status: 'active',
});

export function ProductGroupTab({ data, setData, notify }: MasterTabProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [editing, setEditing] = useState<{ id: string | null; form: GroupForm } | null>(null);
  const [deleting, setDeleting] = useState<ProductGroup | null>(null);

  const productById = (id: string) => data.products.find((p) => p.id === id);
  const itemsOf = (g: ProductGroup) =>
    g.productIds.map(productById).filter((p): p is MasterProduct => Boolean(p));
  /** Product matches the category / brand filters (highlighted in its row). */
  const productMatches = (p: MasterProduct) =>
    (category === ALL || p.categoryId === category) && (brand === ALL || p.brandId === brand);
  const narrowed = category !== ALL || brand !== ALL;

  const groups = data.groups.filter((g) => {
    const items = itemsOf(g);
    return (
      (status === 'all' || g.status === status) &&
      (groupFilter === ALL || g.id === groupFilter) &&
      (!narrowed || items.some(productMatches)) &&
      matchesQuery(query, g.name, g.code, g.description, ...items.map((p) => p.name))
    );
  });
  const filtered = query !== '' || status !== 'all' || groupFilter !== ALL || narrowed;
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setGroupFilter(ALL);
    setCategory(ALL);
    setBrand(ALL);
  };

  const openCreate = () => setEditing({ id: null, form: blankForm() });
  const openEdit = (row: ProductGroup) => setEditing({ id: row.id, form: formOf(row) });
  const patch = (changes: Partial<GroupForm>) =>
    setEditing((e) => e && { ...e, form: { ...e.form, ...changes } });

  const save = () => {
    if (!editing || editing.form.productIds.length < MIN_GROUP_PRODUCTS) return;
    const { id, form } = editing;
    const row = { ...form, id: id ?? newId('grp'), updatedAt: todayLabel() };
    setData((d) => ({
      ...d,
      groups: id ? d.groups.map((g) => (g.id === id ? row : g)) : [...d.groups, row],
    }));
    notify(fill(id ? C.updated : C.created, { name: row.name }));
    setEditing(null);
  };

  const toggle = (row: ProductGroup) => {
    const next = flipStatus(row.status);
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === row.id ? { ...g, status: next, updatedAt: todayLabel() } : g,
      ),
    }));
    notify(fill(next === 'active' ? C.activated : C.deactivated, { name: row.name }));
  };

  const remove = (row: ProductGroup) => {
    setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== row.id) }));
    if (groupFilter === row.id) setGroupFilter(ALL);
    notify(fill(C.deleted, { name: row.name }));
    setDeleting(null);
  };

  /** Removes one product from a group, keeping the two-product minimum. */
  const removeProduct = (group: ProductGroup, product: MasterProduct) => {
    if (group.productIds.length <= MIN_GROUP_PRODUCTS) {
      notify(
        fill(L.minWarning, { group: group.name, product: product.name, min: MIN_GROUP_PRODUCTS }),
      );
      return;
    }
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              productIds: g.productIds.filter((id) => id !== product.id),
              updatedAt: todayLabel(),
            }
          : g,
      ),
    }));
    notify(fill(L.removed, { product: product.name, group: group.name }));
  };

  return (
    <P.TabStack>
      <S.Card $lg={12} aria-labelledby="master-groups">
        <S.CardHead>
          <div>
            <S.CardTitle id="master-groups">{L.groupsTitle}</S.CardTitle>
            <S.CardSubtitle>{L.groupsSubtitle}</S.CardSubtitle>
          </div>
          {filtered && (
            <S.TextButton type="button" onClick={clearFilters}>
              <i className="pi pi-filter-slash" aria-hidden />
              {C.clearFilters}
            </S.TextButton>
          )}
        </S.CardHead>
        <P.Toolbar>
          <P.ToolbarFilters>
            <SearchField value={query} onChange={setQuery} />
            <P.Select
              value={groupFilter}
              aria-label={mock._tabs[3].label}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value={ALL}>{L.allGroups}</option>
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.productIds.length})
                </option>
              ))}
            </P.Select>
            <P.Select
              value={category}
              aria-label={C.category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value={ALL}>{C.allCategories}</option>
              {data.categories
                .filter((c) => data.products.some((p) => p.categoryId === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </P.Select>
            <P.Select value={brand} aria-label={C.brand} onChange={(e) => setBrand(e.target.value)}>
              <option value={ALL}>{C.allBrands}</option>
              {data.brands
                .filter((b) => data.products.some((p) => p.brandId === b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                <th scope="col">{mock._tabs[3].label}</th>
                <th scope="col">{C.products}</th>
                <th scope="col">{C.status}</th>
                <th scope="col">{C.updatedOn}</th>
                <P.ActionsHead scope="col">{C.actions}</P.ActionsHead>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const items = itemsOf(group);
                return (
                  <tr key={group.id}>
                    <td>
                      <P.NameBlock>
                        <S.ProductName>{group.name}</S.ProductName>
                        <P.Code>{group.code}</P.Code>
                        <S.ProductMeta>{group.description}</S.ProductMeta>
                      </P.NameBlock>
                    </td>
                    <td>
                      <P.ChipList>
                        {items.map((p) => (
                          <P.Chip
                            key={p.id}
                            $strong={narrowed && productMatches(p)}
                            title={`${p.sku} · ${p.name}`}
                          >
                            <span>{p.name}</span>
                            <P.ChipRemove
                              type="button"
                              aria-label={fill(L.remove, { name: p.name })}
                              onClick={() => removeProduct(group, p)}
                            >
                              <i className="pi pi-times" aria-hidden />
                            </P.ChipRemove>
                          </P.Chip>
                        ))}
                      </P.ChipList>
                    </td>
                    <td>
                      <StatusSwitch
                        status={group.status}
                        name={group.name}
                        onToggle={() => toggle(group)}
                      />
                    </td>
                    <td>
                      <P.Muted>{group.updatedAt}</P.Muted>
                    </td>
                    <RowActions
                      name={group.name}
                      onEdit={() => openEdit(group)}
                      onDelete={() => setDeleting(group)}
                    />
                  </tr>
                );
              })}
              {groups.length === 0 && <EmptyRow colSpan={5} filtered={filtered} />}
            </tbody>
          </S.Table>
        </S.TableScroll>
        <P.ResultMeta>
          {fill(C.showing, { shown: groups.length, total: data.groups.length })}
        </P.ResultMeta>
      </S.Card>

      {editing && (
        <GroupDialog
          editing={editing}
          data={data}
          onChange={patch}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </P.TabStack>
  );
}

/** Create / edit a group and assign products (search + category / brand filters). */
function GroupDialog({
  editing,
  data,
  onChange,
  onClose,
  onSave,
}: {
  editing: { id: string | null; form: GroupForm };
  data: MasterTabProps['data'];
  onChange: (changes: Partial<GroupForm>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const { form } = editing;
  const picked = new Set(form.productIds);
  const missing = Math.max(0, MIN_GROUP_PRODUCTS - picked.size);

  const brandName = (id: string) => data.brands.find((b) => b.id === id)?.name ?? '';
  const list = data.products.filter(
    (p) =>
      (category === ALL || p.categoryId === category) &&
      (brand === ALL || p.brandId === brand) &&
      matchesQuery(query, p.name, p.sku, brandName(p.brandId)),
  );
  const toggleProduct = (id: string) =>
    onChange({
      productIds: picked.has(id)
        ? form.productIds.filter((p) => p !== id)
        : [...form.productIds, id],
    });

  return (
    <MasterDialog
      icon="pi-objects-column"
      title={editing.id ? L.editTitle : L.createTitle}
      subtitle={L.formSubtitle}
      onClose={onClose}
      footer={
        <>
          <P.FootNote $warn={missing > 0}>
            {missing > 0
              ? fill(L.needMore, { count: missing })
              : fill(L.selectedCount, { count: picked.size })}
          </P.FootNote>
          <DialogCancel onClick={onClose} />
          <S.QuickAction type="button" $primary disabled={missing > 0} onClick={onSave}>
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
            value={form.name}
            placeholder={L.namePlaceholder}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </P.Field>
        <P.Field>
          <P.FieldLabel>{C.code}</P.FieldLabel>
          <P.Input
            value={form.code}
            placeholder={L.codePlaceholder}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
          />
        </P.Field>
        <P.Field $full>
          <P.FieldLabel>{C.description}</P.FieldLabel>
          <P.TextArea
            value={form.description}
            placeholder={L.descriptionPlaceholder}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </P.Field>
      </P.FormGrid>

      <P.FormSection>
        <P.FormSectionTitle>
          <i className="pi pi-box" aria-hidden />
          {L.assign}
          <small>{fill(L.selectedCount, { count: picked.size })}</small>
        </P.FormSectionTitle>
        <P.FieldHint>{fill(L.assignHint, { min: MIN_GROUP_PRODUCTS })}</P.FieldHint>

        {picked.size > 0 && (
          <P.ChipList aria-label={L.selected}>
            {form.productIds.map((id) => {
              const p = data.products.find((x) => x.id === id);
              if (!p) return null;
              return (
                <P.Chip key={id} $strong title={p.name}>
                  <span>{p.name}</span>
                  <P.ChipRemove
                    type="button"
                    aria-label={fill(L.remove, { name: p.name })}
                    onClick={() => toggleProduct(id)}
                  >
                    <i className="pi pi-times" aria-hidden />
                  </P.ChipRemove>
                </P.Chip>
              );
            })}
          </P.ChipList>
        )}

        <P.PickerBox>
          <P.PickerTools>
            <SearchField value={query} onChange={setQuery} placeholder={L.searchProducts} />
            <P.Select
              value={category}
              aria-label={C.category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value={ALL}>{C.allCategories}</option>
              {data.categories
                .filter((c) => data.products.some((p) => p.categoryId === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </P.Select>
            <P.Select value={brand} aria-label={C.brand} onChange={(e) => setBrand(e.target.value)}>
              <option value={ALL}>{C.allBrands}</option>
              {data.brands
                .filter((b) => data.products.some((p) => p.brandId === b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </P.Select>
          </P.PickerTools>
          <P.PickerList>
            {list.length === 0 && <P.PickerEmpty>{L.noProducts}</P.PickerEmpty>}
            {list.map((p) => {
              const on = picked.has(p.id);
              return (
                <li key={p.id}>
                  <P.PickerItem $checked={on}>
                    <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)} />
                    <P.PickerText>
                      {p.name}
                      <small>
                        {p.sku} · {brandName(p.brandId)}
                      </small>
                    </P.PickerText>
                    <P.PickerSide>{formatInr(p.price)}</P.PickerSide>
                  </P.PickerItem>
                </li>
              );
            })}
          </P.PickerList>
        </P.PickerBox>
      </P.FormSection>

      <StatusFormRow status={form.status} onChange={(s) => onChange({ status: s })} />
    </MasterDialog>
  );
}
