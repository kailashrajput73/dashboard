import { useState } from "react";
import { API_BASE_URL, API_PREFIX } from "../config/env";
import { Icon } from "./Icon";
import { colors } from "../theme";

type LoadMode = "direct" | "cdn" | "proxy" | "failed";

function apiProxyUrl(uri: string) {
  return `${API_BASE_URL}${API_PREFIX}/media/proxy?url=${encodeURIComponent(uri)}`;
}

function imageCdnUrl(uri: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(uri.replace(/^https?:\/\//, ""))}&n=-1`;
}

export function RemoteImage(props: {
  uri?: string | null;
  style?: React.CSSProperties;
  testID?: string;
  placeholderSize?: number;
}) {
  const [mode, setMode] = useState<LoadMode>("direct");
  const uri = (props.uri || "").trim();

  if (!uri || mode === "failed") {
    return (
      <span
        data-testid={props.testID}
        style={{
          ...props.style,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <Icon
          name="image-outline"
          size={props.placeholderSize || 16}
          color={colors.textMuted}
        />
      </span>
    );
  }

  const isData = uri.startsWith("data:");
  const src =
    isData || mode === "direct"
      ? uri
      : mode === "cdn"
        ? imageCdnUrl(uri)
        : apiProxyUrl(uri);

  function onError() {
    if (isData) {
      setMode("failed");
    } else if (mode === "direct") {
      setMode("cdn");
    } else if (mode === "cdn") {
      setMode("proxy");
    } else {
      setMode("failed");
    }
  }

  return (
    <img
      src={src}
      alt=""
      data-testid={props.testID}
      referrerPolicy="no-referrer"
      onError={onError}
      style={{
        ...props.style,
        display: "block",
        objectFit: "cover",
        backgroundColor: colors.bg,
      }}
    />
  );
}
