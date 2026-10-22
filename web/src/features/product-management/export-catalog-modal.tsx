import { AppModal, Button } from "../../components/UI";
import { colors, font, spacing } from "../../theme";
import type { ExportScopeMode } from "./export-catalog-utils";

type Props = {
  visible: boolean;
  onClose: () => void;
  onChoose: (mode: ExportScopeMode) => void;
  onExportFullNow: () => void;
  exporting: boolean;
};

export function ExportCatalogModal(props: Props) {
  return (
    <AppModal visible={props.visible} onClose={props.onClose} title="Export catalog CSV">
      <p style={{ ...font.caption, color: colors.textSecondary, marginTop: 0, lineHeight: 1.45 }}>
        Master upload columns. Choose how much to export.
      </p>
      <Button
        testID="export-catalog-full"
        title="1 — Full catalog (all products)"
        icon="download-outline"
        onPress={() => void props.onExportFullNow()}
        loading={props.exporting}
        fullWidth
      />
      <Button
        testID="export-catalog-filtered-mode"
        title="2 — By filters on this page"
        icon="funnel-outline"
        variant="ghost"
        onPress={() => props.onChoose("filtered")}
        fullWidth
        style={{ marginTop: spacing.sm }}
      />
      <Button
        testID="export-catalog-selected-mode"
        title="3 — Pick products (checkboxes)"
        icon="checkmark-circle-outline"
        variant="ghost"
        onPress={() => props.onChoose("selected")}
        fullWidth
        style={{ marginTop: spacing.sm }}
      />
    </AppModal>
  );
}
