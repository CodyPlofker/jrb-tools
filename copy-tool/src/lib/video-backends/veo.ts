import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnimationSpecs, VideoResult } from "@/types/animated-ads";
import { VideoBackend, VideoBackendConfig } from "./types";

/**
 * Veo Video Backend
 *
 * Uses Google's Veo 2 API for AI-generated video from images.
 * This uses the image-to-video capability to animate static ads.
 */
export class VeoBackend implements VideoBackend {
  name = "veo";
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(config: VideoBackendConfig) {
    this.apiKey = config.apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async generateVideo(specs: AnimationSpecs): Promise<VideoResult> {
    try {
      console.log("[Veo] Starting video generation...");

      // Build prompt for video generation
      const videoPrompt = this.buildVideoPrompt(specs);
      console.log("[Veo] Video prompt:", videoPrompt.substring(0, 200) + "...");

      // Extract base64 image data
      const imageData = specs.sourceImage;
      if (!imageData || !imageData.startsWith("data:")) {
        return {
          success: false,
          error: "No source image provided for Veo video generation",
        };
      }

      // Try using the Gemini API with video generation model
      const result = await this.generateWithVeo(imageData, videoPrompt, specs);
      return result;
    } catch (error) {
      console.error("Veo generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check for specific error types
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        return {
          success: false,
          error: "Veo video generation model not available. Please use Creatomate instead.",
        };
      }

      return {
        success: false,
        error: `Veo error: ${errorMessage}`,
      };
    }
  }

  private async generateWithVeo(
    imageData: string,
    prompt: string,
    specs: AnimationSpecs
  ): Promise<VideoResult> {
    // Extract base64 and mime type from data URL
    const base64Match = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!base64Match) {
      return {
        success: false,
        error: "Invalid image format",
      };
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    try {
      // Try using imagen-3.0-generate-001 for image generation first
      // Then attempt video generation with veo model
      const model = this.genAI.getGenerativeModel({
        model: "veo-2.0-generate-001",
        generationConfig: {
          // @ts-expect-error - Veo-specific config
          responseModalities: ["VIDEO"],
        },
      });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `Generate a ${specs.duration}-second animated video from this image. ${prompt}`,
        },
      ]);

      const response = result.response;
      console.log("[Veo] Response received:", JSON.stringify(response).substring(0, 500));

      // Check if we got video content back
      // @ts-expect-error - Video response structure may vary
      const videoData = response.candidates?.[0]?.content?.parts?.[0]?.videoMetadata;

      if (videoData?.fileUri) {
        return {
          success: true,
          url: videoData.fileUri,
          downloadUrl: videoData.fileUri,
          format: "mp4",
          duration: specs.duration,
        };
      }

      // If no video data, try to extract any URL from the response
      const responseText = response.text?.() || "";
      console.log("[Veo] Response text:", responseText.substring(0, 200));

      // Check if response indicates video generation isn't supported
      if (responseText.toLowerCase().includes("cannot generate video") ||
          responseText.toLowerCase().includes("not supported")) {
        return {
          success: false,
          error: "Veo video generation is not available for this API key. Please use Creatomate instead.",
        };
      }

      return {
        success: false,
        error: "Veo did not return video content. The API may require special access. Try using Creatomate instead.",
      };

    } catch (error) {
      console.error("[Veo] API Error:", error);

      // Try alternative approach using the REST API directly
      return await this.tryRestApiApproach(base64Data, mimeType, prompt, specs);
    }
  }

  private async tryRestApiApproach(
    base64Data: string,
    mimeType: string,
    prompt: string,
    specs: AnimationSpecs
  ): Promise<VideoResult> {
    try {
      // Try using Google's AI Platform / Vertex AI style endpoint
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:generateContent?key=${this.apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: `Create a ${specs.duration}-second animated video ad from this image. ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            videoDuration: Math.min(specs.duration, 8), // Veo max is ~8 seconds
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("[Veo REST] Error:", response.status, errorText);

        if (response.status === 404) {
          return {
            success: false,
            error: "Veo 2 model not found. This API key may not have access to video generation. Please use Creatomate instead.",
          };
        }

        return {
          success: false,
          error: `Veo API error: ${response.status}. Please use Creatomate for video generation.`,
        };
      }

      const result = await response.json();
      console.log("[Veo REST] Result:", JSON.stringify(result).substring(0, 500));

      // Extract video URL from response
      const videoUrl = result.candidates?.[0]?.content?.parts?.[0]?.fileUri ||
                       result.candidates?.[0]?.content?.parts?.[0]?.videoUri;

      if (videoUrl) {
        return {
          success: true,
          url: videoUrl,
          downloadUrl: videoUrl,
          format: "mp4",
          duration: specs.duration,
        };
      }

      return {
        success: false,
        error: "Veo did not return a video. Please use Creatomate instead.",
      };

    } catch (error) {
      console.error("[Veo REST] Error:", error);
      return {
        success: false,
        error: "Veo video generation failed. Please use Creatomate for reliable video generation.",
      };
    }
  }

  private buildVideoPrompt(specs: AnimationSpecs): string {
    const platform = specs.platform;
    const format = specs.format;
    const elements = specs.elements;

    let prompt = `Create a professional ${platform} advertisement video. The video should be ${format.aspectRatio} aspect ratio.`;

    // Add text content to animate
    const textElements = elements.filter(e => e.type === "text" || e.type === "cta");
    if (textElements.length > 0) {
      prompt += "\n\nAnimate the following text elements with smooth, attention-grabbing motion:";
      for (const element of textElements) {
        if (element.content) {
          prompt += `\n- "${element.content}"`;
        }
      }
    }

    // Add style guidance
    prompt += "\n\nStyle: Professional, clean, modern advertising aesthetic. Smooth animations. High production value.";

    // Add color guidance from analysis
    if (specs.sourceAnalysis?.dominantColors) {
      prompt += `\nMaintain the color palette: ${specs.sourceAnalysis.dominantColors.join(", ")}`;
    }

    // Platform-specific guidance
    if (platform === "meta") {
      prompt += "\nOptimize for mobile viewing. Grab attention in the first 2 seconds.";
    } else if (platform === "applovin") {
      prompt += "\nCreate an engaging, game-like feel. Clear call-to-action.";
    }

    return prompt;
  }
}
