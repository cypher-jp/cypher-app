// scripts/ 配下で共有する型定義。
// src/types/event.ts の型を再利用しつつ、スクレイパー固有の型を追加する。
// tsx実行時のパス解決を確実にするため、"@/*"エイリアスは使わず相対パスでimportする。
import type { EventType, Genre, Region, I18nLocale } from "../../src/types/event";

/** 1つの情報源(サイト)から取得した、まだ構造化していない生のイベントページ */
export interface RawEventPage {
  /** 個別イベントページの絶対URL。重複排除キー(source_url)になる */
  sourceUrl: string;
  /** Claude抽出用に整形したテキスト(タイトル/日時/会場/本文などを1つにまとめたもの) */
  rawText: string;
  /** フライヤー画像URL(一覧サムネ or og:image)。取得元サイトにホストされた画像への参照 */
  flyerUrl?: string;
}

/** Claude APIによる抽出結果(バリデーション済み) */
export interface ExtractedEvent {
  title: string;
  type: EventType;
  genre: Genre;
  region: Region;
  date: string; // ISO yyyy-mm-dd
  deadline?: string; // ISO yyyy-mm-dd
  venue: string;
  description: string;
  entryUrl?: string;
  /** 主催者/イベントのInstagramアカウント名(@なし) */
  igHandle?: string;
  /** Instagramの投稿 or プロフィールURL */
  igUrl?: string;
}

/** 5言語翻訳結果。キーが無い/空文字の言語は呼び出し側でフォールバックする */
export type TranslationMap = Partial<Record<I18nLocale, string>>;

/** DBへupsertする直前の1件分のデータ */
export interface ScrapedEventRecord extends ExtractedEvent {
  sourceUrl: string;
  source: string; // 取得元の識別子("etstage" 等)
  descriptionI18n?: TranslationMap;
  flyerUrl?: string;
  /** page.rawText の SHA-256(hex)。次回実行時に同じ値ならClaude抽出をスキップする判定に使う */
  contentHash: string;
}

/** 1つの情報源(サイト)を表すインターフェース。scripts/sources/*.ts が実装する */
export interface EventSource {
  /** DBの source カラムに入る識別子 */
  name: string;
  /**
   * この情報源を実際に有効にするかどうか。
   * false の場合、scrape.ts は fetchRawPages を呼び出さず、その旨だけログ出力してスキップする。
   * (robots.txt / 利用規約の確認が済み、収集して良いと判断できるまでは false のままにすること)
   */
  enabled: boolean;
  /** 一覧ページを辿って個別イベントページの生テキストを集める */
  fetchRawPages(): Promise<RawEventPage[]>;
}
