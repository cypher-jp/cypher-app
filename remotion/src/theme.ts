// サイト本体 (tailwind.config.ts / globals.css) と同じブランドカラー。
// ここを変えるときは本体側も合わせること。
export const COLORS = {
  ink: "#0A0A0B",
  paper: "#F5F2EC",
  red: "#E63946",
  navy: "#1D3557",
  green: "#2A9D8F",
  yellow: "#F4D35E",
  purple: "#8E5BA6",
} as const;

/** イベント種別ごとのチップ色 (EventCard.tsx の TYPE_ACCENT と同じ対応) */
export const TYPE_ACCENT: Record<string, { bg: string; fg: string }> = {
  battle: { bg: COLORS.red, fg: COLORS.paper },
  contest: { bg: COLORS.purple, fg: COLORS.paper },
  showcase: { bg: COLORS.navy, fg: COLORS.paper },
  workshop: { bg: COLORS.green, fg: COLORS.paper },
  audition: { bg: COLORS.ink, fg: COLORS.paper },
  festival: { bg: COLORS.yellow, fg: COLORS.ink },
};

export function typeAccent(type: string) {
  return TYPE_ACCENT[type] ?? { bg: COLORS.ink, fg: COLORS.paper };
}
