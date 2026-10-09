import { useRef, useState, type ChangeEvent } from "react";
import {
  createCategory,
  createCatalogItem,
  listCategories,
  type Brand,
  type CatalogItem,
  type Category,
  type Subcategory,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Icon } from "../../components/Icon";
import { RemoteImage } from "../../components/RemoteImage";
import { AppModal, Button, Input } from "../../components/UI";
import { ProductQr } from "../../components/ProductQr";
import { colors, font, radii, spacing } from "../../theme";
import { parseSizeMm } from "../../utils/size";
import { sellingFromMrpDiscount } from "../../utils/pricing";
import { gstToPercent } from "../../utils/csv";

type CatalogWriteBody = Parameters<typeof createCatalogItem>[0];

export function CatalogProductEditor(props: {
  item: CatalogItem | null;
  categories: Category[];
  brands: Brand[];
  subcategories: Subcategory[];
  saving: boolean;
  onSave: (body: CatalogWriteBody) => void;
  onClose: () => void;
  onError: (message: string) => void;
  onCategoriesChanged: (categories: Category[]) => void;
}) {
  const item = props.item;
  const fileRef = useRef<HTMLInputElement>(null);
  const matchedSubcategory = item
    ? props.subcategories.find((sub) => sub.id === item.subcategoryId) ||
      props.subcategories.find(
        (sub) =>
          sub.name.toLowerCase() === (item.subcategory || "").toLowerCase() &&
          sub.category.toLowerCase() === (item.category || "").toLowerCase(),
      )
    : undefined;
  const [name, setName] = useState(item?.name || "");
  const [unit, setUnit] = useState(item?.unit || "");
  const [rate, setRate] = useState(item ? String(item.standardRate) : "");
  const [mrp, setMrp] = useState(item?.mrp == null ? "" : String(item.mrp));
  const [sellingPrice, setSellingPrice] = useState(
    item?.sellingPrice == null
      ? item
        ? String(item.standardRate)
        : ""
      : String(item.sellingPrice),
  );
  const [purchasePrice, setPurchasePrice] = useState(
    item?.purchasePrice == null ? "" : String(item.purchasePrice),
  );
  const [priceDiscount, setPriceDiscount] = useState(
    item?.discount == null ? "" : String(item.discount),
  );
  const [hsnCode, setHsnCode] = useState(item?.hsnCode || "");
  const [gstRate, setGstRate] = useState(item?.gstRate == null ? "" : String(gstToPercent(item.gstRate) ?? ""));
  const [stdPkg, setStdPkg] = useState(item?.stdPkg == null ? "" : String(item.stdPkg));
  const [mrpPkg, setMrpPkg] = useState(item?.mrpPkg == null ? "" : String(item.mrpPkg));
  const [stock, setStock] = useState(
    item?.stock == null ? (item ? "0" : "") : String(item.stock),
  );
  const [productCode, setProductCode] = useState(item?.productCode || "");
  const [size, setSize] = useState(
    item?.size || (item?.sizeMm == null ? "" : String(item.sizeMm)),
  );
  const [sizeInch, setSizeInch] = useState(item?.sizeInch || "");
  const [length, setLength] = useState(item?.length || "");
  const [category, setCategory] = useState(item?.category || props.categories[0]?.name || "");
  const [subcategoryId, setSubcategoryId] = useState(
    matchedSubcategory?.id || item?.subcategoryId || "",
  );
  const [subcategoryName, setSubcategoryName] = useState(
    matchedSubcategory?.name || item?.subcategory || "",
  );
  const [brandId, setBrandId] = useState(
    item?.brandId || props.brands.find((brand) => brand.isActive)?.id || "",
  );
  const [aliases, setAliases] = useState((item?.aliases || []).join(", "));
  const [nameHi, setNameHi] = useState(item?.multilingualNames?.hi || "");
  const [nameGu, setNameGu] = useState(item?.multilingualNames?.gu || "");
  const [sequence, setSequence] = useState(String(item?.displaySequence || 0));
  const [rol, setRol] = useState(String(item?.reorderLevel || 0));
  const [discount, setDiscount] = useState(String(item?.regularDiscount || 0));
  const [imageUrl, setImageUrl] = useState<string | undefined>(item?.imageUrl);
  const [imageName, setImageName] = useState<string | undefined>(item?.imageName);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [subcategoryPickerOpen, setSubcategoryPickerOpen] = useState(false);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  function categorySubcategories(categoryName: string) {
    const parent = props.categories.find((entry) => entry.name === categoryName);
    return props.subcategories.filter((sub) => {
      if (parent && sub.categoryId === parent.id) return true;
      return sub.category.toLowerCase() === categoryName.trim().toLowerCase();
    });
  }

  function applyCategory(categoryName: string) {
    setCategory(categoryName);
    const allowed = categorySubcategories(categoryName);
    if (!allowed.some((sub) => sub.id === subcategoryId)) {
      setSubcategoryId("");
      setSubcategoryName("");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      setCategory(created.name);
      setSubcategoryId("");
      setSubcategoryName("");
      props.onCategoriesChanged(await listCategories());
      setCategoryPickerOpen(false);
    } catch (cause) {
      props.onError(
        cause instanceof ApiError ? cause.message : "Could not create category",
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  function setProductImageUrl(value: string) {
    setImageUrl(value.trim() || undefined);
    if (!value.trim()) setImageName(undefined);
  }

  function onImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => props.onError("Could not read selected product image");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        props.onError("Could not read selected product image");
        return;
      }
      setImageUrl(reader.result);
      setImageName(file.name || "product-image");
    };
    reader.readAsDataURL(file);
  }

  function save() {
    if (!name.trim() || !unit.trim() || !category.trim() || !brandId) {
      props.onError("Please fill name, unit, category, and brand.");
      return;
    }
    const standardRate = parseFloat(rate.replace(/,/g, ""));
    if (Number.isNaN(standardRate)) {
      props.onError("Please enter a valid rate.");
      return;
    }
    const selectedSubcategory = props.subcategories.find(
      (sub) => sub.id === subcategoryId,
    );
    const multilingualNames: Record<string, string> = {};
        const optionalNumber = (value: string) => {
          if (!value.trim()) return undefined;
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : undefined;
        };
    if (nameHi.trim()) multilingualNames.hi = nameHi.trim();
    if (nameGu.trim()) multilingualNames.gu = nameGu.trim();
    props.onSave({
      name: name.trim(),
      category: category.trim(),
      subcategory: selectedSubcategory?.name || subcategoryName.trim(),
      subcategoryId: selectedSubcategory?.id || subcategoryId,
      unit: unit.trim(),
      standardRate,
      productCode: productCode.trim() || undefined,
      size: size.trim() || undefined,
      sizeMm: size.trim() ? parseSizeMm(size) : undefined,
      sizeInch: sizeInch.trim() || undefined,
      length: length.trim() || undefined,
      mrp: mrp.trim() ? Number(mrp) : undefined,
      sellingPrice: sellingPrice.trim() ? Number(sellingPrice) : standardRate,
      purchasePrice: purchasePrice.trim() ? Number(purchasePrice) : undefined,
      discount: priceDiscount.trim() ? Number(priceDiscount) : undefined,
      hsnCode: hsnCode.trim() || undefined,
      gstRate: gstToPercent(optionalNumber(gstRate)),
      stdPkg: optionalNumber(stdPkg),
      mrpPkg: optionalNumber(mrpPkg),
      stock: stock.trim() ? Number(stock) : 0,
      brandId,
      aliases: aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
      multilingualNames,
      displaySequence: Number(sequence) || 0,
      reorderLevel: Number(rol) || 0,
      regularDiscount: Number(discount) || 0,
      imageUrl,
      imageName,
    });
  }

  return (
    <>
      <AppModal
        testID="add-item-modal"
        visible
        onClose={props.onClose}
        title={item ? "Edit product" : "Add product"}
        wide
      >
        <Input
          testID="item-name-input"
          label="Item Name"
          placeholder="e.g. Cement Bag 50kg"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <div style={formRowStyle}>
          <Input
            testID="item-unit-input"
            label="Unit"
            placeholder="e.g. bag, kg, hr, nos"
            value={unit}
            onChangeText={setUnit}
            style={formColStyle}
          />
          <Input
            testID="item-product-code-input"
            label="Product code (optional)"
            value={productCode}
            onChangeText={setProductCode}
            autoCapitalize="characters"
            style={formColStyle}
          />
        </div>
        <ProductQr value={productCode} />
        <div style={formRowStyle}>
          <Input testID="item-size-input" label="Size mm" value={size} onChangeText={setSize} placeholder="e.g. 5mm" style={formColStyle} />
          <Input testID="item-size-inch-input" label="Size inch" value={sizeInch} onChangeText={setSizeInch} placeholder='e.g. 1.2"' style={formColStyle} />
          <Input testID="item-length-input" label="Length" value={length} onChangeText={setLength} placeholder="e.g. 3m" style={formColStyle} />
        </div>
        <div style={sectionTitleStyle}>Pricing and stock</div>
        <div style={sectionHintStyle}>Change these anytime. Discount % recalculates selling price from MRP.</div>
        <div style={formRowStyle}>
          <Input
            testID="item-mrp-input"
            label="MRP"
            value={mrp}
            onChangeText={(value) => {
              setMrp(value);
              const parsedMrp = parseFloat(value);
              const parsedDiscount = parseFloat(priceDiscount);
              if (!Number.isNaN(parsedMrp) && !Number.isNaN(parsedDiscount)) {
                const next = String(sellingFromMrpDiscount(parsedMrp, parsedDiscount));
                setSellingPrice(next);
                setRate(next);
              }
            }}
            keyboardType="decimal-pad"
            style={formColStyle}
          />
          <Input
            testID="item-price-discount-input"
            label="Price discount (%)"
            value={priceDiscount}
            onChangeText={(value) => {
              setPriceDiscount(value);
              const parsedMrp = parseFloat(mrp);
              const parsedDiscount = parseFloat(value);
              if (!Number.isNaN(parsedMrp) && !Number.isNaN(parsedDiscount)) {
                const next = String(sellingFromMrpDiscount(parsedMrp, parsedDiscount));
                setSellingPrice(next);
                setRate(next);
              }
            }}
            keyboardType="decimal-pad"
            style={formColStyle}
          />
        </div>
        <div style={formRowStyle}>
          <Input
            testID="item-selling-price-input"
            label="Selling price"
            value={sellingPrice}
            onChangeText={(value) => {
              setSellingPrice(value);
              setRate(value);
            }}
            keyboardType="decimal-pad"
            style={formColStyle}
          />
          <Input testID="item-purchase-price-input" label="Purchase price" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" style={formColStyle} />
        </div>
        <div style={sectionTitleStyle}>Billing and pack details</div>
        <div style={formRowStyle}>
          <Input testID="item-hsn-code-input" label="HSN Code" value={hsnCode} onChangeText={setHsnCode} style={formColStyle} />
          <Input testID="item-gst-rate-input" label="GST (%)" value={gstRate} onChangeText={setGstRate} keyboardType="decimal-pad" style={formColStyle} />
        </div>
        <div style={formRowStyle}>
          <Input testID="item-pack-size-input" label="Pack Size" value={stdPkg} onChangeText={setStdPkg} keyboardType="decimal-pad" style={formColStyle} />
          <Input testID="item-mrp-pack-input" label="MRP per pack" value={mrpPkg} onChangeText={setMrpPkg} keyboardType="decimal-pad" style={formColStyle} />
        </div>
        <div style={formRowStyle}>
          <Input testID="item-stock-input" label="Stock qty" value={stock} onChangeText={setStock} keyboardType="decimal-pad" style={formColStyle} />
          <Input testID="item-rate-input" label="Standard rate (same as selling)" placeholder="e.g. 380" value={rate} onChangeText={setRate} keyboardType="decimal-pad" style={formColStyle} />
        </div>
        <div style={inputLabelStyle}>Product image</div>
        {imageUrl ? (
          <RemoteImage uri={imageUrl} style={imagePreviewStyle} placeholderSize={28} />
        ) : (
          <div style={imageEmptyStyle}>
            <Icon name="image-outline" size={28} color={colors.textMuted} />
            <span style={imageEmptyTextStyle}>No image selected</span>
          </div>
        )}
        <div style={imageActionsStyle}>
          <Button
            testID="pick-product-image"
            title={imageUrl ? "Replace image" : "Upload image"}
            icon="image-outline"
            onPress={() => fileRef.current?.click()}
            size="sm"
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={onImageFile} style={{ display: "none" }} />
          {imageUrl ? (
            <Button testID="remove-product-image" title="Remove" variant="ghost" onPress={() => { setImageUrl(undefined); setImageName(undefined); }} size="sm" />
          ) : null}
        </div>
        <Input
          testID="item-image-url-input"
          label="Or paste image URL"
          placeholder="https://example.com/product.jpg"
          value={imageUrl && !imageUrl.startsWith("data:") ? imageUrl : ""}
          onChangeText={setProductImageUrl}
          autoCapitalize="none"
        />
        <PickerField label="Category" value={category || "Select a category"} testID="item-category-picker" onPress={() => setCategoryPickerOpen(true)} />
        <PickerField label="Subcategory" value={subcategoryName || (category ? "Select a subcategory" : "Select a category first")} testID="item-subcategory-picker" onPress={() => setSubcategoryPickerOpen(true)} />
        <div style={{ height: spacing.md }} />
        <Input testID="item-aliases-input" label="Aliases (comma separated)" value={aliases} onChangeText={setAliases} placeholder="Local or alternate names" />
        <div style={formRowStyle}>
          <Input testID="item-name-hi-input" label="Hindi (hi)" value={nameHi} onChangeText={setNameHi} placeholder="Hindi name" style={formColStyle} />
          <Input testID="item-name-gu-input" label="Gujarati (gu)" value={nameGu} onChangeText={setNameGu} placeholder="Gujarati name" style={formColStyle} />
        </div>
        <Input testID="item-sequence-input" label="Display sequence" value={sequence} onChangeText={setSequence} keyboardType="numeric" />
        <Input testID="item-rol-input" label="Reorder level (ROL)" value={rol} onChangeText={setRol} keyboardType="decimal-pad" />
        <Input testID="item-discount-input" label="Regular discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
        <PickerField label="Brand" value={props.brands.find((brand) => brand.id === brandId)?.name || "Select a brand"} testID="item-brand-picker" onPress={() => setBrandPickerOpen(true)} />
        <div style={{ height: spacing.md }} />
        <Button testID="save-item-btn" title={item ? "Save Changes" : "Add Item"} onPress={save} loading={props.saving} fullWidth />
      </AppModal>

      <AppModal testID="subcategory-picker-modal" visible={subcategoryPickerOpen} onClose={() => setSubcategoryPickerOpen(false)} title="Select subcategory">
        {categorySubcategories(category).length === 0 ? (
          <div style={filterHintStyle}>{category ? `No subcategories under ${category}.` : "Select a category first."}</div>
        ) : categorySubcategories(category).map((sub) => (
          <PickerOption key={sub.id} testID={`pick-sub-${sub.id}`} label={sub.name} selected={subcategoryId === sub.id} onClick={() => { setSubcategoryId(sub.id); setSubcategoryName(sub.name); setSubcategoryPickerOpen(false); }} />
        ))}
      </AppModal>

      <AppModal testID="brand-picker-modal" visible={brandPickerOpen} onClose={() => setBrandPickerOpen(false)} title="Select brand">
        {props.brands.filter((brand) => brand.isActive).map((brand) => (
          <PickerOption key={brand.id} testID={`pick-brand-${brand.id}`} label={brand.name} selected={brandId === brand.id} onClick={() => { setBrandId(brand.id); setBrandPickerOpen(false); }} />
        ))}
      </AppModal>

      <AppModal testID="category-picker-modal" visible={categoryPickerOpen} onClose={() => setCategoryPickerOpen(false)} title="Select category">
        {props.categories.map((entry) => (
          <PickerOption key={entry.id} testID={`pick-cat-${entry.name}`} label={entry.name} selected={category === entry.name} onClick={() => { applyCategory(entry.name); setCategoryPickerOpen(false); }} />
        ))}
        <div style={categoryDividerStyle} />
        <div style={inputLabelStyle}>Create New Category</div>
        <div style={newCategoryRowStyle}>
          <Input testID="new-category-input" value={newCategoryName} onChangeText={setNewCategoryName} placeholder="New category name" style={{ flex: 1, marginBottom: 0 }} />
          <Button testID="new-category-add" title="Add" onPress={() => void addCategory()} loading={creatingCategory} size="sm" />
        </div>
      </AppModal>
    </>
  );
}

