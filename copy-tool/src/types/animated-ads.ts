// ============================================
// ANIMATED ADS - TYPE DEFINITIONS
// ============================================

// Supported platforms
export type AnimationPlatform = 'applovin' | 'meta';

// Animation types
export type AnimationType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'bounce'
  | 'pulse'
  | 'rotate'
  | 'none';

// Video generation backends
export type VideoBackend = 'creatomate' | 'veo';

// ============================================
// PLATFORM FORMAT CONFIGURATIONS
// ============================================

export interface PlatformFormat {
  id: string;
  name: string;
  platform: AnimationPlatform;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  minDuration: number;
  maxDuration: number;
  recommendedDuration: number;
  notes: string;
}

export const APPLOVIN_FORMATS: PlatformFormat[] = [
  {
    id: 'applovin-interstitial',
    name: 'Interstitial',
    platform: 'applovin',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    minDuration: 15,
    maxDuration: 30,
    recommendedDuration: 15,
    notes: 'Full screen portrait ad',
  },
  {
    id: 'applovin-banner-large',
    name: 'Banner (Large)',
    platform: 'applovin',
    dimensions: { width: 728, height: 90 },
    aspectRatio: '728:90',
    minDuration: 6,
    maxDuration: 15,
    recommendedDuration: 6,
    notes: 'Loop animation recommended',
  },
  {
    id: 'applovin-banner-small',
    name: 'Banner (Small)',
    platform: 'applovin',
    dimensions: { width: 320, height: 50 },
    aspectRatio: '320:50',
    minDuration: 6,
    maxDuration: 15,
    recommendedDuration: 6,
    notes: 'Loop animation recommended',
  },
  {
    id: 'applovin-rewarded',
    name: 'Rewarded Video',
    platform: 'applovin',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    minDuration: 15,
    maxDuration: 30,
    recommendedDuration: 30,
    notes: 'Skip button appears after 5s',
  },
  {
    id: 'applovin-native',
    name: 'Native',
    platform: 'applovin',
    dimensions: { width: 1200, height: 627 },
    aspectRatio: '1.91:1',
    minDuration: 6,
    maxDuration: 15,
    recommendedDuration: 10,
    notes: 'Fits within content feed',
  },
];

export const META_FORMATS: PlatformFormat[] = [
  {
    id: 'meta-feed',
    name: 'Feed (4:5)',
    platform: 'meta',
    dimensions: { width: 1080, height: 1350 },
    aspectRatio: '4:5',
    minDuration: 5,
    maxDuration: 60,
    recommendedDuration: 15,
    notes: 'Grab attention in first 3 seconds',
  },
  {
    id: 'meta-stories',
    name: 'Stories',
    platform: 'meta',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    minDuration: 5,
    maxDuration: 15,
    recommendedDuration: 15,
    notes: 'Full screen vertical',
  },
  {
    id: 'meta-reels',
    name: 'Reels',
    platform: 'meta',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    minDuration: 15,
    maxDuration: 60,
    recommendedDuration: 30,
    notes: 'Native feel, engaging content',
  },
  {
    id: 'meta-square',
    name: 'Square (1:1)',
    platform: 'meta',
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: '1:1',
    minDuration: 5,
    maxDuration: 60,
    recommendedDuration: 15,
    notes: 'Universal format',
  },
];

export const ALL_FORMATS = [...APPLOVIN_FORMATS, ...META_FORMATS];

export function getFormatsForPlatform(platform: AnimationPlatform): PlatformFormat[] {
  return platform === 'applovin' ? APPLOVIN_FORMATS : META_FORMATS;
}

// ============================================
// ANIMATION ELEMENT TYPES
// ============================================

export type ElementType = 'image' | 'text' | 'shape' | 'logo' | 'cta' | 'background';

export interface ElementBounds {
  x: number;       // X position (0-100% of canvas)
  y: number;       // Y position (0-100% of canvas)
  width: number;   // Width (0-100% of canvas)
  height: number;  // Height (0-100% of canvas)
}

export interface ElementAnimation {
  entry: AnimationType;
  entryDuration: number;    // Seconds
  entryDelay: number;       // Seconds from start
  hold?: number;            // Optional hold time before exit
  exit?: AnimationType;
  exitDuration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnimationElement {
  id: string;
  type: ElementType;
  content?: string;         // Text content or image URL
  bounds: ElementBounds;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
  };
  animation: ElementAnimation;
  zIndex: number;
}

// ============================================
// COPY ELEMENTS (extracted from static ad)
// ============================================

export interface CopyElement {
  id: string;
  zone: string;             // e.g., "headline", "subheadline", "cta"
  text: string;
  bounds: ElementBounds;
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
}

// ============================================
// TIMELINE & TRANSITIONS
// ============================================

export type TimelineAction = 'enter' | 'exit' | 'transform' | 'pulse' | 'highlight';

export interface TimelineEvent {
  timestamp: number;        // Seconds from start
  elementId: string;
  action: TimelineAction;
  properties?: {
    scale?: number;
    opacity?: number;
    x?: number;
    y?: number;
    rotation?: number;
    color?: string;
  };
  duration?: number;
}

export interface Transition {
  id: string;
  fromTimestamp: number;
  toTimestamp: number;
  type: 'crossfade' | 'wipe' | 'slide' | 'zoom' | 'none';
  direction?: 'left' | 'right' | 'up' | 'down';
}

// ============================================
// MAIN ANIMATION SPECS INTERFACE
// ============================================

export interface AnimationSpecs {
  id: string;
  createdAt: string;

  // Source
  sourceImage: string;              // Original static ad URL/base64
  sourceAnalysis?: {
    dominantColors: string[];
    layout: string;
    copyZones: CopyElement[];
    hasLogo: boolean;
    hasCta: boolean;
  };

  // Output config
  platform: AnimationPlatform;
  format: PlatformFormat;
  duration: number;                 // Final video duration in seconds

  // Animation content
  elements: AnimationElement[];
  timeline: TimelineEvent[];
  transitions: Transition[];

  // Background
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string;                  // Color hex, gradient CSS, or image URL
  };

  // Audio (optional)
  audio?: {
    url?: string;
    volume?: number;
    fadeIn?: boolean;
    fadeOut?: boolean;
  };
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface AnalyzeRequest {
  image: string;                    // Base64 encoded image
  platform: AnimationPlatform;
  formatId: string;
  additionalContext?: string;       // User notes for AI
}

export interface AnalyzeResponse {
  success: boolean;
  specs?: AnimationSpecs;
  error?: string;
}

export interface GenerateRequest {
  specs: AnimationSpecs;
  backend: VideoBackend;
}

export interface GenerateResponse {
  success: boolean;
  videoUrl?: string;
  downloadUrl?: string;
  duration?: number;
  format?: string;
  error?: string;
}

// ============================================
// VIDEO BACKEND RESULT
// ============================================

export interface VideoResult {
  success: boolean;
  url?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  format?: string;
  error?: string;
}
