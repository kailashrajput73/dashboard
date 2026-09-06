import { Platform } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

/** Read a DocumentPicker file as bytes. Native uses FileSystem; web uses File/fetch. */
export async function readAssetBytes(asset: DocumentPickerAsset): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const file = (asset as { file?: File }).file;
    if (file) {
      return new Uint8Array(await file.arrayBuffer());
    }
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error("Could not read the selected file.");
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : globalThis.Buffer
        ? globalThis.Buffer.from(b64, "base64").toString("binary")
        : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
