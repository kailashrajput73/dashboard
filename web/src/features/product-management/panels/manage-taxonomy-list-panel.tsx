import { useMemo, useState } from "react";
import type { Brand, CatalogItem, Category } from "../../../api/endpoints";
import {
  createBrand,
  createCategory,
  deleteBrandCascade,
  deleteCategoryCascade,
  updateBrand,
  updateCategory,
} from "../../../api/endpoints";
import { ApiError } from "../../../api/client";
import { CoverImageField } from "../../../components/CoverImageField";
import { Icon } from "../../../components/Icon";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../../../components/LinkedProducts";
import { PasscodeConfirmModal } from "../../../components/PasscodeConfirmModal";
import { RemoteImage } from "../../../components/RemoteImage";
import { AppModal, Button, Chip, Input } from "../../../components/UI";
import { colors, font, radii, spacing } from "../../../theme";

type Kind = "category" | "brand";

type Props = {
  kind: Kind;
  categories: Category[];
  brands: Brand[];
  products: CatalogItem[];
  onChanged: () => void;
  onError: (message: string) => void;
};

export function ManageTaxonomyListPanel(props: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Category | Brand | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = props.kind === "category" ? props.categories : props.brands;

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
        const matchesStatus =
          status === "all" || (status === "active" ? item.isActive : !item.isActive);
        return matchesQuery && matchesStatus;
      }),
    [items, query, status],
  );

  function productsFor(item: Category | Brand) {
    const key = item.name.toLowerCase();
    if (props.kind === "category") {
      return props.products.filter((p) => (p.category || "").toLowerCase() === key);
    }
    return props.products.filter((p) => (p.brand || "").toLowerCase() === key);
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setImageUrl(undefined);
  }

  function openEdit(item: Category | Brand) {
    setEditor(item);
    setName(item.name);
    setImageUrl(
      props.kind === "category"
        ? (item as Category).imageUrl || undefined
        : (item as Brand).logoUrl || undefined,
    );
  }

  async function save() {
    if (!name.trim()) {
      props.onError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (props.kind === "category") {
        if (editor) {
          await updateCategory((editor as Category).id, {
            name: name.trim(),
            isActive: (editor as Category).isActive,
            imageUrl: imageUrl || null,
          });
        } else {
          await createCategory(name.trim(), imageUrl);
        }
      } else if (editor) {
        await updateBrand((editor as Brand).id, {
          name: name.trim(),
          isActive: (editor as Brand).isActive,
          logoUrl: imageUrl || null,
        });
      } else {
        await createBrand(name.trim(), imageUrl);
      }
      setEditor(undefined);
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Category | Brand) {
    try {
      if (props.kind === "category") {
        await updateCategory(item.id, {
          name: item.name,
          isActive: !item.isActive,
          imageUrl: (item as Category).imageUrl,
        });
      } else {
        await updateBrand(item.id, {
          name: item.name,
          isActive: !item.isActive,
          logoUrl: (item as Brand).logoUrl,
        });
      }
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not update status");
    }
  }

  async function confirmDelete(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result =
        props.kind === "category"
          ? await deleteCategoryCascade(deleteTarget.id, credentials)
          : await deleteBrandCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      props.onChanged();
      props.onError(`Deleted ${deleteTarget.name} and ${result.productsRemoved} product(s).`);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  const testPrefix = props.kind === "category" ? "category" : "brand";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: spacing.sm }}>
        <Button testID={`open-add-${testPrefix}`} title="Add new" size="sm" onPress={openCreate} />
      </div>
      <Input
        testID={`${testPrefix}-search`}
        value={query}
        onChangeText={setQuery}
        placeholder={`Search ${props.kind === "category" ? "categories" : "brands"}`}
        style={{ marginBottom: spacing.sm }}
      />
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.sm, flexWrap: "wrap" }}>
        {(["all", "active", "inactive"] as const).map((item) => (
          <Chip
            key={item}
            label={item === "all" ? "All" : item === "active" ? "Active" : "Inactive"}
            selected={status === item}
            onPress={() => setStatus(item)}
            testID={`${testPrefix}-filter-${item}`}
          />
        ))}
      </div>
      <div style={listStyle}>
        {filtered.length ? (
          filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            const imageUri =
              props.kind === "category"
                ? (item as Category).imageUrl
                : (item as Brand).logoUrl;
            return (
              <div key={item.id} data-testid={`${testPrefix}-row-${item.id}`} style={cardStyle}>
                <div style={rowStyle}>
                  <button
                    type="button"
                    data-testid={`photo-${testPrefix}-${item.id}`}
                    aria-label={`Edit ${item.name} photo`}
                    onClick={() => openEdit(item)}
                    style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
                  >
                    <RemoteImage uri={imageUri} style={thumbStyle} placeholderSize={16} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nameStyle}>{item.name}</div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`${testPrefix}-products-${item.id}`}
                    />
                  </div>
                  <span style={statusBadgeStyle(item.isActive)}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    data-testid={`edit-${testPrefix}-${item.id}`}
                    aria-label={`Edit ${item.name}`}
                    onClick={() => openEdit(item)}
                    style={iconBtn}
                  >
                    <Icon name="create-outline" size={19} color={colors.primary} />
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-${testPrefix}-${item.id}`}
                    aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`}
                    onClick={() => void toggle(item)}
                    style={iconBtn}
                  >
                    <Icon
                      name={item.isActive ? "pause-circle-outline" : "play-circle-outline"}
                      size={19}
                      color={item.isActive ? colors.error : colors.success}
                    />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-${testPrefix}-${item.id}`}
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconBtn}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList
                    products={listed}
                    emptyText={`No products in ${item.name}.`}
                  />
                ) : null}
              </div>
            );
          })
        ) : (
          <p style={emptyStyle}>No matches.</p>
        )}
      </div>
      <AppModal
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? `Edit ${testPrefix}` : `New ${testPrefix}`}
      >
        <Input testID={`${testPrefix}-name-input`} label="Name" value={name} onChangeText={setName} />
        <CoverImageField
          label={props.kind === "brand" ? "Logo" : "Photo"}
          uri={imageUrl}
          onChange={setImageUrl}
          onError={props.onError}
          testID={`${testPrefix}-cover`}
        />
        <div style={{ height: spacing.md }} />
        <Button title="Save" loading={saving} fullWidth onPress={() => void save()} />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || testPrefix}`}
        message="Cascade delete with passcode."
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function statusBadgeStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: radii.pill,
    color: active ? colors.success : colors.textMuted,
    backgroundColor: active ? colors.successBg : colors.border,
  };
}

const listStyle: React.CSSProperties = {
  maxHeight: 420,
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

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
};

const thumbStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 10 };
const nameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, fontSize: 15 };
const iconBtn: React.CSSProperties = { border: 0, background: "transparent", cursor: "pointer", padding: 4 };
const emptyStyle: React.CSSProperties = { color: colors.textSecondary, textAlign: "center" };
