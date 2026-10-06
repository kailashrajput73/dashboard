import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "./UI";
import { colors, spacing } from "../theme";

export function ProductQr({ value, inline = false }: { value: string; inline?: boolean }) {
  const code = value.trim();
  const [generated, setGenerated] = useState<{ code: string; uri: string } | null>(null);
  const uri = generated?.code === code ? generated.uri : null;

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void QRCode.toDataURL(code, {
      margin: 1,
      width: inline ? 96 : 180,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) setGenerated({ code, uri: dataUrl });
      })
      .catch(() => {
        if (!cancelled) setGenerated(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, inline]);

  function download() {
    if (!uri || !code) return;
    const anchor = document.createElement("a");
    anchor.href = uri;
    anchor.download = `${code}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  if (!code) return null;
  if (inline) {
    if (!uri) return null;
    return (
      <img
        src={uri}
        width={56}
        height={56}
        alt={`QR code for ${code}`}
        data-testid={`product-qr-${code}`}
        style={{ backgroundColor: "#FFFFFF", flexShrink: 0 }}
      />
    );
  }

  return (
    <div data-testid="product-qr" style={wrapStyle}>
      <div style={labelStyle}>QR code</div>
      {uri ? (
        <img src={uri} width={180} height={180} alt={`QR code for ${code}`} style={imageStyle} />
      ) : (
        <div style={pendingStyle}>Generating QR…</div>
      )}
      <div style={codeStyle}>{code}</div>
      {uri ? (
        <Button testID="download-product-qr" title="Download QR" icon="download-outline" onPress={download} size="sm" />
      ) : null}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  marginTop: spacing.sm,
  marginBottom: spacing.md,
};

const labelStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  marginBottom: 6,
};

const imageStyle: React.CSSProperties = { backgroundColor: "#FFFFFF" };
const pendingStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 13, marginBottom: 6 };
const codeStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13, marginTop: 6, marginBottom: spacing.sm };