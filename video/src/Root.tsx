import React from "react";
import { Composition, Still } from "remotion";
import { Launch, Cover, DURATION } from "./Launch";
import { EN, PT } from "./copy";

/* 1080×1920 upright, 30 fps: one edit for Reels and TikTok */
export const Root: React.FC = () => (
  <>
    <Composition id="LaunchEN" component={Launch} durationInFrames={DURATION} fps={30} width={1080} height={1920} defaultProps={{ copy: EN }} />
    <Composition id="LaunchPT" component={Launch} durationInFrames={DURATION} fps={30} width={1080} height={1920} defaultProps={{ copy: PT }} />
    <Still id="Cover" component={Cover} width={1080} height={1920} defaultProps={{ copy: EN }} />
    <Still id="CoverPT" component={Cover} width={1080} height={1920} defaultProps={{ copy: PT }} />
  </>
);
