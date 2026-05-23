import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // Concentric circles representing RootRecall radar / AI intelligence brand
      <div
        style={{
          background: "#06070A",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          border: "1px solid #1F2228",
          position: "relative",
        }}
      >
        {/* Outer Radar Line */}
        <div
          style={{
            position: "absolute",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: "1.5px solid rgba(103, 247, 177, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        {/* Inner Radar Line */}
        <div
          style={{
            position: "absolute",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: "1.5px solid rgba(77, 163, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        {/* Glowing Radar Sweep Dot */}
        <div
          style={{
            position: "absolute",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#67F7B1",
            boxShadow: "0 0 8px #67F7B1",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
