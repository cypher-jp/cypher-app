// 情報源: 国内の単発イベント運営サイト(共通ファクトリ利用)をまとめて定義するモジュール。
// world-battles.ts の国内版。いずれも年1回開催・公式サイト1ページに開催情報が集約されているため、
// scripts/lib/single-page-source.ts の共通ファクトリで実装する。
//
// ▼ robots.txt 調査結果 (2026-07-23 時点。いずれも実行のたびにcheckRobotsTxt()で再確認される)
//   - forever-jp.com            … Disallowに該当なし(Jimdo製)。許可
//   - streetdancecampjapan.com  … Disallowに該当なし(Jimdo製)。許可
//
// ▼ サイト構造 (2026-07-23 時点の実地調査)
//   - forever japan: POPPING/LOCKING/HIPHOP/HOUSEの4部門で開催される国内大会。
//     トップページに開催概要・エントリー・会場情報が集約(調査時点の表記は2025年版)。
//   - STREET DANCE CAMP JAPAN (SDCJ): 合宿型のダンスキャンプ+バトル。
//     調査時点で「SDCJ 2026 9/18-9/21開催決定」がトップページに掲載済み。
//   - どちらもJimdo製のためフライヤーはog:image(キービジュアル)を使用。
//   - 開催後は過去日となりextract側で自動スキップ、次回発表(ページ更新)で自動再取得(共通ファクトリの挙動)。
import { createSinglePageSource } from "../lib/single-page-source";
import type { EventSource } from "../lib/types";

/** 国内の単発イベントサイト群。scrape.tsのSOURCESへはこの配列ごと展開して登録する */
export const japanSingleSources: EventSource[] = [
  createSinglePageSource({
    name: "forever-japan",
    origin: "https://www.forever-jp.com",
    siteLabel:
      "forever japan 公式サイト(POPPING/LOCKING/HIPHOP/HOUSEの4部門で開催される国内ダンスバトル大会)",
  }),
  createSinglePageSource({
    name: "street-dance-camp-japan",
    origin: "https://www.streetdancecampjapan.com",
    siteLabel:
      "STREET DANCE CAMP JAPAN (SDCJ) 公式サイト(合宿型のストリートダンスキャンプ。ワークショップとバトルを含む)",
  }),
];
