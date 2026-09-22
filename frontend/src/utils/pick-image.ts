import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

export async function pickImageAsDataUrl(): Promise<{ dataUrl: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const name = asset.name || "image";
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error("Could not read the selected image");
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the selected image"));
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read the selected image"));
          return;
        }
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
    return { dataUrl, name };
  }
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { dataUrl: `data:${asset.mimeType || "image/jpeg"};base64,${base64}`, name };
}
