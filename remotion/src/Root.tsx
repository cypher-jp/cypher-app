import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { FPS, HEIGHT, WIDTH, totalFrames, type ReelProps } from "./types";
import { fontsReady } from "./fonts";
import sample from "./sample-props.json";

export const COMPOSITION_ID = "NewEventsReel";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={Reel}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={totalFrames(sample as ReelProps)}
      defaultProps={sample as ReelProps}
      calculateMetadata={async ({ props }) => {
        await fontsReady;
        return { durationInFrames: totalFrames(props), props };
      }}
    />
  );
};
