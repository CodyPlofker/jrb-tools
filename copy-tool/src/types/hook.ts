export type HookPOV = "brand" | "creator";
export type HookType = "paid" | "organic";
export type HookChannel = "meta" | "tiktok" | "youtube" | "instagram";
export type AwarenessLevel = "unaware" | "problem-aware" | "solution-aware" | "product-aware" | "most-aware";

export interface HookFramework {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  pattern: string;
  examples: string[];
}

export interface GeneratedHook {
  id: string;
  text: string;
  framework: string;
  frameworkName: string;
  pov: HookPOV;
  type: HookType;
  channel: HookChannel;
  awarenessLevel: AwarenessLevel;
  product?: string;
  persona?: string;
  angle?: string;
  createdAt: string;
}

export interface SavedHook extends GeneratedHook {
  savedAt: string;
  notes?: string;
  tags?: string[];
}

export interface HookGenerationRequest {
  // Freeform
  brief?: string;

  // Structured
  product?: string;
  persona?: string;
  angle?: string;

  // Filters
  pov?: HookPOV;
  type?: HookType;
  channel?: HookChannel;
  awarenessLevel?: AwarenessLevel;

  // Generation options
  frameworks?: string[]; // Specific frameworks to use, or empty for all
  count?: number; // How many hooks to generate (default 5)
}

export interface HookLibrary {
  hooks: SavedHook[];
  updatedAt: string;
}
