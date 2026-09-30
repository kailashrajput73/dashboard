import React, { useEffect, useState } from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import QRCode from "qrcode";

import { Button } from "@/src/components/UI";
import { colors, spacing } from "@/src/theme";

type ProductQrProps = {
  value: string;
  /** Image only, for a product row. The product form keeps the download button. */
  inline?: boolean;
};

export function ProductQr({ value, inline = false }: ProductQrProps) {
  const code = value.trim();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setUri(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(code, { margin: 1, width: inline ? 96 : 180, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!cancelled) setUri(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, inline]);

  async function download() {
    if (!uri || !code) return;
    const fileName = `${code}-qr.png`;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const link = document.createElement("a");
      link.href = uri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    const base64 = uri.split(",")[1];
    if (!base64 || !FileSystem.cacheDirectory) return;
    const path = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Linking.openURL(path);
  }

  if (!code) return null;

  if (inline) {
    if (!uri) return null;
    return (
      <Image
        source={{ uri }}
        style={styles.inline}
        accessibilityLabel={`QR code for ${code}`}
        testID={`product-qr-${code}`}
      />
    );
  }

  return (
    <View style={styles.wrap} testID="product-qr">
      <Text style={styles.label}>QR code</Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          accessibilityLabel={`QR code for ${code}`}
        />
      ) : (
        <Text style={styles.pending}>Generating QR…</Text>
      )}
      <Text style={styles.code}>{code}</Text>
      {uri ? (
        <Button testID="download-product-qr" title="Download QR" icon="download-outline" onPress={download} size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start", marginTop: spacing.sm, marginBottom: spacing.md },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  image: { width: 180, height: 180, backgroundColor: "#FFFFFF" },
  inline: { width: 56, height: 56, backgroundColor: "#FFFFFF" },
  pending: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  code: { color: colors.textSecondary, fontSize: 13, marginTop: 6, marginBottom: spacing.sm },
});
