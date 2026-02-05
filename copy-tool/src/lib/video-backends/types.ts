import { AnimationSpecs, VideoResult } from "@/types/animated-ads";

export interface VideoBackendConfig {
  apiKey: string;
}

export interface VideoBackend {
  name: string;
  generateVideo(specs: AnimationSpecs): Promise<VideoResult>;
}

export type VideoBackendType = "creatomate" | "veo";
