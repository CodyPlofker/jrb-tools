import { AnimationSpecs, VideoResult, VideoBackend as VideoBackendType } from "@/types/animated-ads";
import { VideoBackend, VideoBackendConfig } from "./types";
import { CreatomateBackend } from "./creatomate";
import { VeoBackend } from "./veo";
import fs from "fs";
import path from "path";

// API key loaders
function getCreatomateApiKey(): string | undefined {
  if (process.env.CREATOMATE_API_KEY) {
    return process.env.CREATOMATE_API_KEY;
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/CREATOMATE_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

function getGeminiApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

// Cached API keys
const CACHED_CREATOMATE_KEY = getCreatomateApiKey();
const CACHED_GEMINI_KEY = getGeminiApiKey();

// Log API key status on module load
if (CACHED_CREATOMATE_KEY) {
  console.log(`[Video Backends] Creatomate API key loaded (${CACHED_CREATOMATE_KEY.substring(0, 8)}...)`);
} else {
  console.warn("[Video Backends] No Creatomate API key found");
}

if (CACHED_GEMINI_KEY) {
  console.log(`[Video Backends] Gemini API key loaded for Veo (${CACHED_GEMINI_KEY.substring(0, 8)}...)`);
} else {
  console.warn("[Video Backends] No Gemini API key found for Veo");
}

/**
 * Create a video backend instance
 */
function createBackend(type: VideoBackendType): VideoBackend | null {
  switch (type) {
    case "creatomate":
      if (!CACHED_CREATOMATE_KEY) {
        return null;
      }
      return new CreatomateBackend({ apiKey: CACHED_CREATOMATE_KEY });

    case "veo":
      if (!CACHED_GEMINI_KEY) {
        return null;
      }
      return new VeoBackend({ apiKey: CACHED_GEMINI_KEY });

    default:
      return null;
  }
}

/**
 * Generate an animated video from animation specs
 */
export async function generateAnimatedVideo(
  specs: AnimationSpecs,
  backendType: VideoBackendType
): Promise<VideoResult> {
  const backend = createBackend(backendType);

  if (!backend) {
    const keyName = backendType === "creatomate" ? "CREATOMATE_API_KEY" : "GEMINI_API_KEY";
    return {
      success: false,
      error: `${backendType} backend not available. Please add ${keyName} to your .env.local file.`,
    };
  }

  console.log(`[Video Generation] Starting ${backendType} generation for specs ${specs.id}`);
  const startTime = Date.now();

  const result = await backend.generateVideo(specs);

  const duration = Date.now() - startTime;
  console.log(`[Video Generation] ${backendType} completed in ${duration}ms, success: ${result.success}`);

  return result;
}

/**
 * Check which backends are available
 */
export function getAvailableBackends(): { type: VideoBackendType; available: boolean; reason?: string }[] {
  return [
    {
      type: "creatomate",
      available: !!CACHED_CREATOMATE_KEY,
      reason: CACHED_CREATOMATE_KEY ? undefined : "CREATOMATE_API_KEY not configured",
    },
    {
      type: "veo",
      available: !!CACHED_GEMINI_KEY,
      reason: CACHED_GEMINI_KEY ? undefined : "GEMINI_API_KEY not configured (also used for Veo)",
    },
  ];
}

/**
 * Get the recommended backend based on availability and specs
 */
export function getRecommendedBackend(specs: AnimationSpecs): VideoBackendType {
  // Creatomate is recommended for precise, spec-based generation
  if (CACHED_CREATOMATE_KEY) {
    return "creatomate";
  }

  // Veo is a fallback for AI-creative generation
  if (CACHED_GEMINI_KEY) {
    return "veo";
  }

  // Default to creatomate (will show error about missing key)
  return "creatomate";
}

// Re-export types
export type { VideoBackend, VideoBackendConfig } from "./types";
