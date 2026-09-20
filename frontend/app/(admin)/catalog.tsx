import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Pressable,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { Header, Chip, Input, Button, AppModal, ErrorModal, EmptyState } from "@/src/components/UI";
import { PasscodeConfirmModal } from "@/src/components/PasscodeConfirmModal";
import { colors, spacing, radii, shadow, font, isWeb, pointer } from "@/src/theme";
import { RemoteImage } from "@/src/components/RemoteImage";
import {
  createCatalogItem,
  createCategory,
  deleteCatalogItem,
  deleteCatalogItemSecured,
  listCatalog,
  listCategories,
  listBrands,
  updateCatalogItem,
  updateCatalogPricing,
  applyCatalogPricingBulk,
  type CatalogItem,
  type Category,
  type Brand,
} from "@/src/api/endpoints";
import { ApiError } from "@/src/api/client";
import { formatMoney } from "@/src/utils/money";
import { sizeInchLabel, sizeLengthLabel, sizeMmLabel, parseSizeMm } from "@/src/utils/size";
import { inferProductClass } from "@/src/utils/csv";

export default function AdminCatalog() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftType, setDraftType] = useState("All");
  const [draftClass, setDraftClass] = useState("All");
  const [draftBrand, setDraftBrand] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);


function parseLanguageNames(value: string): Record<string, string> {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    const names: Record<string, string> = {};
    for (const [language, name] of Object.entries(parsed)) {
      if (typeof name === "string") names[language] = name;
    }
    return names;
  } catch {
    return {};
  }
}

