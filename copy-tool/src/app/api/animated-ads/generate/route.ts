import { NextRequest, NextResponse } from "next/server";
import { AnimationSpecs, VideoBackend } from "@/types/animated-ads";
import { generateAnimatedVideo, getAvailableBackends } from "@/lib/video-backends";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specs, backend } = body as { specs: AnimationSpecs; backend: VideoBackend };

    if (!specs) {
      return NextResponse.json({ error: "No animation specs provided" }, { status: 400 });
    }

    if (!backend) {
      return NextResponse.json({ error: "No video backend specified" }, { status: 400 });
    }

    // Validate backend
    if (backend !== "creatomate" && backend !== "veo") {
      return NextResponse.json(
        { error: "Invalid backend. Must be 'creatomate' or 'veo'" },
        { status: 400 }
      );
    }

    // Check backend availability
    const availableBackends = getAvailableBackends();
    const selectedBackend = availableBackends.find((b) => b.type === backend);

    if (!selectedBackend?.available) {
      return NextResponse.json(
        {
          error: `${backend} backend is not available. ${selectedBackend?.reason || "Please configure the API key."}`,
          availableBackends,
        },
        { status: 400 }
      );
    }

    // Generate the video
    const result = await generateAnimatedVideo(specs, backend);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Video generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.url,
      downloadUrl: result.downloadUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      format: result.format,
    });
  } catch (error) {
    console.error("Error generating video:", error);
    return NextResponse.json(
      { error: "Failed to generate video. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint to check backend availability
export async function GET() {
  const backends = getAvailableBackends();

  return NextResponse.json({
    backends,
    recommended: backends.find((b) => b.available)?.type || null,
  });
}
