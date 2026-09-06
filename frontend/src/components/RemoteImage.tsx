import React, { useState } from "react";
import { Image, Platform, StyleSheet, View, type StyleProp, type ImageStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL, API_PREFIX } from "@/src/config/env";
import { colors } from "@/src/theme";

function proxyUrl(uri: string) {
  return `${API_BASE_URL}${API_PREFIX}/media/proxy?url=${encodeURIComponent(uri)}`;
}

function webStyle(style: StyleProp<ImageStyle>): React.CSSProperties {
  const flat = StyleSheet.flatten(style) || {};
  return {
    width: flat.width as number | string | undefined,
    height: flat.height as number | string | undefined,
    borderRadius: flat.borderRadius as number | undefined,
    backgroundColor: (flat.backgroundColor as string) || colors.bg,
    objectFit: "cover",
    display: "block",
  };
}

export function RemoteImage(props: {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  testID?: string;
  placeholderSize?: number;
}) {
  const [mode, setMode] = useState<"direct" | "proxy" | "failed">("direct");
  const uri = (props.uri || "").trim();
  if (!uri) {
    return (
      <View style={[props.style, styles.placeholder]}>
        <Ionicons name="image-outline" size={props.placeholderSize || 16} color={colors.textMuted} />
      </View>
    );
  }
  const isData = uri.startsWith("data:");
  const src = mode === "proxy" && !isData ? proxyUrl(uri) : uri;
  if (mode === "failed") {
    return (
      <View style={[props.style, styles.placeholder]}>
        <Ionicons name="image-outline" size={props.placeholderSize || 16} color={colors.textMuted} />
      </View>
    );
  }
  if (Platform.OS === "web") {
    return (
      // @ts-expect-error web img
      <img
        src={src}
        alt=""
        data-testid={props.testID}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!isData && mode === "direct") setMode("proxy");
          else setMode("failed");
        }}
        style={webStyle(props.style)}
      />
    );
  }
  return (
    <Image
      testID={props.testID}
      source={{ uri: src }}
      style={props.style}
      onError={() => {
        if (!isData && mode === "direct") setMode("proxy");
        else setMode("failed");
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
