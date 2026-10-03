import { useRef, type ChangeEvent } from "react";
import { Button, Input } from "./UI";
import { RemoteImage } from "./RemoteImage";
import { colors, radii, spacing } from "../theme";

export function CoverImageField(props: {
  label: string;
  uri?: string | null;
  onChange: (uri: string | undefined) => void;
  onError: (message: string) => void;
  testID: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => props.onError("Could not read the selected image");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        props.onError("Could not read the selected image");
        return;
      }
      props.onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const pastedUrl = props.uri && !props.uri.startsWith("data:") ? props.uri : "";

  return (
    <div style={{ marginBottom: spacing.md }}>
      <div
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {props.label}
      </div>
      <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
        Upload a file from this computer, or paste a picture URL.
      </div>
      <RemoteImage
        uri={props.uri}
        style={{
          width: "100%",
          height: 120,
          borderRadius: radii.md,
          marginBottom: spacing.sm,
        }}
        placeholderSize={28}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <Button
          testID={`${props.testID}-pick`}
          title={props.uri ? "Replace photo" : "Upload photo"}
          icon="image-outline"
          onPress={() => fileInput.current?.click()}
          size="sm"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          aria-label="Choose an image file"
          onChange={pick}
          style={{ display: "none" }}
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
      </div>
      <Input
        testID={`${props.testID}-url`}
        label="Or paste picture URL"
        placeholder="https://example.com/photo.jpg"
        value={pastedUrl}
        onChangeText={(value) => props.onChange(value.trim() || undefined)}
        autoCapitalize="none"
      />
    </div>
  );
}
