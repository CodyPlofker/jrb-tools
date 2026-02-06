import { AnimationSpecs, VideoResult, AnimationElement, TimelineEvent } from "@/types/animated-ads";
import { VideoBackend, VideoBackendConfig } from "./types";

interface CreatomateElement {
  id?: string;
  type: string;
  track?: number;
  time?: number;
  duration?: number;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  x_anchor?: string;
  y_anchor?: string;
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  text?: string;
  source?: string;
  fit?: string;
  animations?: CreatomateAnimation[];
  [key: string]: unknown;
}

interface CreatomateAnimation {
  type?: string;
  time?: string | number;
  duration?: number;
  easing?: string;
  fade?: boolean;
  x_anchor?: string;
  y_anchor?: string;
  scope?: string;
  start_scale?: string;
  end_scale?: string;
  [key: string]: unknown;
}

interface CreatomateOutput {
  format: string;
  width: number;
  height: number;
  frame_rate: number;
  elements: CreatomateElement[];
}

export class CreatomateBackend implements VideoBackend {
  name = "creatomate";
  private apiKey: string;
  private apiUrl = "https://api.creatomate.com/v1/renders";

  constructor(config: VideoBackendConfig) {
    this.apiKey = config.apiKey;
  }

  async generateVideo(specs: AnimationSpecs): Promise<VideoResult> {
    try {
      const creatomateOutput = this.convertToCreatomateFormat(specs);

      // Creatomate requires a "source" object with the template JSON
      const sourceTemplate = {
        output_format: "mp4",
        width: specs.format.dimensions.width,
        height: specs.format.dimensions.height,
        frame_rate: 30,
        duration: specs.duration,
        elements: creatomateOutput.elements,
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: sourceTemplate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Creatomate] API error:", response.status, errorText);

        // Provide helpful error messages for common issues
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: `Creatomate authentication failed. Please verify your API key is correct.`,
          };
        }