async function assetToDataUrl(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("Could not read selected product image");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read selected product image"));
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read selected product image"));
          return;
        }
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${asset.mimeType || "image/jpeg"};base64,${base64}`;
}

  // Add / edit dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [actionSheet, setActionSheet] = useState<CatalogItem | null>(null);
  const [deletePasscodeOpen, setDeletePasscodeOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // form state
  const [fName, setFName] = useState("");
  const [fUnit, setFUnit] = useState("");
  const [fRate, setFRate] = useState("");
  const [fMrp, setFMrp] = useState("");
  const [fSellingPrice, setFSellingPrice] = useState("");
  const [fPurchasePrice, setFPurchasePrice] = useState("");
  const [fPriceDiscount, setFPriceDiscount] = useState("");
  const [fStock, setFStock] = useState("");
  const [fProductCode, setFProductCode] = useState("");
  const [fSize, setFSize] = useState("");
  const [fSizeInch, setFSizeInch] = useState("");
  const [fLength, setFLength] = useState("");
  const [fCategory, setFCategory] = useState<string>("");
  const [fBrandId, setFBrandId] = useState<string>("");
  const [fAliases, setFAliases] = useState("");
  const [fLanguages, setFLanguages] = useState("");
  const [fSequence, setFSequence] = useState("0");
  const [fRol, setFRol] = useState("0");
  const [fDiscount, setFDiscount] = useState("0");
  const [fImageUrl, setFImageUrl] = useState<string | undefined>();
  const [fImageName, setFImageName] = useState<string | undefined>();
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, b, i] = await Promise.all([listCategories(), listBrands(), listCatalog()]);
      setCats(c || []);
      setBrands(b || []);
      setItems(i || []);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Failed to load catalog");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openAdd() {
    setEditing(null);
    setFName("");
    setFUnit("");
    setFRate("");
     setFMrp(""); setFSellingPrice(""); setFPurchasePrice(""); setFPriceDiscount(""); setFStock(""); setFProductCode("");
    setFSize(""); setFSizeInch(""); setFLength("");
    setFCategory(cats[0]?.name || "");
    setFBrandId(brands.find((brand) => brand.isActive)?.id || "");
    setFAliases(""); setFLanguages(""); setFSequence("0"); setFRol("0"); setFDiscount("0");
    setFImageUrl(undefined); setFImageName(undefined);
    setAddOpen(true);
  }

  function openEdit(it: CatalogItem) {
    setEditing(it);
    setFName(it.name);
    setFUnit(it.unit);
    setFRate(String(it.standardRate));
     setFMrp(it.mrp == null ? "" : String(it.mrp));
     setFSellingPrice(it.sellingPrice == null ? String(it.standardRate) : String(it.sellingPrice));
     setFPurchasePrice(it.purchasePrice == null ? "" : String(it.purchasePrice));
     setFPriceDiscount(it.discount == null ? "" : String(it.discount));
     setFStock(it.stock == null ? "0" : String(it.stock));
     setFProductCode(it.productCode || "");
     setFSize(it.size || (it.sizeMm == null ? "" : String(it.sizeMm)));
     setFSizeInch(it.sizeInch || "");
     setFLength(it.length || "");
    setFCategory(it.category);
    setFBrandId(it.brandId || "");
    setFAliases((it.aliases || []).join(", ")); setFLanguages(JSON.stringify(it.multilingualNames || {}));
    setFSequence(String(it.displaySequence || 0)); setFRol(String(it.reorderLevel || 0)); setFDiscount(String(it.regularDiscount || 0));
    setFImageUrl(it.imageUrl); setFImageName(it.imageName);
    setActionSheet(null);
    setAddOpen(true);
  }

  async function saveItem() {
    if (!fName.trim() || !fUnit.trim() || !fCategory.trim() || !fBrandId) {
      setErr("Please fill name, unit, category, and brand.");
      return;
    }
    const rate = parseFloat(fRate.replace(/,/g, ""));
    if (Number.isNaN(rate)) {
      setErr("Please enter a valid rate.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: fName.trim(),
        category: fCategory.trim(),
        unit: fUnit.trim(),
        standardRate: rate,
        productCode: fProductCode.trim() || undefined,
        size: fSize.trim() || undefined,
        sizeMm: fSize.trim() ? parseSizeMm(fSize) : undefined,
        sizeInch: fSizeInch.trim() || undefined,
        length: fLength.trim() || undefined,
        mrp: fMrp.trim() ? Number(fMrp) : undefined,
        sellingPrice: fSellingPrice.trim() ? Number(fSellingPrice) : rate,
        purchasePrice: fPurchasePrice.trim() ? Number(fPurchasePrice) : undefined,
        discount: fPriceDiscount.trim() ? Number(fPriceDiscount) : undefined,
        stock: fStock.trim() ? Number(fStock) : 0,
        brandId: fBrandId,
        aliases: fAliases.split(",").map((alias) => alias.trim()).filter(Boolean),
        multilingualNames: parseLanguageNames(fLanguages),
        displaySequence: Number(fSequence) || 0,
        reorderLevel: Number(fRol) || 0,
        regularDiscount: Number(fDiscount) || 0,
        imageUrl: fImageUrl,
        imageName: fImageName,
      };
      if (editing) await updateCatalogItem(editing.id, body);
      else await createCatalogItem(body);
      setAddOpen(false);
      await load();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function pickProductImage() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/*"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setFImageUrl(await assetToDataUrl(asset));
      setFImageName(asset.name || "product-image");
    } catch (e: any) {
      setErr(e?.message || "Could not read product image");
    }

  }

  function setProductImageUrl(value: string) {
    setFImageUrl(value.trim() || undefined);
    if (!value.trim()) setFImageName(undefined);
  }

  async function submitNewCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const c = await createCategory(newCatName.trim());
      setNewCatName("");
      setFCategory(c.name);
      const next = await listCategories();
      setCats(next || []);
      setShowCatPicker(false);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Could not create category");
    } finally {
      setCreatingCat(false);
    }
  }

  async function applyListed(kind: "discount" | "stock") {
    if (listed.length === 0) return;
    const discount = parseFloat(bulkDiscount);
    const stock = parseFloat(bulkStock);
    if (kind === "discount" && Number.isNaN(discount)) {
      setErr("Enter a discount % to apply to the listed products.");
      return;
    }
    if (kind === "stock" && Number.isNaN(stock)) {
      setErr("Enter a stock quantity to apply to the listed products.");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await applyCatalogPricingBulk(
        listed,
        kind === "discount" ? { discount } : { stock },
      );
      await load();
      if (res.skipped) setErr(`Updated ${res.updated}, skipped ${res.skipped}.`);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Could not apply pricing");
    } finally {
      setBulkSaving(false);
    }
  }

  function requestDelete() {
    if (!actionSheet) return;
    setDeletePasscodeOpen(true);
  }

  async function confirmDeleteSecured(credentials: { contactNumber: string; passcode: string }) {
    if (!actionSheet) return;
    const id = actionSheet.id;
    setDeletingProduct(true);
    try {
      await deleteCatalogItemSecured(id, credentials);
      setDeletePasscodeOpen(false);
      setActionSheet(null);
      await load();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete item");
    } finally {
      setDeletingProduct(false);
    }
  }

  const chipCats = useMemo(() => ["All", ...cats.map((c) => c.name)], [cats]);
  const listed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCat !== "All" && (item.category || "") !== selectedCat) return false;
      if (selectedType !== "All" && (item.type || "").toLowerCase() !== selectedType.toLowerCase()) return false;
      const className = inferProductClass(item);
      if (selectedClass !== "All" && className.toLowerCase() !== selectedClass.toLowerCase()) return false;
      if (selectedBrand !== "All" && (item.brand || "").toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (!q) return true;
      return `${item.name} ${item.productCode || ""} ${item.brand || ""} ${(item.aliases || []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [items, search, selectedCat, selectedType, selectedClass, selectedBrand]);
  const typeChips = useMemo(() => {
    const pool = items.filter((item) => selectedCat === "All" || (item.category || "") === selectedCat);
    return ["All", ...[...new Set(pool.map((item) => (item.type || "").trim()).filter(Boolean))].sort()];
  }, [items, selectedCat]);
  const classChips = useMemo(() => {
    const typeFilter = filterOpen ? draftType : selectedType;
    const pool = items.filter((item) => {
      if (selectedCat !== "All" && (item.category || "") !== selectedCat) return false;
      if (typeFilter !== "All" && (item.type || "").toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
    return ["All", ...[...new Set(pool.map((item) => inferProductClass(item)).filter(Boolean))].sort()];
  }, [items, selectedCat, selectedType, filterOpen, draftType]);
  const brandChips = useMemo(() => {
    const typeFilter = filterOpen ? draftType : selectedType;
    const classFilter = filterOpen ? draftClass : selectedClass;
    const pool = items.filter((item) => {
      if (selectedCat !== "All" && (item.category || "") !== selectedCat) return false;
      if (typeFilter !== "All" && (item.type || "").toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (classFilter !== "All" && inferProductClass(item).toLowerCase() !== classFilter.toLowerCase()) return false;
      return true;
    });
    return ["All", ...[...new Set(pool.map((item) => (item.brand || "").trim()).filter(Boolean))].sort()];
  }, [items, selectedCat, selectedType, selectedClass, filterOpen, draftType, draftClass]);
  const extraFilterCount = [selectedType, selectedClass, selectedBrand].filter((value) => value !== "All").length;

  async function exportCatalogCsv() {
    const header = "productCode,name,category,type,subcategory,class,brand,unit,mrp,sellingPrice,discount,stock,imageUrl";
    const cell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = listed.map((item) =>
      [
        item.productCode,
        item.name,
        item.category,
        item.type,
        item.subcategory,
        inferProductClass(item),
        item.brand,
        item.unit,
        item.mrp,
        item.sellingPrice ?? item.standardRate,
        item.discount,
        item.stock,
        item.imageUrl ? "(url)" : "",
      ].map(cell).join(","),
    );
    const csv = [header, ...rows].join("\n");
    try {
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch {
      setErr("Could not export catalog CSV.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Manage Catalog"
        subtitle={`${listed.length} of ${items.length} item${items.length === 1 ? "" : "s"} · edit MRP, discount, and stock without re-uploading`}
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable onPress={exportCatalogCsv} testID="export-catalog-csv" hitSlop={8} accessibilityRole="button" style={pointer}>
              <Ionicons name="download-outline" size={23} color={colors.primary} />
            </Pressable>
            <Pressable onPress={openAdd} testID="open-add-item" hitSlop={8} accessibilityRole="button" style={pointer}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.chipsWrap}>
        <Input testID="product-search" value={search} onChangeText={setSearch} placeholder="Search code, name, alias, or brand" style={styles.search} />
        <Text style={styles.categoryLabel}>Category</Text>
        <View style={styles.catRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={{ flex: 1 }}>
            {chipCats.map((c) => (
              <Chip
                key={`cat-${c}`}
                label={c}
                selected={selectedCat === c}
                onPress={() => { setSelectedCat(c); setSelectedType("All"); setSelectedClass("All"); setSelectedBrand("All"); }}
                testID={`admin-cat-${c}`}
              />
            ))}
          </ScrollView>
          <Pressable
            testID="open-catalog-filter"
            accessibilityRole="button"
            onPress={() => {
              setDraftType(selectedType);
              setDraftClass(selectedClass);
              setDraftBrand(selectedBrand);
              setFilterOpen(true);
            }}
            style={({ hovered, pressed }) => [
              styles.filterBtn,
              pointer,
              extraFilterCount > 0 && styles.filterBtnActive,
              (hovered || pressed) && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="options-outline" size={18} color={extraFilterCount > 0 ? "#FFFFFF" : colors.primary} />
            <Text style={[styles.filterBtnText, extraFilterCount > 0 && styles.filterBtnTextActive]}>
              Filter{extraFilterCount ? ` (${extraFilterCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : listed.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No items yet"
          subtitle="Add your first item or import a CSV file."
          cta={{ label: "Add Item", onPress: openAdd, testID: "empty-add-item" }}
        />
      ) : isWeb ? (
        <ScrollView
          contentContainerStyle={styles.tableWrap}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.tableHint}>
            Day-to-day work: change MRP, discount %, or stock on a row, then Save. Selling price updates from MRP and discount.
          </Text>
          <View style={styles.bulkBar}>
            <Text style={styles.bulkLabel}>Apply to {listed.length} listed product{listed.length === 1 ? "" : "s"}</Text>
            <TextInput
              value={bulkDiscount}
              onChangeText={setBulkDiscount}
              placeholder="Discount %"
              keyboardType="decimal-pad"
              style={styles.bulkInput}
              testID="bulk-discount-input"
            />
            <Button title="Apply discount" size="sm" onPress={() => applyListed("discount")} loading={bulkSaving} testID="bulk-discount-btn" />
            <TextInput
              value={bulkStock}
              onChangeText={setBulkStock}
              placeholder="Stock qty"
              keyboardType="decimal-pad"
              style={styles.bulkInput}
              testID="bulk-stock-input"
            />
            <Button title="Set stock" size="sm" onPress={() => applyListed("stock")} loading={bulkSaving} testID="bulk-stock-btn" />
          </View>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colProduct]}>Product</Text>
            <Text style={[styles.th, styles.colSize]}>cm / mm</Text>
            <Text style={[styles.th, styles.colSize]}>Inch</Text>
            <Text style={[styles.th, styles.colSize]}>Length</Text>
            <Text style={[styles.th, styles.colNum]}>MRP</Text>
            <Text style={[styles.th, styles.colNum]}>Discount %</Text>
            <Text style={[styles.th, styles.colNum, styles.colMetric]}>Selling</Text>
            <Text style={[styles.th, styles.colNum, styles.colMetric]}>Stock</Text>
            <Text style={[styles.th, styles.colActions]}> </Text>
          </View>
          {listed.map((item) => (
            <PricingRow
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDeleted={load}
              onError={setErr}
            />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={listed}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActionSheet(item)}
              style={styles.row}
              testID={`admin-item-${item.id}`}
            >
              <RemoteImage uri={item.imageUrl} style={styles.productThumb} placeholderSize={22} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta}>{item.productCode || "Legacy product"}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>{item.category}</Text>
                  </View>
                  <Text style={styles.rowMeta}>size {sizeMmLabel(item) || "—"}</Text>
                  <Text style={styles.rowMeta}>inch {sizeInchLabel(item) || "—"}</Text>
                  <Text style={styles.rowMeta}>len {sizeLengthLabel(item) || "—"}</Text>
                  <Text style={styles.rowMeta}>MRP ₹{formatMoney(item.mrp || item.standardRate)}</Text>
                  <Text style={styles.rowMeta}>Sell ₹{formatMoney(item.sellingPrice || item.standardRate)}</Text>
                  <Text style={styles.rowMeta}>Qty {item.stock ?? 0}</Text>
                </View>
              </View>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      <AppModal testID="catalog-filter-modal" visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter products">
        <Text style={styles.filterHint}>Pick product type, class, and brand, then Apply. Category stays on the main page.</Text>
        <Text style={styles.filterLabel}>Product type</Text>
        <View style={styles.filterChipWrap}>
          {typeChips.map((c) => (
            <Chip
              key={`type-${c}`}
              label={c}
              selected={draftType === c}
              onPress={() => { setDraftType(c); setDraftClass("All"); setDraftBrand("All"); }}
              testID={`admin-type-${c}`}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Product class</Text>
        <View style={styles.filterChipWrap}>
          {classChips.map((c) => (
            <Chip
              key={`class-${c}`}
              label={c}
              selected={draftClass === c}
              onPress={() => { setDraftClass(c); setDraftBrand("All"); }}
              testID={`admin-class-${c}`}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Brand</Text>
        <View style={styles.filterChipWrap}>
          {brandChips.map((c) => (
            <Chip
              key={`brand-${c}`}
              label={c}
              selected={draftBrand === c}
              onPress={() => setDraftBrand(c)}
              testID={`admin-brand-${c}`}
            />
          ))}
        </View>
        <View style={{ height: spacing.md }} />
        <Button
          testID="apply-catalog-filter"
          title="Apply filters"
          onPress={() => {
            setSelectedType(draftType);
            setSelectedClass(draftClass);
            setSelectedBrand(draftBrand);
            setFilterOpen(false);
          }}
          fullWidth
        />
        <View style={{ height: spacing.sm }} />
        <Button
          testID="clear-catalog-filter"
          title="Clear type, class, and brand"
          variant="ghost"
          onPress={() => {
            setDraftType("All");
            setDraftClass("All");
            setDraftBrand("All");
            setSelectedType("All");
            setSelectedClass("All");
            setSelectedBrand("All");
            setFilterOpen(false);
          }}
          fullWidth
        />
      </AppModal>

      {/* Add / Edit modal */}
      <AppModal
        testID="add-item-modal"
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit product" : "Add product"}
        wide
      >
        <Input
          testID="item-name-input"
          label="Item Name"
          placeholder="e.g. Cement Bag 50kg"
          value={fName}
          onChangeText={setFName}
          autoCapitalize="words"
        />
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Input
              testID="item-unit-input"
              label="Unit"
              placeholder="e.g. bag, kg, hr, nos"
              value={fUnit}
              onChangeText={setFUnit}
            />
          </View>
          <View style={styles.formCol}>
            <Input testID="item-product-code-input" label="Product code (optional)" value={fProductCode} onChangeText={setFProductCode} autoCapitalize="characters" />
          </View>
        </View>
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Input testID="item-size-input" label="Size mm" value={fSize} onChangeText={setFSize} placeholder="e.g. 5mm" />
          </View>
          <View style={styles.formCol}>
            <Input testID="item-size-inch-input" label="Size inch" value={fSizeInch} onChangeText={setFSizeInch} placeholder='e.g. 1.2"' />
          </View>
          <View style={styles.formCol}>
            <Input testID="item-length-input" label="Length" value={fLength} onChangeText={setFLength} placeholder="e.g. 3m" />
          </View>
        </View>
        <Text style={styles.sectionTitle}>Pricing and stock</Text>
        <Text style={styles.sectionHint}>Change these anytime. Discount % recalculates selling price from MRP.</Text>
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Input testID="item-mrp-input" label="MRP" value={fMrp} onChangeText={(v) => {
              setFMrp(v);
              const mrp = parseFloat(v);
              const disc = parseFloat(fPriceDiscount);
              if (!Number.isNaN(mrp) && !Number.isNaN(disc)) {
                const next = String(sellingFromMrpDiscount(mrp, disc));
                setFSellingPrice(next);
                setFRate(next);
              }
            }} keyboardType="decimal-pad" />
          </View>
          <View style={styles.formCol}>
            <Input testID="item-price-discount-input" label="Price discount (%)" value={fPriceDiscount} onChangeText={(v) => {
              setFPriceDiscount(v);
              const mrp = parseFloat(fMrp);
              const disc = parseFloat(v);
              if (!Number.isNaN(mrp) && !Number.isNaN(disc)) {
                const next = String(sellingFromMrpDiscount(mrp, disc));
                setFSellingPrice(next);
                setFRate(next);
              }
            }} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Input testID="item-selling-price-input" label="Selling price" value={fSellingPrice} onChangeText={(v) => {
              setFSellingPrice(v);
              setFRate(v);
            }} keyboardType="decimal-pad" />
          </View>
          <View style={styles.formCol}>
            <Input testID="item-purchase-price-input" label="Purchase price" value={fPurchasePrice} onChangeText={setFPurchasePrice} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.formRow}>
          <View style={styles.formCol}>
            <Input testID="item-stock-input" label="Stock qty" value={fStock} onChangeText={setFStock} keyboardType="decimal-pad" />
          </View>
          <View style={styles.formCol}>
            <Input
              testID="item-rate-input"
              label="Standard rate (same as selling)"
              placeholder="e.g. 380"
              value={fRate}
              onChangeText={setFRate}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Product image</Text>
        {fImageUrl ? <RemoteImage uri={fImageUrl} style={styles.imagePreview} placeholderSize={28} /> : <View style={styles.imageEmpty}><Ionicons name="image-outline" size={28} color={colors.textMuted} /><Text style={styles.imageEmptyText}>No image selected</Text></View>}
        <View style={styles.imageActions}><Button testID="pick-product-image" title={fImageUrl ? "Replace image" : "Upload image"} icon="image-outline" onPress={pickProductImage} size="sm" />{fImageUrl ? <Button testID="remove-product-image" title="Remove" variant="ghost" onPress={() => { setFImageUrl(undefined); setFImageName(undefined); }} size="sm" /> : null}</View>
        <Input
          testID="item-image-url-input"
          label="Or paste image URL"
          placeholder="https://example.com/product.jpg"
          value={fImageUrl && !fImageUrl.startsWith("data:") ? fImageUrl : ""}
          onChangeText={setProductImageUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.inputLabel}>Category</Text>
        <TouchableOpacity
          testID="item-category-picker"
          style={styles.selectBox}
          onPress={() => setShowCatPicker(true)}
        >
          <Text
            style={{
              color: fCategory ? colors.textPrimary : colors.textMuted,
              fontSize: 15,
            }}
          >
            {fCategory || "Select a category"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: spacing.md }} />
        <Input testID="item-aliases-input" label="Aliases (comma separated)" value={fAliases} onChangeText={setFAliases} placeholder="Local or alternate names" />
        <Input testID="item-language-input" label="Multilingual names (JSON)" value={fLanguages} onChangeText={setFLanguages} placeholder='{"hi":"सीमेंट"}' autoCapitalize="none" />
        <Input testID="item-sequence-input" label="Display sequence" value={fSequence} onChangeText={setFSequence} keyboardType="numeric" />
        <Input testID="item-rol-input" label="Reorder level (ROL)" value={fRol} onChangeText={setFRol} keyboardType="decimal-pad" />
        <Input testID="item-discount-input" label="Regular discount (%)" value={fDiscount} onChangeText={setFDiscount} keyboardType="decimal-pad" />
        <Text style={styles.inputLabel}>Brand</Text>
        <TouchableOpacity testID="item-brand-picker" style={styles.selectBox} onPress={() => setShowBrandPicker(true)}>
          <Text style={{ color: fBrandId ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>{brands.find((brand) => brand.id === fBrandId)?.name || "Select a brand"}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={{ height: spacing.md }} />
        <Button
          testID="save-item-btn"
          title={editing ? "Save Changes" : "Add Item"}
          onPress={saveItem}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <AppModal testID="brand-picker-modal" visible={showBrandPicker} onClose={() => setShowBrandPicker(false)} title="Select brand">
        {brands.filter((brand) => brand.isActive).map((brand) => (
          <TouchableOpacity key={brand.id} style={styles.catOption} onPress={() => { setFBrandId(brand.id); setShowBrandPicker(false); }} testID={`pick-brand-${brand.id}`}>
            <Text style={styles.catOptionText}>{brand.name}</Text>
            {fBrandId === brand.id ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </TouchableOpacity>
        ))}
      </AppModal>

      {/* Category picker modal (nested) */}
      <AppModal
        testID="category-picker-modal"
        visible={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        title="Select category"
      >
        {cats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.catOption}
            onPress={() => {
              setFCategory(c.name);
              setShowCatPicker(false);
            }}
            testID={`pick-cat-${c.name}`}
          >
            <Text style={styles.catOptionText}>{c.name}</Text>
            {fCategory === c.name ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </TouchableOpacity>
        ))}

        <View style={styles.catDivider} />
        <Text style={[styles.inputLabel, { marginTop: 0 }]}>
          ➕ Create New Category
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Input
              testID="new-category-input"
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="New category name"
              style={{ marginBottom: 0 }}
              autoCapitalize="words"
            />
          </View>
          <Button
            testID="new-category-add"
            title="Add"
            onPress={submitNewCategory}
            loading={creatingCat}
            size="sm"
          />
        </View>
      </AppModal>

      {/* Slide-out action card */}
      <AppModal
        testID="action-modal"
        visible={!!actionSheet}
        onClose={() => setActionSheet(null)}
        title={actionSheet?.name}
      >
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
          {actionSheet?.category} · per {actionSheet?.unit} · ₹
          {formatMoney(actionSheet?.standardRate || 0)}
        </Text>
        <Button
          testID="edit-item-btn"
          title="Edit Item"
          icon="create-outline"
          onPress={() => actionSheet && openEdit(actionSheet)}
          fullWidth
        />
        <View style={{ height: 10 }} />
        <Button
          testID="delete-item-btn"
          title="Delete Item"
          icon="trash-outline"
          variant="danger"
          onPress={requestDelete}
          fullWidth
        />
      </AppModal>

      <PasscodeConfirmModal
        visible={deletePasscodeOpen}
        title="Delete product"
        message={`Remove ${actionSheet?.name || "this item"} permanently.`}
        confirmLabel="Delete product"
        loading={deletingProduct}
        onClose={() => setDeletePasscodeOpen(false)}
        onConfirm={confirmDeleteSecured}
      />

      <ErrorModal
        visible={!!err}
        message={err || ""}
        onClose={() => setErr(null)}
      />
    </SafeAreaView>
  );
}

function PricingRow(props: {
  item: CatalogItem;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const item = props.item;
  const [mrp, setMrp] = useState(item.mrp == null ? "" : String(item.mrp));
  const [discount, setDiscount] = useState(item.discount == null ? "" : String(item.discount));
  const [selling, setSelling] = useState(
    String(item.sellingPrice ?? item.standardRate ?? ""),
  );
  const [stock, setStock] = useState(item.stock == null ? "0" : String(item.stock));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMrp(item.mrp == null ? "" : String(item.mrp));
    setDiscount(item.discount == null ? "" : String(item.discount));
    setSelling(String(item.sellingPrice ?? item.standardRate ?? ""));
    setStock(item.stock == null ? "0" : String(item.stock));
  }, [item.id, item.mrp, item.discount, item.sellingPrice, item.standardRate, item.stock]);

  const dirty =
    Number(mrp || 0) !== Number(item.mrp || 0) ||
    Number(discount || 0) !== Number(item.discount || 0) ||
    Number(selling || 0) !== Number(item.sellingPrice ?? item.standardRate ?? 0) ||
    Number(stock || 0) !== Number(item.stock || 0);

  function onMrp(value: string) {
    setMrp(value);
    const nextMrp = parseFloat(value);
    const nextDisc = parseFloat(discount);
    if (!Number.isNaN(nextMrp) && !Number.isNaN(nextDisc)) {
      setSelling(String(sellingFromMrpDiscount(nextMrp, nextDisc)));
    }
  }

  function onDiscount(value: string) {
    setDiscount(value);
    const nextMrp = parseFloat(mrp);
    const nextDisc = parseFloat(value);
    if (!Number.isNaN(nextMrp) && !Number.isNaN(nextDisc)) {
      setSelling(String(sellingFromMrpDiscount(nextMrp, nextDisc)));
    }
  }

  function onSelling(value: string) {
    setSelling(value);
    const nextMrp = parseFloat(mrp);
    const nextSell = parseFloat(value);
    if (!Number.isNaN(nextMrp) && nextMrp > 0 && !Number.isNaN(nextSell)) {
      setDiscount(String(discountFromMrpSelling(nextMrp, nextSell)));
    }
  }

  async function save() {
    const nextMrp = parseFloat(mrp);
    const nextDisc = parseFloat(discount || "0");
    const nextSell = parseFloat(selling);
    const nextStock = parseFloat(stock || "0");
    if ([nextMrp, nextDisc, nextSell, nextStock].some((n) => Number.isNaN(n))) {
      props.onError("Enter valid MRP, discount, selling price, and stock.");
      return;
    }
    setSaving(true);
    try {
      await updateCatalogPricing(item, {
        mrp: nextMrp,
        discount: nextDisc,
        sellingPrice: nextSell,
        stock: nextStock,
      });
      await props.onDeleted();
    } catch (e: any) {
      props.onError(e instanceof ApiError ? e.message : "Could not save price");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.tableRow, dirty && styles.tableRowDirty]} testID={`admin-item-${item.id}`}>
      <View style={[styles.colProduct, styles.productCell]}>
        <RemoteImage uri={item.imageUrl} style={styles.tableThumb} placeholderSize={16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.productCode || "No code"} · {item.brand || "No brand"} · {item.category}
          </Text>
        </View>
      </View>
      <Text style={styles.sizeCell} numberOfLines={1}>{sizeMmLabel(item) || "—"}</Text>
      <Text style={styles.sizeCell} numberOfLines={1}>{sizeInchLabel(item) || "—"}</Text>
      <Text style={styles.sizeCell} numberOfLines={1}>{sizeLengthLabel(item) || "—"}</Text>
      <TextInput value={mrp} onChangeText={onMrp} keyboardType="decimal-pad" style={styles.tableInput} testID={`mrp-${item.id}`} />
      <TextInput value={discount} onChangeText={onDiscount} keyboardType="decimal-pad" style={styles.tableInput} testID={`discount-${item.id}`} />
      <View style={styles.metricCell}>
        <Text style={styles.metricLabel}>Sell</Text>
        <TextInput value={selling} onChangeText={onSelling} keyboardType="decimal-pad" style={styles.tableInputMetric} testID={`selling-${item.id}`} />
      </View>
      <View style={[styles.metricCell, styles.stockMetricCell]}>
        <Text style={[styles.metricLabel, styles.stockMetricLabel]}>Qty</Text>
        <TextInput value={stock} onChangeText={setStock} keyboardType="decimal-pad" style={[styles.tableInputMetric, styles.stockInput]} testID={`stock-${item.id}`} />
      </View>
      <View style={styles.colActions}>
        <Button title={saving ? "Saving" : dirty ? "Save" : "Saved"} size="sm" onPress={save} loading={saving} disabled={!dirty} testID={`save-price-${item.id}`} />
        <Pressable onPress={props.onEdit} accessibilityRole="button" style={pointer} testID={`edit-item-${item.id}`}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  chipsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
    paddingBottom: spacing.sm,
  },
  categoryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginLeft: spacing.lg,
    marginTop: 8,
    marginBottom: 4,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  filterBtnTextActive: { color: "#FFFFFF" },
  filterHint: { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  filterChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  search: { marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: 0 },
  tableWrap: { padding: spacing.lg, paddingBottom: 48 },
  tableHint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md, lineHeight: 20 },
  bulkBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  bulkLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: "600", marginRight: 8 },
  bulkInput: {
    width: 120,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    backgroundColor: colors.bg,
    fontSize: 14,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  formCol: { flexGrow: 1, flexBasis: 220, minWidth: 180 },
  sectionTitle: { ...font.title, color: colors.textPrimary, marginTop: spacing.md, marginBottom: 4 },
  sectionHint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  th: { ...font.caption, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  tableRowDirty: { backgroundColor: "#FFFBEB" },
  colProduct: { flex: 2.4, minWidth: 220 },
  colSize: { width: 88 },
  sizeCell: { width: 88, color: colors.textPrimary, fontSize: 13 },
  colNum: { width: 110, textAlign: "right" as const },
  colMetric: { width: 118 },
  metricCell: {
    width: 118,
    backgroundColor: "#F0FDF4",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  tableInputMetric: {
    width: "100%",
    height: 36,
    borderWidth: 0,
    paddingHorizontal: 4,
    color: colors.textPrimary,
    backgroundColor: "transparent",
    fontSize: 15,
    fontWeight: "700",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  stockInput: { color: "#0F766E" },
  stockMetricCell: { backgroundColor: "#F0FDFA", borderColor: "#99F6E4" },
  stockMetricLabel: { color: "#0F766E" },
  colActions: { width: 140, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end" },
  productCell: { flexDirection: "row", alignItems: "center", gap: 10 },
  tableThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.bg },
  tableThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  tableInput: {
    width: 110,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 14,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingBottom: 40 },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  productThumb: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.bg },
  productThumbPlaceholder: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  imagePreview: { width: 120, height: 120, borderRadius: radii.sm, backgroundColor: colors.bg, marginBottom: spacing.sm },
  imageEmpty: { width: 120, height: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  imageEmptyText: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  imageActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rowName: { ...font.title, color: colors.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  rowMeta: { color: colors.textSecondary, fontSize: 12 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  pillText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  rate: { ...font.title, color: colors.textPrimary },
  inputLabel: {
    ...font.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  selectBox: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catOption: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catOptionText: { color: colors.textPrimary, fontSize: 15 },
  catDivider: { height: 8 },
});
