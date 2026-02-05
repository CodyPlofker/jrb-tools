import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import {
  AnimationPlatform,
  AnimationSpecs,
  AnimationElement,
  CopyElement,
  TimelineEvent,
  Transition,
  ALL_FORMATS,
} from "@/types/animated-ads";

// Load API key from .env.local file directly as fallback
function getGeminiApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Fallback: read from .env.local directly
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

// Cache the API key on module load
const CACHED_GEMINI_KEY = getGeminiApiKey();

if (CACHED_GEMINI_KEY) {
  console.log(`[Animated Ads API] Gemini API key loaded (${CACHED_GEMINI_KEY.substring(0, 12)}...)`);
} else {
  console.error("[Animated Ads API] WARNING: No Gemini API key found!");
}

const TRAINING_DATA_DIR = path.join(process.cwd(), "training-data");

function readTrainingFile(relativePath: string): string {
  try {
    const fullPath = path.join(TRAINING_DATA_DIR, relativePath);
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

function getAnimationTrainingContent(platform: AnimationPlatform): string {
  const platformDir = `animated-ads/${platform}`;

  const bestPractices = readTrainingFile(`${platformDir}/best-practices.md`);
  const formatSpecs = readTrainingFile(`${platformDir}/format-specs.md`);
  const generalPrinciples = readTrainingFile("animated-ads/general/animation-principles.md");
  const transitionLibrary = readTrainingFile("animated-ads/general/transition-library.md");

  return `
## Animation Best Practices for ${platform.toUpperCase()}
${bestPractices || "No platform-specific best practices available yet."}

## Format Specifications
${formatSpecs || "No format specifications available yet."}

## General Animation Principles
${generalPrinciples || "Use smooth, professional animations that enhance the message without distracting from it."}

## Transition Library
${transitionLibrary || "Common transitions include fade, slide, zoom, and bounce effects."}
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, platform, formatId, additionalContext } = body;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!CACHED_GEMINI_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    const selectedFormat = ALL_FORMATS.find((f) => f.id === formatId);
    if (!selectedFormat) {
      return NextResponse.json({ error: "Invalid format ID" }, { status: 400 });
    }

    // Get training content
    const trainingContent = getAnimationTrainingContent(platform as AnimationPlatform);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(CACHED_GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

    const prompt = `You are an expert in converting static ads into animated video ads. Analyze this static ad image and create a detailed animation specification for ${platform} ${selectedFormat.name} format.

${trainingContent}

## Target Format Details
- Platform: ${platform}
- Format: ${selectedFormat.name}
- Dimensions: ${selectedFormat.dimensions.width}x${selectedFormat.dimensions.height}
- Aspect Ratio: ${selectedFormat.aspectRatio}
- Duration: ${selectedFormat.recommendedDuration} seconds (range: ${selectedFormat.minDuration}-${selectedFormat.maxDuration}s)
- Notes: ${selectedFormat.notes}

${additionalContext ? `## Additional Context from User\n${additionalContext}` : ""}

## Your Task
Analyze the static ad and provide a JSON response with the following structure:

{
  "sourceAnalysis": {
    "dominantColors": ["#hex1", "#hex2", "#hex3"],
    "layout": "description of the visual layout",
    "copyZones": [
      {
        "id": "unique-id",
        "zone": "headline|subheadline|cta|tagline|body",
        "text": "the actual text content",
        "bounds": { "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100 },
        "style": {
          "fontSize": number,
          "fontWeight": "normal|bold|semibold",
          "color": "#hex",
          "alignment": "left|center|right"
        }
      }
    ],
    "hasLogo": true/false,
    "hasCta": true/false
  },
  "elements": [
    {
      "id": "unique-id",
      "type": "image|text|shape|logo|cta|background",
      "content": "text content or description",
      "bounds": { "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100 },
      "style": {
        "fontFamily": "optional",
        "fontSize": number,
        "fontWeight": "optional",
        "color": "#hex",
        "backgroundColor": "optional #hex",
        "borderRadius": number
      },
      "animation": {
        "entry": "fade|slide-up|slide-down|slide-left|slide-right|zoom-in|zoom-out|bounce|pulse|none",
        "entryDuration": 0.5,
        "entryDelay": 0,
        "hold": number_or_null,
        "exit": "optional animation type",
        "exitDuration": 0.5,
        "easing": "linear|ease-in|ease-out|ease-in-out"
      },
      "zIndex": number
    }
  ],
  "timeline": [
    {
      "timestamp": number_in_seconds,
      "elementId": "element-id",
      "action": "enter|exit|transform|pulse|highlight",
      "properties": {
        "scale": optional,
        "opacity": optional,
        "x": optional,
        "y": optional,
        "rotation": optional,
        "color": optional
      },
      "duration": optional_number
    }
  ],
  "transitions": [
    {
      "id": "transition-id",
      "fromTimestamp": number,
      "toTimestamp": number,
      "type": "crossfade|wipe|slide|zoom|none",
      "direction": "optional left|right|up|down"
    }
  ],
  "background": {
    "type": "color|gradient|image",
    "value": "#hex or gradient CSS or 'source'"
  }
}

Important guidelines:
1. Create a compelling animation sequence that draws attention in the first 3 seconds
2. Use the timeline to orchestrate element animations smoothly
3. Ensure the CTA gets prominent treatment near the end
4. Keep animations professional and on-brand
5. Consider the platform's best practices (${platform === 'meta' ? 'grab attention quickly, mobile-first' : 'full-screen impact, clear messaging'})
6. All bounds values should be percentages (0-100) of the canvas
7. Create a logical flow: background → main visual → headline → supporting text → CTA

Return ONLY valid JSON, no markdown code blocks or explanations.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const responseText = result.response.text();

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    // Build the AnimationSpecs object
    const specs: AnimationSpecs = {
      id: `anim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      sourceImage: image,
      sourceAnalysis: analysisResult.sourceAnalysis || undefined,
      platform: platform as AnimationPlatform,
      format: selectedFormat,
      duration: selectedFormat.recommendedDuration,
      elements: (analysisResult.elements || []) as AnimationElement[],
      timeline: (analysisResult.timeline || []) as TimelineEvent[],
      transitions: (analysisResult.transitions || []) as Transition[],
      background: analysisResult.background || { type: "color", value: "#000000" },
    };

    return NextResponse.json({ success: true, specs });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image. Please try again." },
      { status: 500 }
    );
  }
}
