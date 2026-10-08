import add from "ionicons/dist/collection/components/icon/svg/add.svg?raw";
import addCircle from "ionicons/dist/collection/components/icon/svg/add-circle.svg?raw";
import barChartOutline from "ionicons/dist/collection/components/icon/svg/bar-chart-outline.svg?raw";
import barcodeOutline from "ionicons/dist/collection/components/icon/svg/barcode-outline.svg?raw";
import cartOutline from "ionicons/dist/collection/components/icon/svg/cart-outline.svg?raw";
import cashOutline from "ionicons/dist/collection/components/icon/svg/cash-outline.svg?raw";
import checkmark from "ionicons/dist/collection/components/icon/svg/checkmark.svg?raw";
import checkmarkCircle from "ionicons/dist/collection/components/icon/svg/checkmark-circle.svg?raw";
import checkmarkCircleOutline from "ionicons/dist/collection/components/icon/svg/checkmark-circle-outline.svg?raw";
import chevronBack from "ionicons/dist/collection/components/icon/svg/chevron-back.svg?raw";
import chevronDown from "ionicons/dist/collection/components/icon/svg/chevron-down.svg?raw";
import chevronForward from "ionicons/dist/collection/components/icon/svg/chevron-forward.svg?raw";
import chevronUp from "ionicons/dist/collection/components/icon/svg/chevron-up.svg?raw";
import close from "ionicons/dist/collection/components/icon/svg/close.svg?raw";
import closeCircle from "ionicons/dist/collection/components/icon/svg/close-circle.svg?raw";
import constructOutline from "ionicons/dist/collection/components/icon/svg/construct-outline.svg?raw";
import cloudUploadOutline from "ionicons/dist/collection/components/icon/svg/cloud-upload-outline.svg?raw";
import createOutline from "ionicons/dist/collection/components/icon/svg/create-outline.svg?raw";
import cube from "ionicons/dist/collection/components/icon/svg/cube.svg?raw";
import cubeOutline from "ionicons/dist/collection/components/icon/svg/cube-outline.svg?raw";
import documentOutline from "ionicons/dist/collection/components/icon/svg/document-outline.svg?raw";
import documentTextOutline from "ionicons/dist/collection/components/icon/svg/document-text-outline.svg?raw";
import downloadOutline from "ionicons/dist/collection/components/icon/svg/download-outline.svg?raw";
import ellipsisVertical from "ionicons/dist/collection/components/icon/svg/ellipsis-vertical.svg?raw";
import filterOutline from "ionicons/dist/collection/components/icon/svg/filter-outline.svg?raw";
import funnelOutline from "ionicons/dist/collection/components/icon/svg/funnel-outline.svg?raw";
import gitBranchOutline from "ionicons/dist/collection/components/icon/svg/git-branch-outline.svg?raw";
import gridOutline from "ionicons/dist/collection/components/icon/svg/grid-outline.svg?raw";
import imageOutline from "ionicons/dist/collection/components/icon/svg/image-outline.svg?raw";
import layersOutline from "ionicons/dist/collection/components/icon/svg/layers-outline.svg?raw";
import listOutline from "ionicons/dist/collection/components/icon/svg/list-outline.svg?raw";
import logInOutline from "ionicons/dist/collection/components/icon/svg/log-in-outline.svg?raw";
import logOutOutline from "ionicons/dist/collection/components/icon/svg/log-out-outline.svg?raw";
import optionsOutline from "ionicons/dist/collection/components/icon/svg/options-outline.svg?raw";
import pauseCircleOutline from "ionicons/dist/collection/components/icon/svg/pause-circle-outline.svg?raw";
import peopleOutline from "ionicons/dist/collection/components/icon/svg/people-outline.svg?raw";
import playCircleOutline from "ionicons/dist/collection/components/icon/svg/play-circle-outline.svg?raw";
import pricetagOutline from "ionicons/dist/collection/components/icon/svg/pricetag-outline.svg?raw";
import pricetagsOutline from "ionicons/dist/collection/components/icon/svg/pricetags-outline.svg?raw";
import receiptOutline from "ionicons/dist/collection/components/icon/svg/receipt-outline.svg?raw";
import ribbonOutline from "ionicons/dist/collection/components/icon/svg/ribbon-outline.svg?raw";
import sendOutline from "ionicons/dist/collection/components/icon/svg/send-outline.svg?raw";
import settingsOutline from "ionicons/dist/collection/components/icon/svg/settings-outline.svg?raw";
import shieldOutline from "ionicons/dist/collection/components/icon/svg/shield-outline.svg?raw";
import swapHorizontalOutline from "ionicons/dist/collection/components/icon/svg/swap-horizontal-outline.svg?raw";
import timeOutline from "ionicons/dist/collection/components/icon/svg/time-outline.svg?raw";
import trashOutline from "ionicons/dist/collection/components/icon/svg/trash-outline.svg?raw";
import warningOutline from "ionicons/dist/collection/components/icon/svg/warning-outline.svg?raw";

const icons = {
  add,
  "add-circle": addCircle,
  "bar-chart-outline": barChartOutline,
  "barcode-outline": barcodeOutline,
  "cart-outline": cartOutline,
  "cash-outline": cashOutline,
  checkmark,
  "checkmark-circle": checkmarkCircle,
  "checkmark-circle-outline": checkmarkCircleOutline,
  "chevron-back": chevronBack,
  "chevron-down": chevronDown,
  "chevron-forward": chevronForward,
  "chevron-up": chevronUp,
  close,
  "close-circle": closeCircle,
  "construct-outline": constructOutline,
  "cloud-upload-outline": cloudUploadOutline,
  "create-outline": createOutline,
  cube,
  "cube-outline": cubeOutline,
  "document-outline": documentOutline,
  "document-text-outline": documentTextOutline,
  "download-outline": downloadOutline,
  "ellipsis-vertical": ellipsisVertical,
  "filter-outline": filterOutline,
  "funnel-outline": funnelOutline,
  "git-branch-outline": gitBranchOutline,
  "grid-outline": gridOutline,
  "image-outline": imageOutline,
  "layers-outline": layersOutline,
  "list-outline": listOutline,
  "log-in-outline": logInOutline,
  "log-out-outline": logOutOutline,
  "options-outline": optionsOutline,
  "pause-circle-outline": pauseCircleOutline,
  "people-outline": peopleOutline,
  "play-circle-outline": playCircleOutline,
  "pricetag-outline": pricetagOutline,
  "pricetags-outline": pricetagsOutline,
  "receipt-outline": receiptOutline,
  "ribbon-outline": ribbonOutline,
  "send-outline": sendOutline,
  "settings-outline": settingsOutline,
  "shield-outline": shieldOutline,
  "swap-horizontal-outline": swapHorizontalOutline,
  "time-outline": timeOutline,
  "trash-outline": trashOutline,
  "warning-outline": warningOutline,
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 20, color = "currentColor" }: IconProps) {
  const match = icons[name].match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/);
  const viewBox = match?.[1].match(/\bviewBox=["']([^"']+)["']/)?.[1];

  if (!match || !viewBox) {
    throw new Error(`Invalid Ionicons SVG for "${name}"`);
  }

  return (
    <svg
      aria-hidden="true"
      className="web-ionicon"
      width={size}
      height={size}
      viewBox={viewBox}
      style={{ color }}
      dangerouslySetInnerHTML={{ __html: match[2] }}
    />
  );
}