function PickerField(props: { label: string; value: string; testID: string; onPress: () => void }) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <div style={inputLabelStyle}>{props.label}</div>
      <button type="button" data-testid={props.testID} onClick={props.onPress} style={selectBoxStyle}>
        <span>{props.value}</span>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </button>
    </div>
  );
}

function PickerOption(props: { testID: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" data-testid={props.testID} onClick={props.onClick} style={optionStyle}>
      <span>{props.label}</span>
      {props.selected ? <Icon name="checkmark" size={18} color={colors.primary} /> : null}
    </button>
  );
}

const formRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.md };
const formColStyle: React.CSSProperties = { flex: "1 1 220px", minWidth: 180 };
const sectionTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, marginTop: spacing.md, marginBottom: 4 };
const sectionHintStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm };
const inputLabelStyle: React.CSSProperties = { ...font.caption, color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm, textTransform: "uppercase" };
const imagePreviewStyle: React.CSSProperties = { width: 120, height: 120, borderRadius: radii.sm, backgroundColor: colors.bg, marginBottom: spacing.sm };
const imageEmptyStyle: React.CSSProperties = { width: 120, height: 120, border: `1px solid ${colors.border}`, borderRadius: radii.sm, backgroundColor: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", marginBottom: spacing.sm };
const imageEmptyTextStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 11, marginTop: 5 };
const imageActionsStyle: React.CSSProperties = { display: "flex", gap: spacing.sm, marginBottom: spacing.md };
const selectBoxStyle: React.CSSProperties = { boxSizing: "border-box", width: "100%", height: 46, borderRadius: 8, border: `1px solid ${colors.borderStrong}`, padding: `0 ${spacing.md}px`, backgroundColor: colors.surface, color: colors.textPrimary, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" };
const optionStyle: React.CSSProperties = { boxSizing: "border-box", width: "100%", height: 48, border: 0, borderBottom: `1px solid ${colors.border}`, backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", color: colors.textPrimary, font: "inherit", cursor: "pointer" };
const categoryDividerStyle: React.CSSProperties = { height: spacing.sm };
const newCategoryRowStyle: React.CSSProperties = { display: "flex", gap: spacing.sm, alignItems: "center" };
const filterHintStyle: React.CSSProperties = { color: colors.textSecondary, lineHeight: "20px", marginBottom: spacing.md };