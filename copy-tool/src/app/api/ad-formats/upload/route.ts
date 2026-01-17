import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const { image, formatId, filename } = await request.json();

    if (!image || !formatId) {
      return NextResponse.json(
        { error: "Image and formatId are required" },
        { status: 400 }
      );
    }

    // Extract base64 data and determine extension
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imageData = matches[2];
    const contentType = `image/${matches[1]}`;

    // Generate filename
    const finalFilename = filename || `sample-${Date.now()}.${extension}`;
    const blobPath = `ad-formats/${formatId}/${finalFilename}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, "base64");

    // Upload to Vercel Blob
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType,
    });

    return NextResponse.json({
      success: true,
      path: blob.url,
      filename: finalFilename,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to upload image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
