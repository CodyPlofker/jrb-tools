import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { HookGenerationRequest, GeneratedHook, HookPOV, HookType, HookChannel, AwarenessLevel } from "@/types/hook";

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
      return match[1].trim();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

const CACHED_API_KEY = getApiKey();
const TRAINING_DATA_DIR = path.join(process.cwd(), "training-data");

function readTrainingFile(relativePath: string): string {
  try {
    const fullPath = path.join(TRAINING_DATA_DIR, relativePath);
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

function getPersonaContent(personaName: string): string {
  const personaMap: Record<string, string> = {
    "The Dedicated Educator": "personas/the-dedicated-educator.md",
    "The Ageless Matriarch": "personas/the-ageless-matriarch.md",
    "The High-Powered Executive": "personas/the-high-powered-executive.md",
    "The Wellness & Healthcare Practitioner": "personas/the-wellness-healthcare-practitioner.md",
    "The Busy Suburban Super-Mom": "personas/the-busy-suburban-supermom.md",
    "The Creative Entrepreneur": "personas/the-creative-entrepreneur.md",
  };

  for (const [name, filePath] of Object.entries(personaMap)) {
    if (personaName?.toLowerCase().includes(name.toLowerCase().replace("the ", ""))) {
      return readTrainingFile(filePath);
    }
  }

  return "";
}

const HOOK_FRAMEWORKS = [
  {
    id: "identity",
    name: "Identity Signal",
    description: "Make the viewer feel seen in 1 sentence by calling out something only they would know.",
    pattern: "Call out a specific behavior, situation, or feeling that your target audience experiences.",
  },
  {
    id: "expectation",
    name: "Expectation Violation",
    description: "Break their prediction loop by starting normal, ending weird.",
    pattern: "Start with something familiar, then pivot to something unexpected.",
  },
  {
    id: "avoidable-loss",
    name: "Avoidable Loss",
    description: "Go for avoidable pain, not doom and gloom: wasted money, wasted time, wasted effort.",
    pattern: "Highlight something they might be doing wrong that's costing them unnecessarily.",
  },
  {
    id: "evidence",
    name: "Evidence + Specificity",
    description: "Receipts will always beat something cute. The more specific, the more credible.",
    pattern: "Lead with a specific number, result, or proof point.",
  },
  {
    id: "question",
    name: "Question Hook",
    description: "A provocative question that creates curiosity.",
    pattern: "Ask a question that the viewer can't help but want answered.",
  },
  {
    id: "story",
    name: "Story/Scene",
    description: "Drop the viewer into a specific moment or scene.",
    pattern: "Start mid-action or mid-thought to create immediate engagement.",
  },
  {
    id: "contrarian",
    name: "Contrarian",
    description: "Challenge conventional wisdom or common beliefs.",
    pattern: "State something that goes against what people typically believe.",
  },
  {
    id: "pattern-interrupt",
    name: "Pattern Interrupt",
    description: "Say something unexpected that makes the viewer stop scrolling.",
    pattern: "Start with something that doesn't fit the expected pattern.",
  },
];

function buildSystemPrompt(request: HookGenerationRequest): string {
  // Load training data
  const brandVoiceGuide = readTrainingFile("brand/brand-voice-guide.md") || readTrainingFile("brand-voice/tone-guidelines.md");
  const hookPrinciples = readTrainingFile("hooks/hook-principles.md");
  const hookFrameworks = readTrainingFile("hooks/hook-frameworks.md");
  const hookExamples = readTrainingFile("hooks/hook-examples.md");

  // Load persona if specified
  const personaContent = request.persona ? getPersonaContent(request.persona) : "";

  // Determine which frameworks to use
  const frameworksToUse = request.frameworks && request.frameworks.length > 0
    ? HOOK_FRAMEWORKS.filter(f => request.frameworks!.includes(f.id))
    : HOOK_FRAMEWORKS;

  const frameworkDescriptions = frameworksToUse.map(f =>
    `### ${f.name}\n${f.description}\nPattern: ${f.pattern}`
  ).join("\n\n");

  return `You are an expert video hook copywriter for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown. Your job is to generate scroll-stopping opening lines for video content (ads and organic).

## WHAT IS A HOOK?
A hook is the opening line of a video - the first 1-3 seconds that determines whether someone keeps watching or scrolls past. Great hooks create curiosity, open loops, and make viewers NEED to know more.

## BRAND VOICE
${brandVoiceGuide || "Jones Road is confident, warm, and real. We don't oversell or use hyperbole. We speak like a knowledgeable friend, not a salesperson."}

## HOOK PRINCIPLES
${hookPrinciples || "Create curiosity gaps. Open loops. Be specific. Trigger emotion. Break patterns."}

## HOOK FRAMEWORKS TO USE
${frameworkDescriptions}

${hookExamples ? `## EXAMPLE HOOKS FOR REFERENCE\n${hookExamples}` : ""}

${personaContent ? `## TARGET PERSONA\n${personaContent}` : ""}

## YOUR TASK
Generate video hooks based on the user's brief. For each hook:
1. Use a different framework from the list provided
2. Make it feel natural and conversational
3. Keep it under 15 words ideally (punchy)
4. Create genuine curiosity - don't be clickbait
5. Match the Jones Road voice - confident but not arrogant, helpful not salesy

${request.pov === "brand" ? "Write from the BRAND perspective - authoritative, knowledgeable, behind-the-scenes." : ""}
${request.pov === "creator" ? "Write from a CREATOR perspective - personal discovery, genuine enthusiasm, 'I found this thing'." : ""}
${request.type === "paid" ? "These are for PAID ADS - can be more direct about product benefits." : ""}
${request.type === "organic" ? "These are for ORGANIC content - should feel native and authentic." : ""}
${request.awarenessLevel ? `Target awareness level: ${request.awarenessLevel.toUpperCase()} - adjust the hook angle accordingly.` : ""}

Return your hooks as a JSON array with this exact structure:
[
  {
    "text": "The hook text",
    "framework": "framework-id",
    "frameworkName": "Framework Name"
  }
]

Return ONLY the JSON array, no other text.`;
}

export async function POST(request: NextRequest) {
  try {
    if (!CACHED_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const body: HookGenerationRequest = await request.json();

    // Build the user prompt
    let userPrompt = "Generate 5 video hooks";

    if (body.brief && body.product) {
      userPrompt += ` for ${body.product} based on this brief:\n\n${body.brief}`;
    } else if (body.brief) {
      userPrompt += ` based on this brief:\n\n${body.brief}`;
    } else if (body.product) {
      userPrompt += ` for ${body.product}`;
    } else {
      return NextResponse.json(
        { error: "Please provide a brief or select a product" },
        { status: 400 }
      );
    }

    if (body.persona) {
      userPrompt += `\n\nTarget persona: ${body.persona}`;
    }
    if (body.angle) {
      userPrompt += `\n\nAngle/direction: ${body.angle}`;
    }

    const anthropic = new Anthropic({ apiKey: CACHED_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: buildSystemPrompt(body),
      messages: [{ role: "user", content: userPrompt }],
    });

    // Parse the response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    let hooksData;
    try {
      // Try to parse directly
      hooksData = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        hooksData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find array in response
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          hooksData = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error("Could not parse hooks from response");
        }
      }
    }

    // Transform to our format
    const hooks: GeneratedHook[] = hooksData.map((hook: { text: string; framework: string; frameworkName: string }, index: number) => ({
      id: `hook-${Date.now()}-${index}`,
      text: hook.text,
      framework: hook.framework,
      frameworkName: hook.frameworkName,
      pov: body.pov || "brand" as HookPOV,
      type: body.type || "paid" as HookType,
      channel: body.channel || "meta" as HookChannel,
      awarenessLevel: body.awarenessLevel || "solution-aware" as AwarenessLevel,
      product: body.product,
      persona: body.persona,
      angle: body.angle,
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({ hooks });
  } catch (error) {
    console.error("Error generating hooks:", error);
    return NextResponse.json(
      { error: "Failed to generate hooks" },
      { status: 500 }
    );
  }
}
