import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelTemplate } from "../types";
import { COLORS } from "../theme";
import { BODY_FONT, DISPLAY_FONT } from "../fonts";

export const Cta: React.FC<{ siteUrl: string; template?: ReelTemplate }> = ({
  siteUrl,
  template = "classic",
}) => {
  const light = template === "light";
  const bg = light ? COLORS.paper : COLORS.ink;
  const fg = light ? COLORS.ink : COLORS.paper;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inA = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  const inB = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 110 } });
  const inC = spring({ frame: frame - 16, fps, config: { damping: 18 } });
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const dot = interpolate(frame % 30, [0, 15, 30], [1, 1.25, 1]);
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <AbsoluteFill style={{ backgroundColor: bg, opacity: fadeIn }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: 8,
            color: fg,
            opacity: 0.8 * inA,
            textTransform: "uppercase",
          }}
        >
          More events at
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: DISPLAY_FONT,
            fontSize: 112,
            color: fg,
            letterSpacing: -3,
            transform: `translateY(${(1 - inB) * 50}px)`,
            opacity: inB,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {host}
          <span style={{ color: COLORS.red, display: "inline-block", transform: `scale(${dot})` }}>.</span>
        </div>
        <div
          style={{
            marginTop: 80,
            fontFamily: DISPLAY_FONT,
            fontSize: 48,
            color: bg,
            backgroundColor: fg,
            padding: "18px 54px",
            borderRadius: 999,
            letterSpacing: 2,
            opacity: inC,
            transform: `scale(${0.9 + 0.1 * inC})`,
          }}
        >
          LINK IN BIO
        </div>
        <div
          style={{
            marginTop: 140,
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 5,
            color: fg,
            opacity: 0.6 * inC,
          }}
        >
          STREET DANCE BATTLE INFO, ONE PLACE
        </div>
        <Img
          src={staticFile(light ? "logo.png" : "logo-white.png")}
          style={{ width: 360, marginTop: 60, opacity: inC }}
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 28,
          backgroundColor: COLORS.red,
          transform: `scaleX(${inC})`,
          transformOrigin: "left",
        }}
      />
    </AbsoluteFill>
  );
};
