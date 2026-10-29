import { useState } from 'react';
import { fill } from '../../checkout/shared/format';
import data from '../../../mocks/product_master_mock_data.json';
import {
  downloadCsv,
  matchesQuery,
  formOf,
  newId,
  subCategoryColumns,
  todayLabel,
} from '../../../services/admin/productMasterModels';
import type {
  MasterCategory,
  MasterSubCategory,
  SubCategoryImportRow,
} from '../../../services/admin/productMasterModels';
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
const L = mock.subCategory;
const sampleImport = data.subCategoryImport.rows as SubCategoryImportRow[];

type SubCategoryForm = Omit<MasterSubCategory, 'id' | 'updatedAt'>;

const blankForm = (categoryId: string): SubCategoryForm => ({
  code: '',
  name: '',
  shortName: '',
  categoryId,
  description: '',
  hsnCode: '',
  status: 'active',
});

export function SubCategoryTab({ data: master, setData, notify }: MasterTabProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [editing, setEditing] = useState<{ id: string | null; form: SubCategoryForm } | null>(null);
  const [deleting, setDeleting] = useState<MasterSubCategory | null>(null);
  const [importing, setImporting] = useState(false);

  const categoryOf = (id: string) => master.categories.find((c) => c.id === id);
  const brandNames = (id: string) =>
    master.brands.filter((b) => b.subCategoryIds.includes(id)).map((b) => b.name);

  const rows = master.subCategories.filter(
    (s) =>
      (categoryId === 'all' || s.categoryId === categoryId) &&
      (status === 'all' || s.status === status) &&
      matchesQuery(query, s.name, s.code, s.shortName, s.hsnCode),
  );
  const filtered = query !== '' || categoryId !== 'all' || status !== 'all';

  const openCreate = () =>
    setEditing({
      id: null,
      form: blankForm(categoryId !== 'all' ? categoryId : (master.categories[0]?.id ?? '')),
    });
  const openEdit = (row: MasterSubCategory) => setEditing({ id: row.id, form: formOf(row) });
  const patch = (changes: Partial<SubCategoryForm>) =>
    setEditing((e) => e && { ...e, form: { ...e.form, ...changes } });

  const save = () => {
    if (!editing) return;
    const { id, form } = editing;
    const row = { ...form, id: id ?? newId('sub'), updatedAt: todayLabel() };
    setData((d) => ({
      ...d,
      subCategories: id
        ? d.subCategories.map((s) => (s.id === id ? row : s))
        : [...d.subCategories, row],
    }));
    notify(fill(id ? C.updated : C.created, { name: row.name }));
    setEditing(null);
  };

  const toggle = (row: MasterSubCategory) => {
    const next = flipStatus(row.status);
    setData((d) => ({
      ...d,
      subCategories: d.subCategories.map((s) =>
        s.id === row.id ? { ...s, status: next, updatedAt: todayLabel() } : s,
      ),
    }));
    notify(fill(next === 'active' ? C.activated : C.deactivated, { name: row.name }));
  };

  const remove = (row: MasterSubCategory) => {
    setData((d) => ({
      ...d,
      subCategories: d.subCategories.filter((s) => s.id !== row.id),
      brands: d.brands.map((b) => ({
        ...b,
        subCategoryIds: b.subCategoryIds.filter((id) => id !== row.id),
      })),
    }));
    notify(fill(C.deleted, { name: row.name }));
    setDeleting(null);
  };

  /** Exports the rows currently shown (search + filters applied). */
  const exportRows = () => {
    downloadCsv(
      L.exportFile,
      [...subCategoryColumns, 'status'],
      rows.map((s) => [
        s.code,
        s.name,
        s.shortName,
        categoryOf(s.categoryId)?.code ?? '',
        s.description,
        s.hsnCode,
        s.status,
      ]),
    );
    notify(fill(L.exported, { count: rows.length, file: L.exportFile }));
  };

  const importRows = (fileName: string, valid: SubCategoryImportRow[]) => {
    const today = todayLabel();
    setData((d) => ({
      ...d,
      subCategories: [
        ...d.subCategories,
        ...valid.map((r, i) => ({
          id: `${newId('sub')}-${i}`,
          code: r.code,
          name: r.name,
          shortName: r.shortName,
          categoryId: d.categories.find((c) => c.code === r.categoryCode)?.id ?? '',
          description: r.description,
          hsnCode: r.hsnCode,
          status: 'active' as const,
          updatedAt: today,
        })),
      ],
    }));
    notify(fill(L.imported, { count: valid.length, file: fileName }));
    setImporting(false);
  };

  return (
    <S.Card $lg={12} aria-label={mock._tabs[1].label}>
      <P.Toolbar>
        <P.ToolbarFilters>
          <SearchField value={query} onChange={setQuery} />
          <P.Select
            value={categoryId}
            aria-label={C.category}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="all">{C.allCategories}</option>
            {master.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </P.Select>
          <StatusFilter value={status} onChange={setStatus} />
        </P.ToolbarFilters>
        <P.ToolbarActions>
          <S.QuickAction type="button" onClick={() => setImporting(true)}>
            <i className="pi pi-upload" aria-hidden />
            {L.import}
          </S.QuickAction>
          <S.QuickAction type="button" onClick={exportRows}>
            <i className="pi pi-file-excel" aria-hidden />
            {L.export}
          </S.QuickAction>
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
              <th scope="col">{C.subCategory}</th>
              <th scope="col">{L.shortName}</th>
              <th scope="col">{L.parent}</th>
              <th scope="col">{L.hsn}</th>
              <th scope="col">{mock.category.brands}</th>
              <th scope="col">{C.status}</th>
              <th scope="col">{C.updatedOn}</th>
              <P.ActionsHead scope="col">{C.actions}</P.ActionsHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const category = categoryOf(row.categoryId);
              return (
                <tr key={row.id}>
                  <td>
                    <P.NameBlock>
                      <S.ProductName>{row.name}</S.ProductName>
                      <P.Code>{row.code}</P.Code>
                    </P.NameBlock>
                  </td>
                  <td>{row.shortName}</td>
                  <td>
                    {category ? (
                      <P.Chip $strong>
                        <span>{category.name}</span>
                      </P.Chip>
                    ) : (
                      <P.Muted>—</P.Muted>
                    )}
                  </td>
                  <td>
                    <P.Code>{row.hsnCode || '—'}</P.Code>
                  </td>
                  <td>
                    <NameChips names={brandNames(row.id)} />
                  </td>
                  <td>
                    <StatusSwitch
                      status={row.status}
                      name={row.name}
                      onToggle={() => toggle(row)}
                    />
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
              );
            })}
            {rows.length === 0 && <EmptyRow colSpan={8} filtered={filtered} />}
          </tbody>
        </S.Table>
      </S.TableScroll>
      <P.ResultMeta>
        {fill(C.showing, { shown: rows.length, total: master.subCategories.length })}
      </P.ResultMeta>

      {editing && (
        <MasterDialog
          icon="pi-sitemap"
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
            <P.Field $full>
              <P.FieldLabel>{L.parent}</P.FieldLabel>
              <P.FormSelect
                value={editing.form.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
              >
                <option value="" disabled>
                  {L.selectCategory}
                </option>
                {master.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </P.FormSelect>
            </P.Field>
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
            <P.Field>
              <P.FieldLabel>{L.shortName}</P.FieldLabel>
              <P.Input
                value={editing.form.shortName}
                onChange={(e) => patch({ shortName: e.target.value })}
              />
              <P.FieldHint>{L.shortNameHint}</P.FieldHint>
            </P.Field>
            <P.Field>
              <P.FieldLabel>{L.hsn}</P.FieldLabel>
              <P.Input
                value={editing.form.hsnCode}
                inputMode="numeric"
                onChange={(e) => patch({ hsnCode: e.target.value })}
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

      {importing && (
        <ImportDialog
          categories={master.categories}
          existingCodes={new Set(master.subCategories.map((s) => s.code))}
          onClose={() => setImporting(false)}
          onImport={importRows}
        />
      )}
    </S.Card>
  );
}

/**
 * Bulk Excel import: pick a file (or drop it), preview the rows, import the
 * valid ones. UI only — the preview shows the sample rows from the mock.
 */
function ImportDialog({
  categories,
  existingCodes,
  onClose,
  onImport,
}: {
  categories: MasterCategory[];
  existingCodes: Set<string>;
  onClose: () => void;
  onImport: (fileName: string, rows: SubCategoryImportRow[]) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const checked = sampleImport.map((row) => ({
    row,
    error: existingCodes.has(row.code)
      ? fill(L.duplicateCode, { code: row.code })
      : !categories.some((c) => c.code === row.categoryCode)
        ? fill(L.unknownCategory, { code: row.categoryCode })
        : null,
  }));
  const valid = checked.filter((c) => !c.error).map((c) => c.row);

  const downloadTemplate = () =>
    downloadCsv(L.templateFile, subCategoryColumns, [
      subCategoryColumns.map((key) => sampleImport[0][key]),
    ]);

  return (
    <MasterDialog
      icon="pi-file-excel"
      title={L.importTitle}
      subtitle={L.importSubtitle}
      onClose={onClose}
      footer={
        fileName ? (
          <>
            <P.FootNote>
              {fill(L.previewSummary, {
                ready: valid.length,
                skipped: checked.length - valid.length,
              })}
            </P.FootNote>
            <DialogCancel onClick={onClose} />
            <S.QuickAction
              type="button"
              $primary
              disabled={valid.length === 0}
              onClick={() => onImport(fileName, valid)}
            >
              <i className="pi pi-check" aria-hidden />
              {fill(L.importButton, { count: valid.length })}
            </S.QuickAction>
          </>
        ) : (
          <DialogCancel onClick={onClose} />
        )
      }
    >
      {!fileName ? (
        <>
          <P.DropZone
            $dragging={dragging}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) setFileName(file.name);
            }}
          >
            <P.HiddenFileInput
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFileName(file.name);
              }}
            />
            <i className="pi pi-cloud-upload" aria-hidden />
            <strong>{L.dropTitle}</strong>
            <span>{L.dropHint}</span>
          </P.DropZone>
          <P.ColumnChips>
            {L.columns}:
            {L.columnList.map((col) => (
              <code key={col}>{col}</code>
            ))}
          </P.ColumnChips>
          <div>
            <S.TextButton type="button" onClick={downloadTemplate}>
              <i className="pi pi-download" aria-hidden />
              {L.template}
            </S.TextButton>
          </div>
        </>
      ) : (
        <>
          <P.FileBadge>
            <i className="pi pi-file-excel" aria-hidden />
            <P.NameText>
              <S.ProductName>{fileName}</S.ProductName>
              <P.FieldHint>{L.sampleNote}</P.FieldHint>
            </P.NameText>
            <S.TextButton type="button" onClick={() => setFileName(null)}>
              {L.chooseAnother}
            </S.TextButton>
          </P.FileBadge>

          <P.FormSection>
            <P.FormSectionTitle>{fill(L.previewTitle, { file: fileName })}</P.FormSectionTitle>
            <S.TableScroll>
              <S.Table>
                <thead>
                  <tr>
                    <th scope="col">{L.row}</th>
                    <th scope="col">{C.code}</th>
                    <th scope="col">{C.name}</th>
                    <th scope="col">{C.category}</th>
                    <th scope="col">{C.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {checked.map(({ row, error }, i) => (
                    <tr key={row.code}>
                      <td>{i + 2}</td>
                      <td>
                        <P.Code>{row.code}</P.Code>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.categoryCode}</td>
                      <td>
                        {error ? (
                          <S.StatusChip $tone="critical" title={error}>
                            <i className="pi pi-times-circle" aria-hidden />
                            {L.skipped}: {error}
                          </S.StatusChip>
                        ) : (
                          <S.StatusChip $tone="good">
                            <i className="pi pi-check-circle" aria-hidden />
                            {L.ready}
                          </S.StatusChip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </S.Table>
            </S.TableScroll>
          </P.FormSection>
        </>
      )}
    </MasterDialog>
  );
}
