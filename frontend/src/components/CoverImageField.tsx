import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Input } from "@/src/components/UI";
import { RemoteImage } from "@/src/components/RemoteImage";
import { pickImageAsDataUrl } from "@/src/utils/pick-image";
import { colors, radii, spacing } from "@/src/theme";

export function CoverImageField(props: {
  label: string;
  uri?: string | null;
  onChange: (uri: string | undefined) => void;
  testID: string;
}) {
  async function pick() {
    const picked = await pickImageAsDataUrl();
    if (picked) props.onChange(picked.dataUrl);
  }

  const pastedUrl = props.uri && !props.uri.startsWith("data:") ? props.uri : "";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{props.label}</Text>
      <Text style={styles.hint}>Upload a file from this computer, or paste a picture URL.</Text>
      <RemoteImage uri={props.uri} style={styles.preview} placeholderSize={28} />
      <View style={styles.actions}>
        <Button
          testID={`${props.testID}-pick`}
          title={props.uri ? "Replace photo" : "Upload photo"}
          icon="image-outline"
          onPress={pick}
          size="sm"
        />
        {props.uri ? (
          <Button
            testID={`${props.testID}-remove`}
            title="Remove"
            variant="ghost"
            onPress={() => props.onChange(undefined)}
            size="sm"
          />
        ) : null}
      </View>
      <Input
        testID={`${props.testID}-url`}
        label="Or paste picture URL"
        placeholder="https://example.com/photo.jpg"
        value={pastedUrl}
        onChangeText={(value) => props.onChange(value.trim() || undefined)}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  preview: { width: "100%", height: 120, borderRadius: radii.md, marginBottom: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
});
