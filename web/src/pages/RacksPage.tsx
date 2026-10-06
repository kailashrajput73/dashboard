import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  assignRackSlot,
  createRack,
  deleteRack,
  listCatalog,
  listRacks,
  type CatalogItem,
  type Rack,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Icon } from "../components/Icon";
import { AppModal, Button, ErrorModal, Header, Input } from "../components/UI";
import { colors, font, radii, spacing } from "../theme";

export default function RacksPage() {
  const navigate = useNavigate();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<Rack | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [rows, setRows] = useState("3");
  const [columns, setColumns] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextRacks, nextProducts] = await Promise.all([
        listRacks(),
        listCatalog(),
      ]);
      setRacks(nextRacks || []);
      setProducts(nextProducts || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to load racks",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([listRacks(), listCatalog()])
      .then(([nextRacks, nextProducts]) => {
        if (!active) return;
        setRacks(nextRacks || []);
        setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError ? cause.message : "Failed to load racks",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveRack() {
    const rowCount = Number(rows);
    const columnCount = Number(columns);
    if (
      !name.trim() ||
      !Number.isInteger(rowCount) ||
      !Number.isInteger(columnCount) ||
      rowCount < 1 ||
      columnCount < 1
    ) {
      setError("Enter a rack name and valid row and column counts.");
      return;
    }
    setSaving(true);
    try {
      await createRack({
        name: name.trim(),
        rows: rowCount,
        columns: columnCount,
      });
      setCreateOpen(false);
      setName("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not create rack",
      );
    } finally {
      setSaving(false);
    }
  }

  async function assign() {
    if (!selected || !slot || !productId) return;
    setSaving(true);
    try {
      await assignRackSlot(selected.id, { productId, slotCode: slot });
      setSlot(null);
      setProductId("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not assign product",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRack(rack: Rack) {
    try {
      await deleteRack(rack.id);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Rack must be empty before deletion",
      );
    }
  }

  function openAssignment(rack: Rack, slotCode: string | null) {
    setSelected(rack);
    setSlot(slotCode);
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Rack Locations"
        subtitle={`${racks.length} rack${racks.length === 1 ? "" : "s"}`}
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            data-testid="open-add-rack"
            aria-label="Add rack"
            onClick={() => setCreateOpen(true)}
            style={iconActionStyle}
          >
            <Icon name="add-circle" size={26} color={colors.primary} />
          </button>
        }
      />
      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading racks" />
        </div>
      ) : racks.length ? (
        <div style={listStyle}>
          {racks.map((rack) => (
            <section
              key={rack.id}
              style={rackStyle}
              data-testid={`rack-row-${rack.id}`}
            >
              <div style={rackHeaderStyle}>
                <div style={mainStyle}>
                  <div style={nameStyle}>{rack.name}</div>
                  <div style={metaStyle}>
                    {rack.rows} rows x {rack.columns} columns
                  </div>
                </div>
                <button
                  type="button"
                  data-testid={`delete-rack-${rack.id}`}
                  aria-label={`Delete ${rack.name}`}
                  title="Delete rack"
                  onClick={() => void removeRack(rack)}
                  style={iconActionStyle}
                >
                  <Icon name="trash-outline" size={19} color={colors.error} />
                </button>
              </div>
              <div style={gridStyle}>
                {rack.slots.map((rackSlot) => (
                  <button
                    key={rackSlot.code}
                    type="button"
                    data-testid={`rack-slot-${rack.id}-${rackSlot.code}`}
                    aria-label={`${rackSlot.code}${rackSlot.productId ? ", occupied" : ", empty"}`}
                    title={rackSlot.code}
                    onClick={() => openAssignment(rack, rackSlot.code)}
                    style={slotStyle(!!rackSlot.productId)}
                  >
                    <span>{rackSlot.code}</span>
                    {rackSlot.productId ? (
                      <Icon name="cube" size={13} color={colors.primary} />
                    ) : null}
                  </button>
                ))}
              </div>
              <Button
                testID={`open-rack-${rack.id}`}
                title="Assign product"
                icon="cube-outline"
                size="sm"
                onPress={() =>
                  openAssignment(
                    rack,
                    rack.slots.find((rackSlot) => !rackSlot.productId)?.code ||
                      rack.slots[0]?.code ||
                      null,
                  )
                }
              />
            </section>
          ))}
        </div>
      ) : (
        <div style={emptyStyle}>No racks configured.</div>
      )}

      <AppModal
        testID="rack-create-modal"
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New rack"
      >
        <Input
          testID="rack-name-input"
          label="Rack name"
          value={name}
          onChangeText={setName}
          placeholder="Warehouse A"
        />
        <Input
          testID="rack-rows-input"
          label="Rows"
          value={rows}
          onChangeText={setRows}
          keyboardType="numeric"
        />
        <Input
          testID="rack-columns-input"
          label="Columns"
          value={columns}
          onChangeText={setColumns}
          keyboardType="numeric"
        />
        <Button
          testID="save-rack"
          title="Create rack"
          onPress={() => void saveRack()}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <AppModal
        testID="rack-assignment-modal"
        visible={!!selected && !!slot}
        onClose={() => {
          setSelected(null);
          setSlot(null);
        }}
        title={`${selected?.name} / ${slot || ""}`}
      >
        <p style={hintStyle}>Select a product for this storage location.</p>
        <div style={productListStyle}>
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              data-testid={`assign-product-${product.id}`}
              aria-pressed={productId === product.id}
              onClick={() => setProductId(product.id)}
              style={productStyle(productId === product.id)}
            >
              <span style={mainStyle}>
                <span style={productNameStyle}>{product.name}</span>
                <span style={metaStyle}>
                  {product.productCode || "Legacy product"}
                </span>
              </span>
            </button>
          ))}
        </div>
        <Button
          testID="assign-rack-product"
          title="Assign to slot"
          onPress={() => void assign()}
          loading={saving}
          disabled={!productId}
          fullWidth
        />
      </AppModal>
      <ErrorModal
        visible={!!error}
        message={error || ""}
        onClose={() => setError(null)}
      />
    </main>
  );
}

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  padding: 4,
  border: 0,
  borderRadius: radii.sm,
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: spacing.xl,
};

