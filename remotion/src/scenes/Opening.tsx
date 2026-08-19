import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../theme";
import { BODY_FONT, DISPLAY_FONT } from "../fonts";

export const Opening: React.FC<{ headline: string; subline: string; count: number }> = ({
  headline,
  subline,
  count,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 110 } });
  const subIn = spring({ frame: frame - 16, fps, config: { damping: 18 } });
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 赤い帯が左から右へ走る
  const barW = interpolate(frame, [4, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper, opacity: fadeOut }}>
      {/* 上部の赤バー */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 28,
          width: `${barW * 100}%`,
          backgroundColor: COLORS.red,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 560,
            transform: `scale(${0.8 + 0.2 * logoIn})`,
            opacity: logoIn,
            marginBottom: 120,
          }}
        />
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 150,
            lineHeight: 0.92,
            color: COLORS.ink,
            textAlign: "center",
            letterSpacing: -4,
            transform: `translateY(${(1 - titleIn) * 60}px)`,
            opacity: titleIn,
          }}
        >
          {headline.split(" ").map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 56,
            fontFamily: BODY_FONT,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: 6,
            color: COLORS.ink,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 30}px)`,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {subline}
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: DISPLAY_FONT,
            fontSize: 60,
            color: COLORS.paper,
            backgroundColor: COLORS.red,
            padding: "10px 40px",
            borderRadius: 999,
            opacity: subIn,
          }}
        >
          {count} {count === 1 ? "EVENT" : "EVENTS"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
