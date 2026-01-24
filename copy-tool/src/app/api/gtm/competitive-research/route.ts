import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { productCategory, competitorBrands, specificProducts, researchFocus, productName } =
      await request.json();

    // Build the research prompt
    const prompt = `You are a competitive market research analyst for Jones Road Beauty, a clean beauty brand founded by Bobbi Brown.

RESEARCH REQUEST:
- Product Category: ${productCategory}
- Our Product: ${productName || productCategory}
- Competitor Brands to Research: ${competitorBrands?.join(", ") || "Major competitors in this category"}
- Specific Products: ${specificProducts?.join("\n") || "Top products in this category"}
- Research Focus: ${researchFocus || "General competitive analysis"}

Based on your knowledge of the beauty industry, provide a comprehensive competitive analysis. For each competitor product, analyze:

1. Brand positioning and messaging
2. Key product claims
3. Price point (if known)
4. What customers love (5-star review themes)
5. What customers complain about (1-star review themes)
6. Common sentiment patterns

Then provide:
- Overall market summary
- Positioning gaps and opportunities for Jones Road
- Recommended differentiation strategy

IMPORTANT: Focus on REAL competitor positioning and common customer sentiment patterns you know from your training data. Be specific about actual brands and products in the ${productCategory} category.

Return your analysis in this JSON format:
{
  "competitors": [
    {
      "id": "competitor-1",
      "brand": "Brand Name",
      "productName": "Product Name",
      "price": "$XX",
      "positioning": "How they position the product",
      "keyMessages": ["message 1", "message 2", "message 3"]
    }
  ],
  "reviewAnalyses": [
    {
      "productId": "competitor-1",
      "source": "general",
      "fiveStarThemes": ["theme 1", "theme 2", "theme 3"],
      "oneStarThemes": ["theme 1", "theme 2", "theme 3"],
      "commonPraises": ["praise 1", "praise 2"],
      "commonComplaints": ["complaint 1", "complaint 2"],
      "notableQuotes": [
        {"rating": 5, "quote": "Example positive quote"},
        {"rating": 1, "quote": "Example negative quote"}
      ]
    }
  ],
  "marketSummary": "2-3 paragraph summary of the competitive landscape",
  "positioningGaps": ["gap 1", "gap 2", "gap 3"],
  "differentiation": "Recommended differentiation strategy for Jones Road"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON from the response
    let research;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse AI response:", textContent.text);
      throw new Error("Failed to parse competitive research");
    }

    // Add timestamp
    research.generatedAt = new Date().toISOString();

    return NextResponse.json({ research });
  } catch (error) {
    console.error("Competitive research error:", error);
    return NextResponse.json(
      { error: "Failed to run competitive research" },
      { status: 500 }
    );
  }
}