const listStyle: React.CSSProperties = {
  padding: spacing.lg,
};

const rackStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.md,
  marginBottom: spacing.md,
};

const rackHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  marginBottom: spacing.md,
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const nameStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
  overflowWrap: "anywhere",
};

const metaStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  marginTop: 3,
};

const gridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  marginBottom: spacing.md,
};

function slotStyle(occupied: boolean): React.CSSProperties {
  return {
    width: 48,
    height: 44,
    boxSizing: "border-box",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    border: `1px solid ${occupied ? colors.primary : colors.borderStrong}`,
    borderRadius: radii.sm,
    backgroundColor: occupied ? colors.primaryLight : colors.bg,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  };
}

const emptyStyle: React.CSSProperties = {
  padding: spacing.xl,
  color: colors.textSecondary,
  textAlign: "center",
};

const hintStyle: React.CSSProperties = {
  color: colors.textSecondary,
  margin: `0 0 ${spacing.md}px`,
};

const productListStyle: React.CSSProperties = {
  maxHeight: "45vh",
  overflowY: "auto",
  marginBottom: spacing.md,
};

function productStyle(selected: boolean): React.CSSProperties {
  return {
    display: "flex",
    width: "100%",
    alignItems: "center",
    padding: spacing.sm,
    border: 0,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: selected ? colors.primaryLight : "transparent",
    textAlign: "left",
    cursor: "pointer",
  };
}

const productNameStyle: React.CSSProperties = {
  display: "block",
  color: colors.textPrimary,
  fontWeight: 600,
  overflowWrap: "anywhere",
};