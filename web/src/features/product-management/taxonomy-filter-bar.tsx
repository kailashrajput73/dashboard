import { useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { Chip } from "../../components/UI";
import { colors, radii, spacing } from "../../theme";
import type { TaxonomyTabs } from "../catalog-taxonomy/settings";
import { TaxonomyManageModal, type TaxonomyDimension } from "./taxonomy-manage-modal";

export type ProductFilters = {
  category: string;
  subcategory: string;
  productType: string;
  productClass: string;
  brand: string;
  productGroup: string;
};

export const ALL_FILTER = "All";

type OptionSets = {
  categories: string[];
  subcategories: string[];
  productTypes: string[];
  productClasses: string[];
  brands: string[];
  productGroups: string[];
};

type Props = {
  tabs: TaxonomyTabs;
  filters: ProductFilters;
  options: OptionSets;
  onChange: (next: ProductFilters) => void;
  onRefresh: () => void;
  onOpenBatchImport: () => void;
};

type Segment = {
  key: TaxonomyDimension;
  label: string;
  value: string;
  options: string[];
  hidden?: boolean;
};

export function TaxonomyFilterBar(props: Props) {
  const [manageKind, setManageKind] = useState<TaxonomyDimension | null>(null);
  const [menuOpen, setMenuOpen] = useState<TaxonomyDimension | null>(null);

  const segments = useMemo((): Segment[] => {
    const list: Segment[] = [
      {
        key: "category",
        label: "Category",
        value: props.filters.category,
        options: props.options.categories,
      },
      {
        key: "subcategory",
        label: "Subcategory",
        value: props.filters.subcategory,
        options: props.options.subcategories,
      },
      {
        key: "productType",
        label: "Product type",
        value: props.filters.productType,
        options: props.options.productTypes,
        hidden: !props.tabs.showProductType,
      },
      {
        key: "productClass",
        label: "Product class",
        value: props.filters.productClass,
        options: props.options.productClasses,
        hidden: !props.tabs.showProductClass,
      },
      {
        key: "brand",
        label: "Brand",
        value: props.filters.brand,
        options: props.options.brands,
      },
      {
        key: "productGroup",
        label: "Product group",
        value: props.filters.productGroup,
        options: props.options.productGroups,
      },
    ];
    return list.filter((item) => !item.hidden);
  }, [props.filters, props.options, props.tabs]);

  const activeChips = useMemo(() => {
    return segments
      .filter((segment) => segment.value !== ALL_FILTER)
      .map((segment) => ({ key: segment.key, label: segment.label, value: segment.value }));
  }, [segments]);

  function setFilter(key: keyof ProductFilters, value: string) {
    const next = { ...props.filters, [key]: value };
    if (key === "category") {
      next.subcategory = ALL_FILTER;
    }
    if (key === "category" || key === "subcategory") {
      next.productType = ALL_FILTER;
      next.productClass = ALL_FILTER;
    }
    props.onChange(next);
  }

  function clearFilters() {
    props.onChange({
      category: ALL_FILTER,
      subcategory: ALL_FILTER,
      productType: ALL_FILTER,
      productClass: ALL_FILTER,
      brand: ALL_FILTER,
      productGroup: ALL_FILTER,
    });
  }

  return (
    <>
      <div className="admin-page-container" style={barWrapStyle}>
        <div style={barScrollStyle}>
          {segments.map((segment) => (
            <div key={segment.key} style={segmentStyle}>
              <span style={segmentLabelStyle}>{segment.label}</span>
              <div style={segmentControlsStyle}>
                <select
                  value={segment.value}
                  onChange={(event) => setFilter(segment.key, event.currentTarget.value)}
                  data-testid={`pm-filter-${segment.key}`}
                  style={selectStyle}
                  aria-label={`Filter by ${segment.label}`}
                >
                  {[ALL_FILTER, ...segment.options.filter((value) => value !== ALL_FILTER)].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    data-testid={`pm-manage-${segment.key}`}
                    aria-label={`Manage ${segment.label}`}
                    onClick={() => setMenuOpen(menuOpen === segment.key ? null : segment.key)}
                    style={plusButtonStyle}
                  >
                    <Icon name="add-circle" size={22} color={colors.primary} />
                  </button>
                  {menuOpen === segment.key ? (
                    <div style={menuStyle} role="menu">
                      <button
                        type="button"
                        style={menuItemStyle}
                        onClick={() => {
                          setMenuOpen(null);
                          setManageKind(segment.key);
                        }}
                      >
                        Add or manage…
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        {activeChips.length ? (
          <div style={chipsRowStyle}>
            {activeChips.map((chip) => (
              <Chip
                key={chip.key}
                label={`${chip.label}: ${chip.value}`}
                selected
                onPress={() => setFilter(chip.key, ALL_FILTER)}
                testID={`pm-chip-${chip.key}`}
              />
            ))}
            <button type="button" onClick={clearFilters} style={clearStyle} data-testid="pm-clear-filters">
              Clear all
            </button>
          </div>
        ) : null}
      </div>
      <TaxonomyManageModal
        dimension={manageKind}
        visible={!!manageKind}
        onClose={() => setManageKind(null)}
        onChanged={() => {
          props.onRefresh();
        }}
        onOpenBatchImport={props.onOpenBatchImport}
      />
    </>
  );
}

const barWrapStyle: React.CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  padding: `${spacing.sm}px ${spacing.lg}px`,
};

const barScrollStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.md,
  alignItems: "flex-end",
};

const segmentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 140,
  flex: "1 1 140px",
  maxWidth: 220,
};

const segmentLabelStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
};

const segmentControlsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 36,
  borderRadius: radii.sm,
  border: `1px solid ${colors.borderStrong}`,
  padding: "0 8px",
  fontSize: 13,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
};

const plusButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  background: "transparent",
  cursor: "pointer",
  padding: 2,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  zIndex: 20,
  marginTop: 4,
  minWidth: 160,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  padding: 4,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: 0,
  background: "transparent",
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: radii.sm,
  color: colors.textPrimary,
};

const chipsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  alignItems: "center",
  marginTop: spacing.sm,
};

const clearStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: colors.primary,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  padding: "4px 8px",
};
