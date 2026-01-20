import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const body = await request.json();
    const { persona, product, angle, format } = body;

    if (!persona || !product || !angle || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure copyPlacements exists and is an array
    const copyPlacements = format?.specs?.copyPlacements || [];
    if (copyPlacements.length === 0) {
      // Return default copy zones if none specified
      return NextResponse.json({
        copy: {
          "headline": "Copy zone not configured",
          "body": "Please add copy placements to this ad format"
        }
      });
    }

    const copyZones = copyPlacements.map((p: { zone: string; style: string; position: string }) =>
      `- ${p.zone} (${p.position}, style: ${p.style})`
    ).join("\n");

    const prompt = `You are a world-class direct response copywriter for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown.

Generate ad copy for the following brief:

PERSONA: ${persona.name}
- ${persona.overview || "No overview"}
- Key motivations: ${(persona.keyMotivations || []).join(", ") || "Not specified"}

PRODUCT: ${product.name} (${product.price})
- ${product.description || "No description"}
- Key benefits: ${(product.keyBenefits || []).join(", ") || "Not specified"}
- Best for: ${product.bestFor || "Everyone"}

ANGLE TO EMPHASIZE: ${angle}

AD FORMAT: ${format.name}
Copy zones needed:
${copyZones}

${format.specs.styleNotes ? `Style notes: ${format.specs.styleNotes}` : ""}

Write compelling, conversion-focused copy for each zone. The copy should:
1. Speak directly to the ${persona.name} persona's motivations
2. Lead with the "${angle}" angle
3. Highlight ${product.name}'s benefits naturally
4. Use Jones Road's voice: confident, honest, no-BS, warm but direct
5. Avoid: excessive emojis, clickbait, fake urgency, "clean beauty" clichés

Return ONLY a JSON object with zone names as keys and copy as values. Example:
{"headline": "Your headline here", "body": "Body copy here"}

No explanation, just the JSON.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON response
    let copy: { [zone: string]: string } = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        copy = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", textContent.text);
      // If parsing fails, try to create copy from the raw response
      const zones = copyPlacements.map((p: { zone: string }) => p.zone);
      if (zones.length > 0) {
        copy[zones[0]] = textContent.text.slice(0, 200);
      }
    }

    return NextResponse.json({ copy });
  } catch (error) {
    console.error("Error generating brief copy:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate copy: ${errorMessage}` },
      { status: 500 }
    );
  }
}
