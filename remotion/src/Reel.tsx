import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender, useVideoConfig } from "remotion";
import type { ReelProps } from "./types";
import { CTA_SECONDS, OPENING_SECONDS } from "./types";
import { Opening } from "./scenes/Opening";
import { EventScene } from "./scenes/EventScene";
import { Cta } from "./scenes/Cta";
import { COLORS } from "./theme";
import { fontsReady } from "./fonts";

export const Reel: React.FC<ReelProps> = ({ events, headline, subline, siteUrl, secondsPerEvent, template = "classic" }) => {
  const { fps } = useVideoConfig();
  // フォント読み込みが終わるまでフレームを確定させない(文字化け・フォールバック描画防止)
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);
  const opening = Math.round(OPENING_SECONDS * fps);
  const per = Math.round(secondsPerEvent * fps);
  const cta = Math.round(CTA_SECONDS * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: template === "light" ? COLORS.paper : COLORS.ink }}>
      <Sequence from={0} durationInFrames={opening} name="Opening">
        <Opening headline={headline} subline={subline} count={events.length} />
      </Sequence>
      {events.map((ev, i) => (
        <Sequence key={ev.id} from={opening + i * per} durationInFrames={per} name={`Event ${i + 1}`}>
          <EventScene event={ev} index={i} total={events.length} template={template} />
        </Sequence>
      ))}
      <Sequence from={opening + events.length * per} durationInFrames={cta} name="CTA">
        <Cta siteUrl={siteUrl} template={template} />
      </Sequence>
    </AbsoluteFill>
  );
};
