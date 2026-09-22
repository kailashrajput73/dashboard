import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/components/UI";
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{props.label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: spacing.sm },
  preview: { width: "100%", height: 120, borderRadius: radii.md, marginBottom: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