        return {
          success: false,
          error: `Creatomate API error: ${response.status} - ${errorText.substring(0, 200)}`,
        };
      }

      const result = await response.json();

      // Creatomate returns an array of renders
      const render = Array.isArray(result) ? result[0] : result;

      if (render.status === "failed") {
        return {
          success: false,
          error: render.error_message || "Render failed",
        };
      }

      // Poll for completion if render is still processing
      if (render.status === "planned" || render.status === "rendering") {
        return await this.pollForCompletion(render.id);
      }

      return {
        success: true,
        url: render.url,
        downloadUrl: render.url,
        thumbnailUrl: render.snapshot_url,
        duration: specs.duration,
        format: "mp4",
      };
    } catch (error) {
      console.error("Creatomate generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async pollForCompletion(renderId: string, maxAttempts = 60): Promise<VideoResult> {
    const pollUrl = `${this.apiUrl}/${renderId}`;
    let lastError = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const response = await fetch(pollUrl, {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          lastError = `Poll request failed: ${response.status}`;
          console.error(`[Creatomate] Polling attempt ${attempt + 1}/${maxAttempts}: ${lastError}`);

          // For auth errors, fail fast instead of looping 60 times
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              error: `Creatomate API authentication failed (${response.status}). Check your API key.`,
            };
          }
          continue;
        }

        const render = await response.json();
        console.log(`[Creatomate] Polling attempt ${attempt + 1}: status = ${render.status}`);

        if (render.status === "succeeded") {
          return {
            success: true,
            url: render.url,
            downloadUrl: render.url,
            thumbnailUrl: render.snapshot_url,
            format: "mp4",
          };
        }

        if (render.status === "failed") {
          return {
            success: false,
            error: render.error_message || "Render failed",
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Creatomate] Polling error: ${lastError}`);
      }
    }

    return {
      success: false,
      error: `Render timed out after ${maxAttempts * 2} seconds. Last error: ${lastError}`,
    };
  }

  private convertToCreatomateFormat(specs: AnimationSpecs): CreatomateOutput {
    const elements: CreatomateElement[] = [];
    let track = 1;

    // Add background - use dominant color from analysis if available, or default
    const bgColor = specs.sourceAnalysis?.dominantColors?.[0] || specs.background?.value || "#1a1a1a";

    elements.push({
      type: "shape",
      track: track++,
      time: 0,
      duration: specs.duration,
      x: "50%",
      y: "50%",
      width: "100%",
      height: "100%",
      fill_color: bgColor.startsWith("#") ? bgColor : "#1a1a1a",
      animations: [{
        type: "fade",
        time: "start",
        duration: 0.3,
      }],
    });

    // Convert animation elements
    for (const element of specs.elements) {
      const creatomateElement = this.convertElement(element, specs, track++);
      if (creatomateElement) {
        elements.push(creatomateElement);
      }
    }

    return {
      format: "mp4",
      width: specs.format.dimensions.width,
      height: specs.format.dimensions.height,
      frame_rate: 30,
      elements,
    };
  }

  private convertElement(
    element: AnimationElement,
    specs: AnimationSpecs,
    track: number
  ): CreatomateElement | null {
    const baseElement: CreatomateElement = {
      type: "shape", // Default type, will be overwritten based on element type
      id: element.id,
      track,
      time: element.animation.entryDelay,
      duration: this.calculateElementDuration(element, specs),
      x: `${element.bounds.x}%`,
      y: `${element.bounds.y}%`,
      width: `${element.bounds.width}%`,
      height: `${element.bounds.height}%`,
      x_anchor: "0%",
      y_anchor: "0%",
    };

    // Add type-specific properties
    switch (element.type) {
      case "text":
      case "cta":
        baseElement.type = "text";
        baseElement.text = element.content || "";
        if (element.style) {
          baseElement.font_family = element.style.fontFamily || "Inter";
          baseElement.font_size = element.style.fontSize ? `${element.style.fontSize}px` : "24px";
          baseElement.font_weight = element.style.fontWeight || "600";
          baseElement.fill_color = element.style.color || "#ffffff";
          if (element.style.backgroundColor) {
            baseElement.background_color = element.style.backgroundColor;
          }
        }
        break;

      case "image":
      case "logo":
        // Skip image/logo elements if source is base64 (Creatomate needs URLs)
        // We'll handle images differently - using solid backgrounds with text overlays
        if (element.content?.startsWith("data:") || specs.sourceImage?.startsWith("data:")) {
          // Convert to a placeholder shape instead
          baseElement.type = "shape";
          baseElement.fill_color = element.style?.backgroundColor || "#cccccc";
        } else if (element.content && !element.content.startsWith("data:")) {
          baseElement.type = "image";
          baseElement.source = element.content;
          baseElement.fit = "contain";
        } else {
          // Skip this element - can't use base64 images
          return null;
        }
        break;

      case "shape":
        baseElement.type = "shape";
        if (element.style) {
          baseElement.fill_color = element.style.backgroundColor || "#000000";
          if (element.style.borderRadius) {
            baseElement.border_radius = `${element.style.borderRadius}px`;
          }
        }
        break;

      case "background":
        baseElement.type = "shape";
        baseElement.x = "50%";
        baseElement.y = "50%";
        baseElement.width = "100%";
        baseElement.height = "100%";
        baseElement.x_anchor = "50%";
        baseElement.y_anchor = "50%";
        if (element.style?.backgroundColor) {
          baseElement.fill_color = element.style.backgroundColor;
        }
        break;

      default:
        return null;
    }

    // Add animations
    baseElement.animations = this.convertAnimations(element, specs);

    return baseElement;
  }

  private calculateElementDuration(element: AnimationElement, specs: AnimationSpecs): number {
    const entryDelay = element.animation.entryDelay || 0;
    const holdTime = element.animation.hold || 0;
    const exitDuration = element.animation.exitDuration || 0;

    // If hold time is specified, use that plus durations
    if (holdTime > 0) {
      return element.animation.entryDuration + holdTime + exitDuration;
    }

    // Otherwise, element lasts until end of video
    return specs.duration - entryDelay;
  }

  private convertAnimations(element: AnimationElement, specs: AnimationSpecs): CreatomateAnimation[] {
    const animations: CreatomateAnimation[] = [];
    const anim = element.animation;

    // Entry animation
    if (anim.entry && anim.entry !== "none") {
      const entryAnim = this.convertAnimationType(
        anim.entry,
        "in",
        anim.entryDuration || 0.5,
        anim.easing
      );
      if (entryAnim && entryAnim.type) {
        animations.push(entryAnim);
      }
    }

    // Exit animation
    if (anim.exit && anim.exit !== "none" && anim.exitDuration) {
      const exitAnim = this.convertAnimationType(
        anim.exit,
        "out",
        anim.exitDuration,
        anim.easing
      );
      if (exitAnim && exitAnim.type) {
        // Calculate exit time
        const elementDuration = this.calculateElementDuration(element, specs);
        exitAnim.time = `${Math.max(0, (elementDuration - anim.exitDuration) / elementDuration * 100)}%`;
        animations.push(exitAnim);
      }
    }

    // If no animations, add a default fade-in
    if (animations.length === 0) {
      animations.push({
        type: "fade",
        time: "start",
        duration: 0.5,
        easing: "ease-out-quad",
      });
    }

    return animations;
  }

  private convertAnimationType(
    type: string,
    direction: "in" | "out",
    duration: number,
    easing?: string
  ): CreatomateAnimation | null {
    const baseAnim: CreatomateAnimation = {
      type: "fade", // Default type - Creatomate requires this
      duration,
      easing: this.convertEasing(easing),
    };

    if (direction === "in") {
      baseAnim.time = "start";
    }

    switch (type) {
      case "fade":
        return { ...baseAnim, type: "fade" };

      case "slide-up":
        return {
          ...baseAnim,
          type: "slide",
          y_anchor: direction === "in" ? "100%" : "-100%",
          fade: true,
        };

      case "slide-down":
        return {
          ...baseAnim,
          type: "slide",
          y_anchor: direction === "in" ? "-100%" : "100%",
          fade: true,
        };

      case "slide-left":
        return {
          ...baseAnim,
          type: "slide",
          x_anchor: direction === "in" ? "100%" : "-100%",
          fade: true,
        };

      case "slide-right":
        return {
          ...baseAnim,
          type: "slide",
          x_anchor: direction === "in" ? "-100%" : "100%",
          fade: true,
        };

      case "zoom-in":
        return {
          ...baseAnim,
          type: "scale",
          start_scale: direction === "in" ? "0%" : "100%",
          end_scale: direction === "in" ? "100%" : "150%",
          fade: true,
        };

      case "zoom-out":
        return {
          ...baseAnim,
          type: "scale",
          start_scale: direction === "in" ? "150%" : "100%",
          end_scale: direction === "in" ? "100%" : "0%",
          fade: true,
        };

      case "bounce":
        return {
          ...baseAnim,
          type: "bounce",
          scope: direction === "in" ? "element" : "exit",
        };

      case "pulse":
        return {
          ...baseAnim,
          type: "pulse",
        };

      default:
        // Return a fade animation as fallback instead of null
        return { ...baseAnim, type: "fade" };
    }
  }

  private convertEasing(easing?: string): string {
    switch (easing) {
      case "linear":
        return "linear";
      case "ease-in":
        return "ease-in-quad";
      case "ease-out":
        return "ease-out-quad";
      case "ease-in-out":
        return "ease-in-out-quad";
      default:
        return "ease-out-quad";
    }
  }
}
