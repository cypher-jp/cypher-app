// 本体サイトの display="Arial Black" / body="Inter" に近い組み合わせ。
// レンダリング環境(GitHub Actions の Linux)に Arial Black が無いので、
// public/fonts に同梱した Google Fonts(OFL)を使う。ネットワーク不要で再現性が高い。
// 日本語はレンダラー側にインストールした Noto Sans CJK にフォールバックする。
import { staticFile } from "remotion";

export const DISPLAY_FONT = '"Archivo Black", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
export const BODY_FONT = '"Inter", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';

const canLoad = typeof document !== "undefined" && typeof FontFace !== "undefined";

const display = canLoad ? new FontFace("Archivo Black", `url(${staticFile("fonts/ArchivoBlack-latin.woff2")})`, {
  weight: "400",
}) : null;
const body = canLoad ? new FontFace("Inter", `url(${staticFile("fonts/Inter-latin.woff2")})`, {
  weight: "100 900",
}) : null;

export const fontsReady: Promise<void> =
  display && body
    ? Promise.all([display.load(), body.load()]).then((faces) => {
        faces.forEach((f) => document.fonts.add(f));
      })
    : Promise.resolve();
