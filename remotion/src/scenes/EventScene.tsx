import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelEvent, ReelTemplate } from "../types";
import { COLORS, typeAccent } from "../theme";
import { BODY_FONT, DISPLAY_FONT } from "../fonts";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDate(date: string, endDate?: string | null) {
  const [y, m, d] = date.split("-").map(Number);
  const month = MONTHS[(m ?? 1) - 1] ?? "";
  if (endDate && endDate !== date) {
    const [, em, ed] = endDate.split("-").map(Number);
    if (em === m) return { month, day: `${d}-${ed}`, year: y };
    return { month, day: `${d} – ${MONTHS[(em ?? 1) - 1]} ${ed}`, year: y };
  }
  return { month, day: String(d), year: y };
}

const Chip: React.FC<{ bg: string; fg: string; children: React.ReactNode; outline?: boolean }> = ({
  bg,
  fg,
  children,
  outline,
}) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: BODY_FONT,
      fontWeight: 900,
      fontSize: 30,
      letterSpacing: 3,
      textTransform: "uppercase",
      padding: "10px 26px",
      borderRadius: 999,
      backgroundColor: outline ? "transparent" : bg,
      color: fg,
      border: outline ? `3px solid ${fg}` : "none",
      marginRight: 14,
      marginBottom: 14,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export const EventScene: React.FC<{
  event: ReelEvent;
  index: number;
  total: number;
  template?: ReelTemplate;
}> = ({ event, index, total, template = "classic" }) => {
  const light = template === "light";
  // テンプレ別パレット(classic=黒ベース / light=白ベース)
  const baseBg = light ? COLORS.paper : COLORS.ink;
  const textMain = light ? COLORS.ink : COLORS.paper;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const imgIn = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const panelIn = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });
  const textIn = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // ゆっくりズーム(Ken Burns)
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);

  const { month, day, year } = formatDate(event.date, event.endDate);
  const accent = typeAccent(event.type);
  const genres = event.genres.slice(0, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: baseBg, opacity: fadeOut }}>
      {/* 背景: フライヤーをぼかして全面に */}
      {event.flyerUrl ? (
        <>
          <Img
            src={event.flyerUrl}
            style={{
              position: "absolute",
              inset: -40,
              width: "calc(100% + 80px)",
              height: "calc(100% + 80px)",
              objectFit: "cover",
              filter: light ? "blur(40px) brightness(1.05)" : "blur(40px) brightness(0.45)",
              transform: `scale(${zoom})`,
            }}
          />
          {light && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(245,242,236,0.72)",
              }}
            />
          )}
          {/* メインのフライヤー(はみ出さず全体表示) */}
          <div
            style={{
              position: "absolute",
              top: 120,
              left: 60,
              right: 60,
              height: 1080,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: imgIn,
              transform: `scale(${0.92 + 0.08 * imgIn})`,
            }}
          >
            <Img
              src={event.flyerUrl}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 28,
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              }}
            />
          </div>
        </>
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${COLORS.navy} 0%, ${COLORS.ink} 70%)`,
          }}
        />
      )}

      {/* 左上: カウンター */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          fontFamily: DISPLAY_FONT,
          fontSize: 34,
          color: textMain,
          letterSpacing: 4,
          opacity: 0.9,
        }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {/* 右上: 種別チップ */}
      <div style={{ position: "absolute", top: 32, right: 60 }}>
        <Chip bg={accent.bg} fg={accent.fg}>
          {event.type}
        </Chip>
      </div>

      {/* 下部パネル */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 720,
          background: light
            ? `linear-gradient(to top, ${COLORS.paper} 0%, ${COLORS.paper} 55%, rgba(245,242,236,0) 100%)`
            : `linear-gradient(to top, ${COLORS.ink} 0%, ${COLORS.ink} 55%, rgba(10,10,11,0) 100%)`,
          transform: `translateY(${(1 - panelIn) * 200}px)`,
          padding: "200px 70px 90px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 24,
            opacity: textIn,
            transform: `translateY(${(1 - textIn) * 30}px)`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 120,
              lineHeight: 0.85,
              color: textMain,
              letterSpacing: -2,
            }}
          >
            {month} <span style={{ color: COLORS.red }}>{day}</span>
          </div>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontWeight: 700,
              fontSize: 36,
              color: textMain,
              opacity: 0.7,
              letterSpacing: 4,
              paddingBottom: 6,
            }}
          >
            {year}
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: DISPLAY_FONT,
            fontSize: event.title.length > 28 ? 58 : 72,
            lineHeight: 1.02,
            color: textMain,
            letterSpacing: -1,
            opacity: textIn,
            transform: `translateY(${(1 - textIn) * 30}px)`,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {event.title}
        </div>
        <div style={{ marginTop: 30, opacity: textIn }}>
          {genres.map((g) => (
            <Chip key={g} bg={textMain} fg={textMain} outline>
              {g}
            </Chip>
          ))}
          {event.region && (
            <Chip bg={textMain} fg={baseBg}>
              {event.region}
            </Chip>
          )}
        </div>
        {(event.venue || event.format || event.entryFee) && (
          <div
            style={{
              marginTop: 16,
              fontFamily: BODY_FONT,
              fontWeight: 400,
              fontSize: 32,
              color: textMain,
              opacity: 0.75 * textIn,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {[event.venue, event.format, event.entryFee].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
