"use client";

import Script from "next/script";
import { useEffect } from "react";

// Instagram公式のembed.jsはグローバルに window.instgrm を生やす。
// 型定義が無いので、strict/any禁止を守るためここで最小限の型を宣言する。
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface Props {
  url: string;
}

/**
 * Instagram公式のブロックコード埋め込み。
 * 画像CDNの直リンクは規約リスクがあるため使わず、必ずこのコンポーネント経由で表示する。
 */
export default function InstagramEmbed({ url }: Props) {
  useEffect(() => {
    // 別のイベントに遷移した場合など、embed.js が既に読み込まれていれば都度再処理する。
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
  }, [url]);

  return (
    <div className="flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: "3px",
          margin: "1px",
          maxWidth: "540px",
          minWidth: "326px",
          padding: 0,
          width: "99.375%",
        }}
      />
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.instgrm?.Embeds.process();
        }}
      />
    </div>
  );
}
