import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  fetchElectricalImagesFilterOptions,
  importElectricalFamilyImage,
  type SheetValidationError,
} from "../../api/endpoints";
import { AppModal, Button, Card } from "../../components/UI";
import { colors, font, spacing } from "../../theme";
import { SheetValidationPanel } from "./SheetValidationPanel";

type Props = {
  embedded?: boolean;
  sectionTitle?: string;
  sectionId?: string;
  onImported?: () => void;
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
};

export function ElectricalFamilyImageFill(props: Props) {
  const [subcategory, setSubcategory] = useState("");
  const [colours, setColours] = useState("");
  const [compound, setCompound] = useState("");
  const [brand, setBrand] = useState("");
  const [productFamily, setProductFamily] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colourOptions, setColourOptions] = useState<string[]>([]);
  const [compoundOptions, setCompoundOptions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [productFamilies, setProductFamilies] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<SheetValidationError[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await fetchElectricalImagesFilterOptions({
        subcategory: subcategory.trim() || undefined,
        colours: colours.trim() || undefined,
        compound: compound.trim() || undefined,
        brand: brand.trim() || undefined,
      });
      setSubcategories(data.subcategories ?? []);
      setColourOptions(data.colours ?? []);
      setCompoundOptions(data.compounds ?? []);
      setBrands(data.brands ?? []);
      setProductFamilies(data.productFamilies ?? []);
    } catch {
      setSubcategories([]);
      setColourOptions([]);
      setCompoundOptions([]);
      setBrands([]);
      setProductFamilies([]);
    } finally {
      setOptionsLoading(false);
    }
  }, [subcategory, colours, compound, brand]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    setColours("");
    setCompound("");
    setBrand("");
    setProductFamily("");
  }, [subcategory]);

  useEffect(() => {
    setCompound("");
    setBrand("");
    setProductFamily("");
  }, [colours]);

  useEffect(() => {
    setBrand("");
    setProductFamily("");
  }, [compound]);

  useEffect(() => {
    setProductFamily("");
  }, [brand]);

  function openModal() {
    setErrors([]);
    setResult(null);
    if (!subcategory.trim()) {
      setErrors([{ row: null, column: "subcategory", message: "Choose a sub-category first." }]);
      return;
    }
    if (!colours.trim() || !compound.trim() || !brand.trim() || !productFamily.trim()) {
      setErrors([
        {
          row: null,
          column: null,
          message: "Select sub-category, colours, compound, brand, and product family.",
        },
      ]);
      return;
    }
    setModalOpen(true);
  }

  async function saveImage() {
    setSaving(true);
    setErrors([]);
    try {
      const response = await importElectricalFamilyImage({
        subcategory: subcategory.trim(),
        colours: colours.trim(),
        compound: compound.trim(),
        brand: brand.trim(),
        productFamily: productFamily.trim(),
        imageUrl: imageUrl.trim(),
      });
      if (response.errors?.length) {
        setErrors(response.errors);
        return;
      }
      setModalOpen(false);
      setImageUrl("");
      setResult(`Updated family image (${response.updated ?? 1} family).`);
      props.onImported?.();
    } catch (cause: unknown) {
      const message = cause instanceof ApiError ? cause.message : "Could not save image link.";
      setErrors([{ row: null, column: "image_url", message }]);
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <>
      <p style={{ ...font.caption, color: colors.textMuted, margin: `0 0 ${spacing.sm}px`, lineHeight: 1.45 }}>
        One image per family (colour + compound + conductor). All SKU sizes under that family share this URL.
      </p>
      <div
        style={{
          display: "grid",
          gap: spacing.sm,
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Sub-category</span>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.currentTarget.value)}
            data-testid="electrical-image-subcategory"
            style={selectStyle}
            disabled={optionsLoading}
          >
            <option value="">Select…</option>
            {subcategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Colours</span>
          <select
            value={colours}
            onChange={(e) => setColours(e.currentTarget.value)}
            data-testid="electrical-image-colours"
            style={selectStyle}
            disabled={!subcategory.trim() || optionsLoading}
          >
            <option value="">Select…</option>
            {colourOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Compound</span>
          <select
            value={compound}
            onChange={(e) => setCompound(e.currentTarget.value)}
            data-testid="electrical-image-compound"
            style={selectStyle}
            disabled={!colours.trim() || optionsLoading}
          >
            <option value="">Select…</option>
            {compoundOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Brand</span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.currentTarget.value)}
            data-testid="electrical-image-brand"
            style={selectStyle}
            disabled={!compound.trim() || optionsLoading}
          >
            <option value="">Select…</option>
            {brands.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>product_family</span>
          <select
            value={productFamily}
            onChange={(e) => setProductFamily(e.currentTarget.value)}
            data-testid="electrical-image-product-family"
            style={selectStyle}
            disabled={!brand.trim() || optionsLoading}
          >
            <option value="">Select…</option>
            {productFamilies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button
        testID="electrical-fill-image-link"
        title="Fill image link here"
        icon="create-outline"
        variant="secondary"
        size="sm"
        disabled={optionsLoading || !subcategory.trim()}
        onPress={openModal}
        style={{ marginTop: spacing.sm }}
      />
      {result ? (
        <p style={{ color: colors.success, fontSize: 13, marginTop: spacing.sm }}>{result}</p>
      ) : null}
      {errors.length && !modalOpen ? (
        <div style={{ marginTop: spacing.sm }}>
          <SheetValidationPanel checking={false} valid={false} errors={errors} rowCount={0} />
        </div>
      ) : null}
      <AppModal
        testID="electrical-image-link-modal"
        visible={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Set family image URL"
      >
        <p style={{ ...font.caption, color: colors.textSecondary, marginTop: 0 }}>
          {subcategory} · {colours} · {compound} · {brand} · {productFamily}
        </p>
        <label style={{ display: "grid", gap: 4, marginBottom: spacing.md }}>
          <span style={{ ...font.caption, color: colors.textMuted }}>Image URL (https)</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.currentTarget.value)}
            data-testid="electrical-image-url"
            style={selectStyle}
            placeholder="https://…"
          />
        </label>
        {errors.length ? (
          <SheetValidationPanel checking={false} valid={false} errors={errors} rowCount={1} />
        ) : null}
        <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.md }}>
          <Button title="Cancel" variant="ghost" size="sm" disabled={saving} onPress={() => setModalOpen(false)} />
          <Button
            testID="electrical-save-image-link"
            title="Save image"
            size="sm"
            loading={saving}
            onPress={() => void saveImage()}
          />
        </div>
      </AppModal>
    </>
  );

  if (props.embedded) {
    return (
      <section id={props.sectionId} style={{ marginTop: spacing.xl }}>
        <Card style={{ marginTop: spacing.md }}>
          {props.sectionTitle ? (
            <h3 style={{ ...font.title, margin: `0 0 ${spacing.sm}px`, fontSize: 16 }}>{props.sectionTitle}</h3>
          ) : null}
          {body}
        </Card>
      </section>
    );
  }

  return <Card>{body}</Card>;
}
