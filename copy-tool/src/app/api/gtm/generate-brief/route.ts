import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { PMCDocument, CreativeBrief } from "@/types/gtm";

// Load API key from .env.local file directly as fallback
function getApiKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback: read from .env.local directly
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey, timeout: 120000 });

    const body = await request.json();
    const { rawNotes, tier, productName, launchDate } = body;

    if (!rawNotes) {
      return NextResponse.json(
        { error: "Missing raw notes" },
        { status: 400 }
      );
    }

    // Load training data
    let pmcTemplate = "";
    let brandVoice = "";

    try {
      pmcTemplate = fs.readFileSync(
        path.join(process.cwd(), "training-data/gtm/pmc-template.md"),
        "utf-8"
      );
    } catch {
      console.log("PMC template not found, using defaults");
    }

    try {
      brandVoice = fs.readFileSync(
        path.join(process.cwd(), "training-data/brand/brand-voice-guide.md"),
        "utf-8"
      );
    } catch {
      console.log("Brand voice guide not found");
    }

    const prompt = `You are a senior marketing strategist for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown.

Based on the following raw notes from a product development kickoff and brainstorm meeting, generate two documents:

1. PMC (Positioning, Messaging, Copy) Document - the foundational copy document
2. Creative Brief - the launch strategy overview

RAW NOTES FROM MEETING:
${rawNotes}

PRODUCT NAME: ${productName || "TBD"}
LAUNCH DATE: ${launchDate || "TBD"}
LAUNCH TIER: ${tier || "tier-2"}

${pmcTemplate ? `PMC TEMPLATE REFERENCE:\n${pmcTemplate}\n` : ""}

${brandVoice ? `BRAND VOICE GUIDELINES:\n${brandVoice}\n` : ""}

Generate the documents following these guidelines:
- Use Jones Road's voice: confident, honest, no-BS, warm but direct
- Focus on real benefits, not marketing fluff
- Include Bobbi's perspective with authentic-sounding quotes
- Think about who this product is really for

Return a JSON object with this exact structure:
{
  "pmc": {
    "tagline": "Short memorable phrase, 2-5 words",
    "whatItIs": "Product description, 2-3 sentences",
    "whyWeLoveIt": "Emotional benefit focus, 2-3 sentences",
    "howItsDifferent": "Differentiation, 2-3 sentences",
    "howToUse": "Application instructions",
    "whoItsFor": "Target customer description",
    "bobbisQuotes": [
      {"context": "General", "quote": "A quote from Bobbi about the product..."},
      {"context": "Specific use case", "quote": "Another quote..."}
    ]
  },
  "creativeBrief": {
    "productName": "${productName || "Product Name"}",
    "launchDate": "${launchDate || ""}",
    "tier": "${tier || "tier-2"}",
    "launchOverview": "2-3 paragraphs about the product and launch context",
    "keyBenefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
    "targetDemographic": "Who this product is for and why they'll love it",
    "creativeConsiderations": "Visual direction, photography notes, what to emphasize",
    "keyDetails": "Any important details, restrictions, or considerations"
  }
}

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no \`\`\` wrapping.
Do NOT include unescaped quotes inside string values - escape them with backslash or rephrase.
Do NOT end quotes with signatures like "Xx Bobbi" - just include the quote text itself.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON response
    let result: { pmc: PMCDocument; creativeBrief: CreativeBrief };
    try {
      // Remove markdown code blocks if present
      let cleanedText = textContent.text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Fix common JSON issues: unescaped quotes in strings
        let jsonStr = jsonMatch[0];
        // Try to parse, if it fails, attempt to fix common issues
        try {
          result = JSON.parse(jsonStr);
        } catch {
          // Try fixing unescaped quotes within quote strings (e.g., Xx Bobbi" should be Xx Bobbi)
          jsonStr = jsonStr.replace(/"([^"]*)" Xx Bobbi/g, '$1 Xx Bobbi');
          result = JSON.parse(jsonStr);
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", textContent.text);
      throw new Error("Failed to parse AI response");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating brief:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate brief: ${errorMessage}` },
      { status: 500 }
    );
  }
}
