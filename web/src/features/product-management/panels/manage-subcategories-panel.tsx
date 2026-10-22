import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  createSubcategory,
  deleteSubcategoryCascade,
  importSubcategories,
  updateSubcategory,
  type CatalogItem,
  type Category,
  type Subcategory,
} from "../../../api/endpoints";
import { ApiError } from "../../../api/client";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../../../components/LinkedProducts";
import { Icon } from "../../../components/Icon";
import { PasscodeConfirmModal } from "../../../components/PasscodeConfirmModal";
import { AppModal, Button, Chip, Input } from "../../../components/UI";
import {
  SHELF_PRICE_BOARD_ENABLED,
  ShelfPriceBoard,
} from "../../../features/shelf-price-board";
import { colors, font, radii, spacing } from "../../../theme";
import { parseCsvBytes } from "../../../utils/csv-reader";
import { downloadCsv } from "../../../utils/download-csv";

type Props = {
  categories: Category[];
  subcategories: Subcategory[];
  products: CatalogItem[];
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenBatchImport?: () => void;
};

export function ManageSubcategoriesPanel(props: Props) {
  const importInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [parent, setParent] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Subcategory | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () =>
      props.subcategories.filter((item) => {
        const matchesParent = parent === "all" || item.categoryId === parent;
        const text = `${item.name} ${item.category}`.toLowerCase();
        return matchesParent && text.includes(query.trim().toLowerCase());
      }),
    [props.subcategories, parent, query],
  );

  function productsFor(subcategory: Subcategory) {
    const subcategoryName = (subcategory.name || "").toLowerCase();
    const categoryName = (subcategory.category || "").toLowerCase();
    return props.products.filter((item) => {
      if (item.subcategoryId && item.subcategoryId === subcategory.id) return true;
      const sameCategory = (item.category || "").toLowerCase() === categoryName;
      const sameSubcategory =
        (item.subcategory || "").toLowerCase() === subcategoryName ||
        (item.type || "").toLowerCase() === subcategoryName;
      return sameCategory && sameSubcategory;
    });
  }

  function boardsFor(listed: CatalogItem[]) {
    const map = new Map<string, CatalogItem[]>();
    for (const item of listed) {
      const key = (item.productGroup || "Ungrouped").trim() || "Ungrouped";
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setCategoryId(
      props.categories.find((c) => c.isActive)?.id || props.categories[0]?.id || "",
    );
  }

  function openEdit(item: Subcategory) {
    setEditor(item);
    setName(item.name);
    setCategoryId(item.categoryId);
  }

  async function save() {
    if (!name.trim() || !categoryId) {
      props.onError("Subcategory name and parent category are required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateSubcategory(editor.id, { name: name.trim(), categoryId });
      } else {
        await createSubcategory({ name: name.trim(), categoryId });
      }
      setEditor(undefined);
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not save subcategory");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteSubcategoryCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      props.onChanged();
      props.onError(`Deleted ${deleteTarget.name} and ${result.productsRemoved} product(s).`);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not delete subcategory");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const csv = [
      "name,category",
      ...props.subcategories.map((item) => `${csvCell(item.name)},${csvCell(item.category)}`),
    ].join("\n");
    try {
      downloadCsv(`\uFEFF${csv}`, "subcategories.csv");
    } catch {
      props.onError("Could not open the CSV export.");
    }
  }

  async function importCsv(file: File) {
    try {
      const parsed = parseCsvBytes(new Uint8Array(await file.arrayBuffer()));
      if (!parsed.ok) {
        props.onError(parsed.error);
        return;
      }
      const payload = parsed.rows
        .map((row) => ({
          name: (row.name || row.subcategory || "").trim(),
          category: (row.category || row["parent category"] || "").trim(),
        }))
        .filter((row) => row.name && row.category);
      if (!payload.length) {
        props.onError("CSV needs name and category columns.");
        return;
      }
      setSaving(true);
      const result = await importSubcategories(payload);
      props.onChanged();
      props.onError(`Subcategory import: ${result.inserted} added, ${result.skipped} skipped.`);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Subcategory import failed");
    } finally {
      setSaving(false);
    }
  }

  function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void importCsv(file);
  }

  return (
    <>
      <div style={headerActionsStyle}>
        <button
          type="button"
          data-testid="download-subcategory-template"
          aria-label="Download subcategory template"
          onClick={() => downloadCsv("\uFEFFname,category\n", "subcategories-template.csv")}
          style={iconActionStyle}
        >
          <Icon name="document-outline" size={22} color={colors.primary} />
        </button>
        <button
          type="button"
          data-testid="import-subcategories"
          aria-label="Import subcategories"
          onClick={() => importInput.current?.click()}
          style={iconActionStyle}
        >
          <Icon name="cloud-upload-outline" size={22} color={colors.primary} />
        </button>
        <button
          type="button"
          data-testid="export-subcategories"
          aria-label="Export subcategories"
          onClick={exportCsv}
          style={iconActionStyle}
        >
          <Icon name="download-outline" size={22} color={colors.primary} />
        </button>
        <Button testID="open-add-subcategory" title="Add new" size="sm" onPress={openCreate} />
      </div>
      <input
        ref={importInput}
        type="file"
        accept=".csv,text/csv"
        onChange={onImportFileChange}
        style={{ display: "none" }}
        data-testid="subcategory-csv-input"
      />
      <Input
        testID="subcategory-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search subcategories"
        style={{ marginBottom: spacing.sm }}
      />
      <div className="admin-chip-scroll" style={chipRowStyle}>
        {[{ id: "all", name: "All" }, ...props.categories].map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={parent === category.id}
            onPress={() => setParent(category.id)}
            testID={`subcategory-filter-${category.id}`}
          />
        ))}
      </div>
      <div style={listStyle}>
        {filtered.length ? (
          filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <div key={item.id} data-testid={`subcategory-row-${item.id}`} style={cardStyle}>
                <div style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nameStyle}>{item.name}</div>
                    <div style={parentStyle}>{item.category}</div>
                    <ProductCountButton
                      count={listed.length || item.productCount || 0}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`subcategory-products-${item.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid={`edit-subcategory-${item.id}`}
                    aria-label={`Edit ${item.name}`}
                    onClick={() => openEdit(item)}
                    style={iconActionStyle}
                  >
                    <Icon name="create-outline" size={19} color={colors.primary} />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-subcategory-${item.id}`}
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ? (
                  SHELF_PRICE_BOARD_ENABLED && listed.length ? (
                    boardsFor(listed).map(([groupName, groupItems]) => (
                      <ShelfPriceBoard
                        key={groupName}
                        title={groupName}
                        products={groupItems}
                        onSaved={props.onChanged}
                      />
                    ))
                  ) : (
                    <ProductPeekList products={listed} emptyText={`No products in ${item.name}.`} />
                  )
                ) : null}
              </div>
            );
          })
        ) : (
          <p style={emptyStyle}>No subcategories match your search.</p>
        )}
      </div>
      {props.onOpenBatchImport ? (
        <Button
          testID="nav-batch-product-import"
          title="Import products (batch sheet)"
          icon="cloud-upload-outline"
          onPress={props.onOpenBatchImport}
          size="sm"
          fullWidth
        />
      ) : null}
      <AppModal
        testID="subcategory-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit subcategory" : "New subcategory"}
      >
        <Input testID="subcategory-name-input" label="Subcategory name" value={name} onChangeText={setName} />
        <label style={fieldStyle}>
          <span style={labelStyle}>Parent category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.currentTarget.value)}
            style={selectStyle}
          >
            {props.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Button title="Save" loading={saving} fullWidth onPress={() => void save()} />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title="Delete subcategory"
        message={`Remove ${deleteTarget?.name || "subcategory"} and its products.`}
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function csvCell(value: string) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  justifyContent: "flex-end",
  marginBottom: spacing.sm,
};

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  background: "transparent",
  cursor: "pointer",
  padding: 4,
};

const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
  overflowX: "auto",
  marginBottom: spacing.sm,
};

const listStyle: React.CSSProperties = {
  maxHeight: 360,
  overflowY: "auto",
  display: "grid",
  gap: spacing.sm,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.sm,
  background: colors.surface,
};

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: spacing.sm };
const nameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, fontSize: 15 };
const parentStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12 };
const emptyStyle: React.CSSProperties = { color: colors.textSecondary, textAlign: "center" };

const fieldStyle: React.CSSProperties = { display: "grid", gap: 4, marginBottom: spacing.md };
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  color: colors.textMuted,
};
const selectStyle: React.CSSProperties = {
  height: 40,
  borderRadius: radii.sm,
  border: `1px solid ${colors.borderStrong}`,
  padding: "0 10px",
};
