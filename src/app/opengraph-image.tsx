import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/directus";

export const alt = "NP Coaches — premium coach travel across the UK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const settings = await getSettings();
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #172554 0%, #101a3c 65%, #2563eb 140%)",
        color: "#fdfdfd",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "76px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "1000px" }}>
        <div style={{ color: "#93c5fd", display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase" }}>
          {`Established ${settings.founded} · Family run`}
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, marginTop: 24 }}>{settings.name}</div>
        <div style={{ color: "#dbeafe", fontSize: 40, lineHeight: 1.25, marginTop: 20 }}>
          {settings.tagline}
        </div>
        <div style={{ display: "flex", fontSize: 25, gap: 28, marginTop: 50 }}>
          {settings.stats.slice(0, 3).map((stat, index) => (
            <span key={stat.label}>{`${index ? "• " : ""}${stat.value} ${stat.label}`}</span>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
